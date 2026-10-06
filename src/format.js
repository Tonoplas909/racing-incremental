export function formatMoney(n) {
  if (n < 1000) {
    return String(Math.floor(n));
  }

  if (n >= 1e18) {
    return n.toExponential(2);
  }

  const suffixes = [
    { suffix: 'K', divisor: 1e3 },
    { suffix: 'M', divisor: 1e6 },
    { suffix: 'B', divisor: 1e9 },
    { suffix: 'T', divisor: 1e12 },
    { suffix: 'Qa', divisor: 1e15 },
  ];

  for (const { suffix, divisor } of suffixes) {
    const value = n / divisor;
    const formatted = value.toFixed(2);
    if (parseFloat(formatted) < 1000) {
      return formatted + suffix;
    }
  }

  return String(Math.floor(n));
}
