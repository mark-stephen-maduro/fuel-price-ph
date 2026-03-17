export const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'latest', label: 'Latest Prices' },
  { id: 'compare', label: 'Compare' },
  { id: 'trends', label: 'Trends' },
  { id: 'methodology', label: 'Methodology' },
];

export const heroActions = [
  { href: '#latest', label: 'View latest prices', variant: 'primary' },
  { href: '#methodology', label: 'See methodology', variant: 'secondary' },
];

export const methodologyCards = [
  {
    title: 'What the app does',
    items: [
      'Shows latest DOE-monitored fuel prices',
      'Highlights weekly fuel price adjustments',
      'Compares regional averages',
      'Surfaces simple historical trends',
    ],
  },
  {
    title: 'What the app does not do',
    items: [
      'Provide live station prices',
      'Guarantee exact pump pricing at a specific location',
      'Replace official DOE publications',
      'Infer data that was not published',
    ],
  },
  {
    title: 'Planned automation',
    items: [
      'Scheduled GitHub Actions updates',
      'HTML and PDF parsing support',
      'Normalized JSON outputs for the frontend',
      'Static deployment through GitHub Pages',
    ],
  },
];
