import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';

const PRODUCT_FAMILIES = {
  gasoline: ['RON 100', 'RON 97', 'RON 95', 'RON 91'],
  diesel: ['DIESEL'],
  kerosene: ['KEROSENE'],
};

const CURRENT_REGION_SOURCES = [
  {
    region: 'NCR',
    history: false,
    buildUrlCandidates(date) {
      const compactDate = formatCompactDate(date);

      return [
        `https://prod-cms.doe.gov.ph/documents/d/guest/ncr-price-monitoring-${compactDate}n-pdf`,
        `https://prod-cms.doe.gov.ph/documents/d/guest/ncr-price-monitoring-${compactDate}-pdf`,
      ];
    },
  },
  {
    region: 'Mindanao',
    history: true,
    buildUrlCandidates(date) {
      const sequence = getTuesdaySequenceInYear(date);
      const monthName = date.toLocaleString('en-US', {
        month: 'long',
        timeZone: 'Asia/Manila',
      });
      const day = date.getUTCDate();
      const paddedDay = String(day).padStart(2, '0');
      const year = date.getUTCFullYear();

      return [
        `https://prod-cms.doe.gov.ph/documents/d/guest/${String(sequence).padStart(2, '0')}-lfro-price-monitoring-${monthName.toLowerCase()}-${day}-${year}-pdf`,
        `https://prod-cms.doe.gov.ph/documents/d/guest/${String(sequence).padStart(2, '0')}-lfro-price-monitoring-${monthName.toLowerCase()}-${paddedDay}-${year}-pdf`,
      ];
    },
  },
];

const HISTORY_LIMIT = 6;

function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatCompactDate(date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${month}${day}${date.getUTCFullYear()}`;
}

function toIsoDate(date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${date.getUTCFullYear()}-${month}-${day}`;
}

