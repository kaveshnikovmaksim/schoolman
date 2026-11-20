/** A ruler must stay entirely inside the scrollable date area. */
export function isJournalColumnVisible(columnLeft: number, columnRight: number, datesLeft: number, datesRight: number): boolean {
  return columnLeft >= datesLeft && columnRight <= datesRight && columnRight > columnLeft;
}