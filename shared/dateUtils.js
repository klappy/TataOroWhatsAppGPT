// Utility functions for date handling in Booksy/WhatsApp bot

/**
 * Returns an array of the next N days (including today) in YYYY-MM-DD format.
 * @param {number} n - Number of days to return
 * @param {Date} [fromDate] - Optional start date (defaults to today)
 * @returns {string[]}
 */
export function getNextNDates(n, fromDate = new Date()) {
  const dates = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * Returns the next occurrence of a given weekday (0=Sunday, 1=Monday, ... 6=Saturday) from a start date (not including today if today is the day).
 * @param {number} weekday - 0 (Sun) to 6 (Sat)
 * @param {Date} [fromDate] - Optional start date (defaults to today)
 * @returns {string} - Date string in YYYY-MM-DD
 */
export function getNextWeekdayDate(weekday, fromDate = new Date()) {
  const d = new Date(fromDate);
  const day = d.getDay();
  let daysToAdd = (weekday - day + 7) % 7;
  if (daysToAdd === 0) daysToAdd = 7; // Always go forward
  d.setDate(d.getDate() + daysToAdd);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the weekday index (0=Sunday, 1=Monday, ... 6=Saturday) for a given name (case-insensitive, supports short names)
 * @param {string} name - e.g. 'Wednesday', 'wed'
 * @returns {number|null}
 */
export function parseWeekdayName(name) {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const idx = days.findIndex(
    (d) => d === name.toLowerCase() || d.slice(0, 3) === name.toLowerCase().slice(0, 3)
  );
  return idx >= 0 ? idx : null;
}
