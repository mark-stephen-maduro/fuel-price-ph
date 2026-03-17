import { navItems } from '../constants/site';

export function SiteHeader() {
  return (
    <nav className="top-nav" aria-label="Primary">
      <a className="brand" href="#home">
        Fuel Price PH
      </a>
      <div className="nav-links">
        {navItems.map((item) => (
          <a href={`#${item.id}`} key={item.id}>
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
