/**
 * Centralized Indian Date Formatting Utility for Faculty Flow
 *
 * Requirements:
 * 1. Indian date format: DD Month YYYY (e.g., 20 October 2026, 05 November 2026) using en-IN locale.
 * 2. IST timezone: Asia/Kolkata for actual timestamps. Never displays UTC or timezone offsets.
 * 3. Date only: No hours, minutes, seconds, or time information.
 * 4. Prevent date shifting: Preserves exact calendar date for date-only strings (YYYY-MM-DD).
 * 5. Robust compatibility: Safely handles null, undefined, invalid, date-only, and timestamp values.
 */

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

const IST_DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'long',
  year: 'numeric'
});

/**
 * Formats a date-only string (YYYY-MM-DD), ISO timestamp, Date object, or epoch number
 * into the standard Indian format: "DD Month YYYY" (e.g., "20 October 2026", "05 November 2026").
 *
 * @param dateInput - The date to format (string, Date, number, null, or undefined)
 * @param fallback - String returned if dateInput is missing, empty, or invalid (defaults to 'No Date')
 */
export function formatIndianDate(
  dateInput?: string | Date | number | null,
  fallback: string = 'No Date'
): string {
  if (dateInput === null || dateInput === undefined) {
    return fallback;
  }

  // 1. Handle string inputs
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return fallback;

    // Fast-path: Check for date-only formats (YYYY-MM-DD) to prevent timezone-related date shifting
    const dateOnlyMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
    if (dateOnlyMatch) {
      const year = parseInt(dateOnlyMatch[1], 10);
      const month = parseInt(dateOnlyMatch[2], 10);
      const day = parseInt(dateOnlyMatch[3], 10);

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const dayStr = String(day).padStart(2, '0');
        const monthStr = MONTH_NAMES[month - 1];
        return `${dayStr} ${monthStr} ${year}`;
      }
    }

    // Try parsing as Date for ISO timestamps or other formats
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      return fallback;
    }
    try {
      return IST_DATE_FORMATTER.format(parsed);
    } catch {
      return fallback;
    }
  }

  // 2. Handle Date instances or numeric epoch timestamps
  const dateObj = typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return fallback;
  }

  try {
    return IST_DATE_FORMATTER.format(dateObj);
  } catch {
    return fallback;
  }
}

// Canonical alias for convenience across components
export const formatDate = formatIndianDate;

/**
 * Formats a date range into standard Indian date notation:
 * - If only start date is provided or start equals end: "DD Month YYYY"
 * - If start and end dates are distinct: "DD Month YYYY to DD Month YYYY"
 *
 * @param startDate - Range start date
 * @param endDate - Range end date
 * @param fallback - Value if both are missing
 */
export function formatDateRange(
  startDate?: string | Date | null,
  endDate?: string | Date | null,
  fallback: string = 'Single Day'
): string {
  const start = formatIndianDate(startDate, '');
  const end = formatIndianDate(endDate, '');

  if (start && end && start !== end) {
    return `${start} to ${end}`;
  }
  if (start) {
    return start;
  }
  if (end) {
    return end;
  }
  return fallback;
}
