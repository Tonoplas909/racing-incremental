export function createRateMeter(windowMs) {
  const entries = [];

  return {
    push(timeMs, total) {
      entries.push([timeMs, total]);

      const windowStart = timeMs - windowMs;

      // Find the newest entry that is outside the window (before windowStart)
      let lastDropped = null;
      for (let i = 0; i < entries.length - 1; i++) {
        if (entries[i][0] < windowStart) {
          lastDropped = entries[i];
        }
      }

      // Filter to keep only entries within the window
      const filtered = entries.filter(e => e[0] >= windowStart);

      // Restore the last dropped entry if it exists
      if (lastDropped) {
        filtered.unshift(lastDropped);
      }

      // Replace entries array with filtered result
      entries.length = 0;
      entries.push(...filtered);
    },

    rate() {
      if (entries.length < 2) {
        return 0;
      }

      const first = entries[0];
      const last = entries[entries.length - 1];
      const timeDiffSeconds = (last[0] - first[0]) / 1000;

      if (timeDiffSeconds === 0) {
        return 0;
      }

      return (last[1] - first[1]) / timeDiffSeconds;
    },
  };
}
