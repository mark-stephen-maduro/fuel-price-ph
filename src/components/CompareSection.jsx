import { formatPeso } from '../utils/formatters';
import { productOrder, productLabels } from '../constants/fuel';
import { SectionHeading } from './SectionHeading';

function ComparisonTable({ regions }) {
  return (
    <div className="table-card">
      <table>
        <thead>
          <tr>
            <th>Region</th>
            <th>DOE week</th>
            {productOrder.map((product) => (
              <th key={product}>{productLabels[product]}</th>
            ))}
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {regions.map((region) => (
            <tr key={region.region}>
              <td>{region.region}</td>
              <td>{region.periodLabel}</td>
              {productOrder.map((product) => (
                <td key={product}>{formatPeso(region.products[product].average)}</td>
              ))}
              <td>
                <a className="table-link" href={region.sourceUrl} rel="noreferrer" target="_blank">
                  DOE PDF
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComparisonCallout({ highestGasolineRegion }) {
  return (
    <aside className="callout-card">
      <p className="section-kicker">Quick read</p>
      <h3>{highestGasolineRegion.region} currently posts the highest gasoline average.</h3>
      <p>
        The latest DOE-monitored average for gasoline in {highestGasolineRegion.region} is{' '}
        {formatPeso(highestGasolineRegion.products.gasoline.average)} per liter.
      </p>
      <p>
        That row comes from the official DOE file for {highestGasolineRegion.periodLabel}. Use this
        section as a reference snapshot, not a station-by-station live pricing tool.
      </p>
    </aside>
  );
}

export function CompareSection({ regions, highestGasolineRegion }) {
  return (
    <section className="section" id="compare">
      <SectionHeading
        kicker="Compare"
        title="Regional price averages"
        description="Compare the latest accessible DOE-monitored regional averages. Some regions may have different official publication weeks, so the source week is shown in the table."
      />

      <div className="comparison-layout">
        <ComparisonTable regions={regions} />
        <ComparisonCallout highestGasolineRegion={highestGasolineRegion} />
      </div>
    </section>
  );
}