function formatPeriodLabel(startDate) {
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 6);

  const startMonth = startDate.toLocaleString('en-US', {
    month: 'long',
    timeZone: 'Asia/Manila',
  });
  const endMonth = endDate.toLocaleString('en-US', {
    month: 'long',
    timeZone: 'Asia/Manila',
  });

  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getUTCDate()}-${endDate.getUTCDate()}, ${startDate.getUTCFullYear()}`;
  }

  return `${startMonth} ${startDate.getUTCDate()}-${endMonth} ${endDate.getUTCDate()}, ${startDate.getUTCFullYear()}`;
}

function getTuesdaySequenceInYear(date) {
  const year = date.getUTCFullYear();
  const firstDay = new Date(Date.UTC(year, 0, 1));
  const offset = (2 - firstDay.getUTCDay() + 7) % 7;
  const firstTuesday = new Date(Date.UTC(year, 0, 1 + offset));
  const diffDays = Math.round((date - firstTuesday) / (24 * 60 * 60 * 1000));

  return Math.floor(diffDays / 7) + 1;
}

function getRecentTuesdays(limit) {
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayOfWeek = base.getUTCDay();
  const daysSinceTuesday = (dayOfWeek - 2 + 7) % 7;
  const latestTuesday = new Date(base);
  latestTuesday.setUTCDate(base.getUTCDate() - daysSinceTuesday);

  const dates = [];

  for (let index = 0; index < limit; index += 1) {
    const candidate = new Date(latestTuesday);
    candidate.setUTCDate(latestTuesday.getUTCDate() - index * 7);
    dates.push(candidate);
  }

  return dates;
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

      const rangeMatch = line.match(/(\d+\.\d+)\s*-\s*(\d+\.\d+)\s+(\d+\.\d+|NONE|#N\/A)$/i);

      if (!rangeMatch) {
        return null;
      }

      const [, min, max, common] = rangeMatch;

      return {
        product,
        min: Number(min),
        max: Number(max),
        common: /^\d+\.\d+$/.test(common) ? Number(common) : null,
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
    average: roundToTwo(average(commons.length ? commons : maxes)),
  };
}

async function fetchPdfText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0',
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = new Uint8Array(await response.arrayBuffer());
  const parser = new PDFParse({ data });
  const result = await parser.getText();
  await parser.destroy();

  return result.text;
}

async function resolveCurrentSource(source, recentTuesdays) {
  for (const date of recentTuesdays) {
    for (const candidateUrl of source.buildUrlCandidates(date)) {
      const pdfText = await fetchPdfText(candidateUrl);

      if (!pdfText) {
        continue;
      }

      const rows = extractRows(pdfText);

      if (rows.length === 0) {
        continue;
      }

      return {
        region: source.region,
        effectiveDate: toIsoDate(date),
        periodLabel: formatPeriodLabel(date),
        sourceUrl: candidateUrl,
        rows,
      };
    }
  }

  return null;
}

function buildRegionSummary(regionData) {
  return {
    region: regionData.region,
    effectiveDate: regionData.effectiveDate,
    periodLabel: regionData.periodLabel,
    sourceUrl: regionData.sourceUrl,
    products: {
      gasoline: summarizeProduct(regionData.rows, PRODUCT_FAMILIES.gasoline),
      diesel: summarizeProduct(regionData.rows, PRODUCT_FAMILIES.diesel),
      kerosene: summarizeProduct(regionData.rows, PRODUCT_FAMILIES.kerosene),
    },
  };
}

async function buildMindanaoHistory(recentTuesdays) {
  const historyEntries = [];
  const mindanaoSource = CURRENT_REGION_SOURCES.find((source) => source.region === 'Mindanao');

  for (const date of recentTuesdays) {
    let resolvedEntry = null;

    for (const candidateUrl of mindanaoSource.buildUrlCandidates(date)) {
      const pdfText = await fetchPdfText(candidateUrl);

      if (!pdfText) {
        continue;
      }

      const rows = extractRows(pdfText);

      if (rows.length === 0) {
        continue;
      }

      resolvedEntry = {
        effectiveDate: toIsoDate(date),
        periodLabel: formatPeriodLabel(date),
        sourceUrl: candidateUrl,
        products: {
          gasoline: summarizeProduct(rows, PRODUCT_FAMILIES.gasoline),
          diesel: summarizeProduct(rows, PRODUCT_FAMILIES.diesel),
          kerosene: summarizeProduct(rows, PRODUCT_FAMILIES.kerosene),
        },
      };
      break;
    }

    if (resolvedEntry) {
      historyEntries.push(resolvedEntry);
    }
  }

  const limitedHistory = historyEntries.slice(0, HISTORY_LIMIT);

  return limitedHistory.map((entry, index) => {
    const previous = limitedHistory[index + 1];

    if (!previous) {
      return {
        effectiveDate: entry.effectiveDate,
        periodLabel: entry.periodLabel,
        sourceUrl: entry.sourceUrl,
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
      sourceUrl: entry.sourceUrl,
      weeklyAdjustment: {
        gasoline: roundToTwo(entry.products.gasoline.average - previous.products.gasoline.average),
        diesel: roundToTwo(entry.products.diesel.average - previous.products.diesel.average),
        kerosene: roundToTwo(entry.products.kerosene.average - previous.products.kerosene.average),
      },
    };
  });
}

async function main() {
  const recentTuesdays = getRecentTuesdays(12);
  const resolvedRegions = [];

  for (const source of CURRENT_REGION_SOURCES) {
    const regionData = await resolveCurrentSource(source, recentTuesdays);

    if (regionData) {
      resolvedRegions.push(buildRegionSummary(regionData));
    }
  }

  if (resolvedRegions.length === 0) {
    throw new Error('Unable to resolve any current DOE 2026 sources.');
  }

  const history = await buildMindanaoHistory(recentTuesdays);
  const focusRegionName = resolvedRegions.some((region) => region.region === 'Mindanao')
    ? 'Mindanao'
    : resolvedRegions[0].region;
  const focusRegion = resolvedRegions.find((region) => region.region === focusRegionName);
  const latestHistory = history[0] ?? {
    weeklyAdjustment: {
      gasoline: 0,
      diesel: 0,
      kerosene: 0,
    },
  };

  const latestPayload = {
    lastUpdated: new Date().toISOString(),
    source: 'Department of Energy Philippines current prod-cms retail pump price PDFs',
    effectiveDate: focusRegion.effectiveDate,
    focusRegionName,
    coverageNote:
      'This dataset uses current official 2026 DOE prod-cms PDFs that could be resolved automatically at sync time. Region coverage is limited to sources with stable fetchable URL patterns.',
    weeklyAdjustment: latestHistory.weeklyAdjustment,
    regions: resolvedRegions,
  };

  const rootDir = path.dirname(fileURLToPath(import.meta.url));
  const dataDir = path.resolve(rootDir, '..', 'public', 'data');

  await writeFile(
    path.join(dataDir, 'latest.json'),
    `${JSON.stringify(latestPayload, null, 2)}\n`,
    'utf8',
  );

  await writeFile(
    path.join(dataDir, 'history.json'),
    `${JSON.stringify({ history }, null, 2)}\n`,
    'utf8',
  );

  console.log(
    `DOE current data sync complete. Focus region ${focusRegionName} at ${focusRegion.periodLabel}. Regions: ${resolvedRegions
      .map((region) => `${region.region}=${region.periodLabel}`)
      .join(', ')}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
