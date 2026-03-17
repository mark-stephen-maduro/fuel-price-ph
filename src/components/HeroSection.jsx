import { heroActions } from '../constants/site';
import { formatDate, formatDateTime } from '../utils/formatters';

function HeroPanel({ latest, focusRegion, primaryRegions }) {
  const primaryRegionLabels = primaryRegions.map((region) => region.label).join(' and ');

  return (
    <aside className="hero-panel">
      <div className="panel-label">Latest publication</div>
      <div className="panel-date">{formatDate(latest.effectiveDate)}</div>
      <dl className="hero-stats">
        <div>
          <dt>Source</dt>
          <dd>{latest.source}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{formatDateTime(latest.lastUpdated)}</dd>
        </div>
        <div>
          <dt>Primary regions</dt>
          <dd>{primaryRegionLabels}</dd>
        </div>
        <div>
          <dt>Current DOE week</dt>
          <dd>{focusRegion.periodLabel}</dd>
        </div>
      </dl>
      <p className="panel-note">{latest.coverageNote}</p>
      <a className="source-link" href={focusRegion.sourceUrl} rel="noreferrer" target="_blank">
        Open official DOE file
      </a>
    </aside>
  );
}

export function HeroSection({ latest, focusRegion, primaryRegions }) {
  return (
    <header className="site-header" id="home">
      <div className="hero">
        <div className="hero-copy">
          <p className="eyebrow">DOE-based monitoring for the Philippines</p>
          <h1>Weekly fuel price updates</h1>
          <p className="hero-text">
            Track DOE-monitored fuel prices, compare regional averages, and read weekly
            adjustments in a format built for fast scanning on mobile and desktop.
          </p>
          <p className="hero-text hero-subtext">
            Data here is scheduled to refresh every midnight Philippine time.
          </p>
          <div className="hero-actions">
            {heroActions.map((action) => (
              <a className={`button ${action.variant}`} href={action.href} key={action.href}>
                {action.label}
              </a>
            ))}
          </div>
        </div>

        <HeroPanel latest={latest} focusRegion={focusRegion} primaryRegions={primaryRegions} />
      </div>
    </header>
  );
}
