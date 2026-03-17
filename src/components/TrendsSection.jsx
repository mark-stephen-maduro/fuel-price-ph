import { productLabels, productOrder } from '../constants/fuel';
import { formatChange, formatDate, formatShortDate } from '../utils/formatters';
import { SectionHeading } from './SectionHeading';

function TrendBar({ effectiveDate, productKey, value, maxMagnitude }) {
  const directionClass = value >= 0 ? 'up' : 'down';
  const height = `${(Math.abs(value) / maxMagnitude) * 100}%`;

  return (
    <div className="sparkline-column">
      <div
        className={`sparkline-bar ${directionClass}`}
        style={{ height }}
        title={`${formatDate(effectiveDate)}: ${formatChange(value)} PHP/L`}
      />
      <span>{formatShortDate(effectiveDate)}</span>
      <span className="sr-only">{`${productLabels[productKey]} on ${formatDate(effectiveDate)}`}</span>
    </div>
  );
}

function TrendCard({ productKey, history, maxMagnitude }) {
  return (
    <article className="trend-card">
      <div className="section-kicker">{productLabels[productKey]}</div>
      <div className="sparkline" aria-label={`${productLabels[productKey]} weekly trend`}>
        {history.map((entry) => (
          <TrendBar
            key={`${productKey}-${entry.effectiveDate}`}
            effectiveDate={entry.effectiveDate}
            maxMagnitude={maxMagnitude}
            productKey={productKey}
            value={entry.weeklyAdjustment[productKey]}
          />
        ))}
      </div>
    </article>
  );
}

export function TrendsSection({ history }) {
  const maxMagnitude = Math.max(
    ...productOrder.flatMap((product) =>
      history.map((entry) => Math.abs(entry.weeklyAdjustment[product])),
    ),
    1,
  );

  return (
    <section className="section" id="trends">
      <SectionHeading
        kicker="Trends"
        title="Recent weekly adjustment pattern"
        description="A compact view of the last several DOE-based weekly movements, centered on the MVP use case of tracking trends rather than predicting real-time prices."
      />

      <div className="trend-grid">
        {productOrder.map((product) => (
          <TrendCard
            key={product}
            history={history}
            maxMagnitude={maxMagnitude}
            productKey={product}
          />
        ))}
      </div>
    </section>
  );
}
