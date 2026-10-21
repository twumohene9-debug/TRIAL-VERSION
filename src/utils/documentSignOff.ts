/**
 * Standard institutional sign-off for all downloadable and printable documents.
 */
export const DOCUMENT_SIGN_OFF = 'The joy of the Lord is my strength';

import * as XLSX from 'xlsx';

/**
 * Appends the standardized institutional sign-off to any SheetJS (XLSX) worksheet.
 */
export function appendSignOffToWorksheet(worksheet: XLSX.WorkSheet): void {
  if (!worksheet) return;
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [
      [],
      [DOCUMENT_SIGN_OFF]
    ],
    { origin: -1 }
  );
}

/**
 * Appends the standardized institutional sign-off to CSV text.
 */
export function appendSignOffToCsv(csvText: string): string {
  const trimmed = csvText.trimEnd();
  return `${trimmed}\n\n"${DOCUMENT_SIGN_OFF}"\n`;
}
