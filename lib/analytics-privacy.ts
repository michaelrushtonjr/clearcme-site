// Credential identifiers — NPI (10 digits), DEA (2 letters + 7 digits) and most
// state license numbers — are runs of five or more digits, sometimes behind a
// short letter prefix. Dates, hours of CME and prices never contain five digits
// in a row, so masking those runs hides the identifiers and leaves the rest of
// the screen readable in session recordings.
const IDENTIFIER_RUN = /[A-Za-z]{0,4}\d{5,}/g;

export function maskIdentifiers(text: string): string {
  return text.replace(IDENTIFIER_RUN, (match) => "*".repeat(match.length));
}
