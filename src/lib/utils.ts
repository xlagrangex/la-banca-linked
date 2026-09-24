import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Strip HTML tags from a string to get plain text. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * Parse an Italian-format price string (e.g. "1.290,00" or "900,00" or "1345")
 * into a number. Returns 0 if the value is null/undefined/unparseable.
 */
export function parsePrice(val: string | number | null | undefined): number {
  if (val == null) return 0
  if (typeof val === "number") return isNaN(val) ? 0 : val
  // Remove dots (thousands separator) and replace comma with dot (decimal separator)
  const cleaned = val.replace(/\./g, "").replace(",", ".")
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}
