export function SectionHeading({ kicker, title, description }) {
  return (
    <div className="section-heading">
      <div>
        <p className="section-kicker">{kicker}</p>
        <h2>{title}</h2>
      </div>
      <p>{description}</p>
    </div>
  );
}
