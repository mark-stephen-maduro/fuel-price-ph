import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { PDFParse } from 'pdf-parse';

const PRODUCT_FAMILIES = {
  gasoline: ['RON 100', 'RON 97', 'RON 95', 'RON 91'],
  diesel: ['DIESEL'],
  kerosene: ['KEROSENE'],
};

const REGION_SOURCES = [
  {
    region: 'NCR',
    slug: 'ncr',
    listingUrl: 'https://legacy.doe.gov.ph/retail-pump-prices-metro-manila?page=0',
    mode: 'single',
  },
  {
    region: 'Region IV-A',
    slug: 'region-iv-a',
    listingUrl: 'https://legacy.doe.gov.ph/retail-pump-prices-south-luzon?page=0',
    mode: 'group',
    fileLabelIncludes: 'Region IV - A',
  },
  {
    region: 'Region V',
    slug: 'region-v',
    listingUrl: 'https://legacy.doe.gov.ph/retail-pump-prices-south-luzon?page=0',
    mode: 'group',
    fileLabelIncludes: 'Region V',
  },
  {
    region: 'Region III',
    slug: 'region-iii',
    listingUrl: 'https://legacy.doe.gov.ph/retail-pump-prices-north-luzon?page=0',
    mode: 'group',
    fileLabelIncludes: 'Reg III',
  },
];

const NCR_HISTORY_LIMIT = 6;

function toAbsoluteUrl(url) {
  return url.startsWith('http') ? url : `https://legacy.doe.gov.ph${url}`;
}

function average(values) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundToTwo(value) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return Math.round(value * 100) / 100;
}

function slugifyPeriod(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function monthToNumber(monthName) {
  const months = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };

  return months[monthName.toLowerCase()];
}

function titleCaseMonth(monthName) {
  const lower = monthName.toLowerCase();
  return `${lower[0].toUpperCase()}${lower.slice(1)}`;
}

function toIsoDate(year, monthName, day) {
  const month = String(monthToNumber(monthName)).padStart(2, '0');
  const normalizedDay = String(day).padStart(2, '0');

  return `${year}-${month}-${normalizedDay}`;
}

function parsePeriodLabel(text) {
  const patterns = [
    /For the week of ([A-Za-z]+)\s+(\d{1,2})\s*-\s*(\d{1,2}),\s*(\d{4})/i,
    /For the period of ([A-Za-z]+)\s+(\d{1,2})\s*-\s*(\d{1,2}),\s*(\d{4})/i,
    /For the period of ([A-Za-z]+)\s+(\d{1,2})\s+to\s+([A-Za-z]+)?\s*(\d{1,2}),\s*(\d{4})/i,
    /For the week:\s*([A-Za-z]+)\s+(\d{1,2})\s+to\s+([A-Za-z]+)?\s*(\d{1,2}),\s*(\d{4})/i,
    /as of ([A-Za-z]+)\s+(\d{1,2})\s+to\s+([A-Za-z]+)?\s*(\d{1,2}),\s*(\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) {
      continue;
    }

    if (match.length === 5) {
      const [, monthName, startDay, endDay, year] = match;
      const normalizedMonth = titleCaseMonth(monthName);

      return {
        periodLabel: `${normalizedMonth} ${Number(startDay)}-${Number(endDay)}, ${year}`,
        effectiveDate: toIsoDate(year, normalizedMonth, startDay),
      };
    }

    if (match.length === 6) {
      const [, startMonthName, startDay, maybeEndMonthName, endDay, year] = match;
      const normalizedStartMonth = titleCaseMonth(startMonthName);
      const normalizedEndMonth = titleCaseMonth(maybeEndMonthName || startMonthName);

      return {
        periodLabel:
          normalizedEndMonth === normalizedStartMonth
            ? `${normalizedStartMonth} ${Number(startDay)}-${Number(endDay)}, ${year}`
            : `${normalizedStartMonth} ${Number(startDay)}-${normalizedEndMonth} ${Number(endDay)}, ${year}`,
        effectiveDate: toIsoDate(year, normalizedStartMonth, startDay),
      };
    }
  }

  return null;
}

