/** Max characters shown in a table cell before truncating (full text in hover tooltip). */
export const TABLE_CELL_CHAR_LIMIT = 150;

export function truncateTableCellText(
  value: string,
  maxLength = TABLE_CELL_CHAR_LIMIT,
): { display: string; full: string; hasMore: boolean } {
  const full = value ?? '';
  if (full.length <= maxLength) {
    return { display: full, full, hasMore: false };
  }
  return {
    display: `${full.slice(0, maxLength)}…`,
    full,
    hasMore: true,
  };
}

export function truncateTableCellWords(
  value: string,
  maxWords = 5,
): { display: string; full: string; hasMore: boolean } {
  const full = (value ?? '').trim();
  if (!full) {
    return { display: '', full: '', hasMore: false };
  }
  const words = full.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return { display: full, full, hasMore: false };
  }
  return {
    display: `${words.slice(0, maxWords).join(' ')}…`,
    full,
    hasMore: true,
  };
}
