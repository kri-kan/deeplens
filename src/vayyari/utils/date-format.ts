/**
 * Date formatting utilities for converting and displaying timestamps in IST (Asia/Kolkata).
 */

/**
 * Safely parses any date string, timestamp, or fallback sourceGroupId into a Date object.
 */
export function parseISTDate(
  rawDate?: string | number | Date | null,
  fallbackSource?: string | null
): Date | null {
  if (!rawDate && !fallbackSource) return null;

  if (rawDate instanceof Date) {
    return isNaN(rawDate.getTime()) ? null : rawDate;
  }

  if (typeof rawDate === 'number') {
    const ts = rawDate < 1e11 ? rawDate * 1000 : rawDate;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof rawDate === 'string' && rawDate.trim().length > 0) {
    const trimmed = rawDate.trim();
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      const ts = num < 1e11 ? num * 1000 : num;
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  // Check fallback source (e.g. sourceGroupId ending with _<timestamp>)
  if (fallbackSource && typeof fallbackSource === 'string') {
    const parts = fallbackSource.split('_');
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      const ts = parseInt(lastPart, 10);
      if (!isNaN(ts) && ts > 1000000000) {
        const d = new Date(ts < 1e11 ? ts * 1000 : ts);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  return null;
}

/**
 * Formats a given date/timestamp into a clean IST relative/absolute string:
 * - Same day (in IST): "10:45 AM"
 * - Same year (in IST): "21 Aug, 10:45 AM"
 * - Different year (in IST): "21 Aug 2025, 10:45 AM"
 */
export function formatISTTimestamp(
  rawDate?: string | number | Date | null,
  fallbackSource?: string | null
): string {
  const d = parseISTDate(rawDate, fallbackSource);
  if (!d) return '';

  try {
    const timeStr = d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const now = new Date();
    const dateFmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const [tYear, tMonth, tDay] = dateFmt.format(d).split('-').map(Number);
    const [nYear, nMonth, nDay] = dateFmt.format(now).split('-').map(Number);

    if (tYear === nYear && tMonth === nMonth && tDay === nDay) {
      return timeStr;
    }

    const monthStr = d.toLocaleDateString('en-US', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
    });

    if (tYear === nYear) {
      return `${tDay} ${monthStr}, ${timeStr}`;
    }

    return `${tDay} ${monthStr} ${tYear}, ${timeStr}`;
  } catch (err) {
    // Fallback if Intl fails
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  }
}
