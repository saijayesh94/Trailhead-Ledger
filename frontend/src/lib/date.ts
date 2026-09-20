// Formats a Date as YYYY-MM-DD using its LOCAL calendar date, not UTC.
// `date.toISOString().slice(0, 10)` is the wrong tool for this: it converts
// to UTC first, so for any timezone ahead of UTC (e.g. IST, +5:30) it returns
// the previous day's date during the first few hours of each local day.
export function toISODate(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
