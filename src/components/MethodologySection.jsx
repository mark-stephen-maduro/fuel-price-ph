import { methodologyCards } from '../constants/site';

function MethodologyCard({ title, body, items, emphasized = false }) {
  const className = emphasized ? 'method-card emphasis' : 'method-card';

  return (
    <article className={className}>
      {title ? <h3>{title}</h3> : null}
      {body ? <p>{body}</p> : null}
      {items ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function MethodologySection() {
  return (
    <section className="section methodology-grid" id="methodology">
      <article className="method-card emphasis">
        <p className="section-kicker">Methodology</p>
        <h2>Built for official updates, not live market claims.</h2>
        <p>
          Fuel Price Monitoring PH is structured around DOE publications. The current live data
          source is the DOE current PDF archive, which publishes official regional files that this
          app normalizes into JSON. The dataset is scheduled to sync every midnight Philippine
          time.
        </p>
      </article>

      {methodologyCards.map((card) => (
        <MethodologyCard
          key={card.title}
          title={card.title}
          body={card.body}
          items={card.items}
        />
      ))}
    </section>
  );
}
