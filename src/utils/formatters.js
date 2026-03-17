const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const decimalFormatter = new Intl.NumberFormat('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'Asia/Manila',
});

const shortDateFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  timeZone: 'Asia/Manila',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Manila',
});

export function formatPeso(value) {
  return pesoFormatter.format(value);
}

export function formatChange(value) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${decimalFormatter.format(value)}`;
}

export function formatDate(value) {
  return dateFormatter.format(new Date(value));
}

export function formatShortDate(value) {
  return shortDateFormatter.format(new Date(value));
}

export function formatDateTime(value) {
  return `${dateTimeFormatter.format(new Date(value))} PHT`;
}
