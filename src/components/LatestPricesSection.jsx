import { productLabels, productOrder } from '../constants/fuel';
import { formatChange, formatPeso } from '../utils/formatters';
import { SectionHeading } from './SectionHeading';

function PriceCard({ label, productStats, weeklyChange }) {
  const deltaClassName = weeklyChange >= 0 ? 'delta-up' : 'delta-down';

  return (
    <article className="price-card">
      <div className="price-card-top">
        <span>{label}</span>
        <strong>{formatPeso(productStats.average)}</strong>
      </div>
      <div className="price-meta">
        <span>Min {formatPeso(productStats.min)}</span>
        <span>Max {formatPeso(productStats.max)}</span>
      </div>
      <div className={`delta-chip ${deltaClassName}`}>
        Weekly adjustment {formatChange(weeklyChange)} PHP/L
      </div>
    </article>
  );
}

function RegionSnapshot({ primaryRegion, weeklyAdjustment }) {
  if (!primaryRegion.data) {
    return (
      <article className="region-block region-block-empty">
        <div className="region-block-header">
          <p className="section-kicker">{primaryRegion.label}</p>
          <h3>DOE data not currently available</h3>
        </div>
        <p className="region-block-note">
          This primary region is reserved in the UI, but the current automated DOE sync did not
          resolve a fresh source file for it yet.
        </p>
      </article>
    );
  }

  return (
    <article className="region-block">
      <div className="region-block-header">
        <p className="section-kicker">{primaryRegion.label}</p>
        <h3>{primaryRegion.data.periodLabel}</h3>
      </div>
      <div className="cards-row">
        {productOrder.map((product) => (
          <PriceCard
            key={`${primaryRegion.key}-${product}`}
            label={productLabels[product]}
            productStats={primaryRegion.data.products[product]}
            weeklyChange={weeklyAdjustment[product]}
          />
        ))}
      </div>
    </article>
  );
}

export function LatestPricesSection({ primaryRegions, weeklyAdjustment }) {
  return (
    <section className="section section-highlight" id="latest">
      <SectionHeading
        kicker="Latest Prices"
        title="Current DOE-monitored snapshot"
        description="These figures prioritize NCR. Weekly movement is derived from consecutive DOE monitored averages, not a live station feed."
      />

      <div className="region-blocks">
        {primaryRegions.map((primaryRegion) => (
          <RegionSnapshot
            key={primaryRegion.key}
            primaryRegion={primaryRegion}
            weeklyAdjustment={weeklyAdjustment}
          />
        ))}
      </div>
    </section>
  );
}
