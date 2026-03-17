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

export function LatestPricesSection({ focusRegion, weeklyAdjustment }) {
  return (
    <section className="section section-highlight" id="latest">
      <SectionHeading
        kicker="Latest Prices"
        title="Current DOE-monitored snapshot"
        description="These figures reflect the latest available DOE monitoring data for the focus region. Weekly movement here is derived from consecutive DOE monitored averages, not a live station feed."
      />

      <div className="cards-row">
        {productOrder.map((product) => (
          <PriceCard
            key={product}
            label={productLabels[product]}
            productStats={focusRegion.products[product]}
            weeklyChange={weeklyAdjustment[product]}
          />
        ))}
      </div>
    </section>
  );
}
