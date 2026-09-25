export const DESKTOP_COLUMNS = 5;

export type PackGroup<T> = {
  section: string;
  items: readonly T[];
};

export type PlacedItem<T> = {
  item: T;
  /** 1-based grid column. */
  column: number;
  /** 1-based grid row in the packed desktop grid. */
  row: number;
};

export type PlacedSection<T> = {
  section: string;
  /** 1-based column where this section's header starts. */
  column: number;
  /** Header span. Equals the card count, or the full width when the section wraps. */
  span: number;
  headerRow: number;
  items: PlacedItem<T>[];
};

/**
 * Pack whole sections into rows of `columns`.
 * First-fit in data order: the earliest unpacked section anchors the row,
 * then a later section may fill a leftover gap if it fits on that one row.
 * A section longer than `columns` is its own block and wraps inside that block.
 */
export function packSections<T>(groups: readonly PackGroup<T>[], columns: number): PlacedSection<T>[] {
  const width = Math.max(1, Math.floor(columns));
  const pending = groups
    .filter((group) => group.items.length > 0)
    .map((group) => ({ section: group.section, items: group.items }));
  const placed: PlacedSection<T>[] = [];
  let row = 1;

  while (pending.length > 0) {
    const first = pending[0];
    if (!first) break;

    if (first.items.length > width) {
      pending.shift();
      const headerRow = row;
      placed.push({
        section: first.section,
        column: 1,
        span: width,
        headerRow,
        items: first.items.map((item, index) => ({
          item,
          column: (index % width) + 1,
          row: headerRow + 1 + Math.floor(index / width),
        })),
      });
      row = headerRow + 1 + Math.ceil(first.items.length / width);
      continue;
    }

    const band = [pending.shift()!];
    let space = width - band[0].items.length;
    let index = 0;
    while (index < pending.length && space > 0) {
      const candidate = pending[index];
      if (candidate && candidate.items.length <= space) {
        band.push(candidate);
        space -= candidate.items.length;
        pending.splice(index, 1);
      } else {
        index += 1;
      }
    }

    const headerRow = row;
    const cardRow = headerRow + 1;
    let column = 1;
    for (const group of band) {
      const span = group.items.length;
      placed.push({
        section: group.section,
        column,
        span,
        headerRow,
        items: group.items.map((item, itemIndex) => ({
          item,
          column: column + itemIndex,
          row: cardRow,
        })),
      });
      column += span;
    }
    row = cardRow + 1;
  }

  return placed;
}
