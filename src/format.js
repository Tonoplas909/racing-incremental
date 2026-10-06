export function formatMoney(n) {
  if (n < 1000) {
    return Math.floor(n).toString();
  }

  const suffixes = [
    { value: 1e15, suffix: 'Qa' },
    { value: 1e12, suffix: 'T' },
    { value: 1e9, suffix: 'B' },
    { value: 1e6, suffix: 'M' },
    { value: 1e3, suffix: 'K' },
  ];

  if (n >= 1e18) {
    return n.toExponential(2);
  }

  for (const { value, suffix } of suffixes) {
    if (n >= value) {
      const formatted = (n / value).toFixed(2);
      return formatted + suffix;
    }
  }

  return Math.floor(n).toString();
}