function parseRangeAndCommon(line) {
  const match = line.match(/(\d+\.\d+)\s*-\s*(\d+\.\d+)\s+(\d+\.\d+|NONE|None|#N\/A)$/i);

  if (!match) {
    return null;
  }

  const [, min, max, common] = match;

  return {
    min: Number(min),
    max: Number(max),
    common: /^\d+\.\d+$/.test(common) ? Number(common) : null,
  };
}

function extractRows(pdfText) {
  return pdfText
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((line) => {
      const product = Object.values(PRODUCT_FAMILIES)
        .flat()
        .find((productName) => line.startsWith(productName));

      if (!product) {
        return null;
      }

      const metrics = parseRangeAndCommon(line);

      if (!metrics) {
        return null;
      }

      return {
        product,
        ...metrics,
      };
    })
    .filter(Boolean);
}

function summarizeProduct(rows, productNames) {
  const matchingRows = rows.filter((row) => productNames.includes(row.product));
  const mins = matchingRows.map((row) => row.min).filter((value) => value > 0);
  const maxes = matchingRows.map((row) => row.max).filter((value) => value > 0);
  const commons = matchingRows.map((row) => row.common).filter((value) => value !== null && value > 0);

  return {
    min: roundToTwo(mins.length ? Math.min(...mins) : 0),
    max: roundToTwo(maxes.length ? Math.max(...maxes) : 0),
    average: roundToTwo(average(commons) ?? average(maxes) ?? 0),
  };
}

async function getPdfText(pdfUrl) {
  const response = await fetch(pdfUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download DOE PDF: ${pdfUrl}`);
  }

  const pdfData = new Uint8Array(await response.arrayBuffer());
  const parser = new PDFParse({ data: pdfData });
  const result = await parser.getText();
  await parser.destroy();

  return result.text;
}

async function getListingHtml(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load DOE listing: ${url}`);
  }

  return response.text();
}

async function parseNcrListing(listingUrl) {
  const html = await getListingHtml(listingUrl);
  const $ = cheerio.load(html);

  return $('table.views-table tbody tr')
    .map((_, row) => {
      const title = $(row).find('.views-field-title').text().replace(/\s+/g, ' ').trim();
      const pdfUrl = $(row)
        .find('a')
        .toArray()
        .map((link) => $(link).attr('href'))
        .find((href) => href?.toLowerCase().endsWith('.pdf'));

      if (!pdfUrl) {
        return null;
      }

      return {
        title,
        pdfUrl: toAbsoluteUrl(pdfUrl),
      };
    })
    .get()
    .filter(Boolean);
}

async function parseGroupedListing(listingUrl, labelMatcher) {
  const html = await getListingHtml(listingUrl);
  const $ = cheerio.load(html);
  const rows = $('table.views-table tbody tr').toArray();

  for (const row of rows) {
    const title = $(row).find('.views-field-title').text().replace(/\s+/g, ' ').trim();
    const links = $(row)
      .find('a')
      .toArray()
      .filter((link) => $(link).attr('href')?.toLowerCase().endsWith('.pdf'));
    const matchingLink = links.find((link) =>
      $(link).text().replace(/\s+/g, ' ').trim().includes(labelMatcher),
    );

    if (!matchingLink) {
      continue;
    }

    return {
      title,
      pdfUrl: toAbsoluteUrl($(matchingLink).attr('href')),
    };
  }

  throw new Error(`Unable to find grouped DOE file containing "${labelMatcher}" on ${listingUrl}`);
}

async function buildRegionDataset(source) {
  const listingEntry =
    source.mode === 'group'
      ? await parseGroupedListing(source.listingUrl, source.fileLabelIncludes)
      : (await parseNcrListing(source.listingUrl)).find((entry) =>
          source.fileLabelIncludes
            ? entry.pdfUrl.includes(source.fileLabelIncludes.replace(/\s+/g, '%20')) ||
              entry.title.includes(source.fileLabelIncludes)
            : true,
        );

  if (!listingEntry) {
    throw new Error(`Unable to find DOE listing entry for ${source.region}`);
  }

  const pdfText = await getPdfText(listingEntry.pdfUrl);
  const rows = extractRows(pdfText);
  const period = parsePeriodLabel(`${listingEntry.title}\n${pdfText}`);

  if (!period) {
    throw new Error(`Unable to parse publication period for ${source.region}`);
  }

  return {
    region: source.region,
    listingUrl: source.listingUrl,
    pdfUrl: listingEntry.pdfUrl,
    ...period,
    products: {
      gasoline: summarizeProduct(rows, PRODUCT_FAMILIES.gasoline),
      diesel: summarizeProduct(rows, PRODUCT_FAMILIES.diesel),
      kerosene: summarizeProduct(rows, PRODUCT_FAMILIES.kerosene),
    },
  };
}

function deriveWeeklyAdjustments(history) {
  return history.map((entry, index) => {
    const previous = history[index + 1];

    if (!previous) {
      return {
        effectiveDate: entry.effectiveDate,
        periodLabel: entry.periodLabel,
        weeklyAdjustment: {
          gasoline: 0,
          diesel: 0,
          kerosene: 0,
        },
      };
    }

    return {
      effectiveDate: entry.effectiveDate,
      periodLabel: entry.periodLabel,
      weeklyAdjustment: {
        gasoline: roundToTwo(entry.products.gasoline.average - previous.products.gasoline.average),
        diesel: roundToTwo(entry.products.diesel.average - previous.products.diesel.average),
        kerosene: roundToTwo(entry.products.kerosene.average - previous.products.kerosene.average),
      },
    };
  });
}

async function buildNcrHistory() {
  const entries = await parseNcrListing('https://legacy.doe.gov.ph/retail-pump-prices-metro-manila?page=0');
  const selectedEntries = entries.slice(0, NCR_HISTORY_LIMIT);

  const historyWithProducts = [];

  for (const entry of selectedEntries) {
    const pdfText = await getPdfText(entry.pdfUrl);
    const rows = extractRows(pdfText);
    const period = parsePeriodLabel(`${entry.title}\n${pdfText}`);

    if (!period) {
      throw new Error(`Unable to parse publication period for NCR history entry: ${entry.title}`);
    }

    historyWithProducts.push({
      ...period,
      pdfUrl: entry.pdfUrl,
      products: {
        gasoline: summarizeProduct(rows, PRODUCT_FAMILIES.gasoline),
        diesel: summarizeProduct(rows, PRODUCT_FAMILIES.diesel),
        kerosene: summarizeProduct(rows, PRODUCT_FAMILIES.kerosene),
      },
    });
  }

  return deriveWeeklyAdjustments(historyWithProducts);
}

function buildLatestPayload(regions, history) {
  const focusRegion = regions.find((region) => region.region === 'NCR') ?? regions[0];
  const latestHistory = history[0];
  const maxEffectiveDate = [...regions]
    .map((region) => region.effectiveDate)
    .sort((left, right) => right.localeCompare(left))[0];

  return {
    lastUpdated: new Date().toISOString(),
    source: 'Department of Energy Philippines legacy retail pump price archive',
    effectiveDate: maxEffectiveDate,
    coverageNote:
      'The latest accessible official DOE archive used by this app currently contains regional files up to June 24-30, 2025.',
    weeklyAdjustment: latestHistory.weeklyAdjustment,
    regions: regions.map((region) => ({
      region: region.region,
      effectiveDate: region.effectiveDate,
      periodLabel: region.periodLabel,
      sourceUrl: region.pdfUrl,
      products: region.products,
    })),
    focusRegionSourceUrl: focusRegion.pdfUrl,
  };
}

async function main() {
  const regions = [];

  for (const source of REGION_SOURCES) {
    regions.push(await buildRegionDataset(source));
  }

  const history = await buildNcrHistory();
  const latest = buildLatestPayload(regions, history);

  const rootDir = path.dirname(fileURLToPath(import.meta.url));
  const dataDir = path.resolve(rootDir, '..', 'public', 'data');

  await writeFile(
    path.join(dataDir, 'latest.json'),
    `${JSON.stringify(latest, null, 2)}\n`,
    'utf8',
  );

  await writeFile(
    path.join(dataDir, 'history.json'),
    `${JSON.stringify({ history }, null, 2)}\n`,
    'utf8',
  );

  console.log(
    `DOE data sync complete. Latest accessible publication date: ${latest.effectiveDate}. Source dates by region: ${regions
      .map((region) => `${region.region}=${region.periodLabel}`)
      .join(', ')}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
