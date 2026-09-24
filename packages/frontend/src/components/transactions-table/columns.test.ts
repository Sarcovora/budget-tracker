import {
  COLUMN_DEFINITIONS_BY_ID,
  DEFAULT_COLUMN_ORDER,
  DEFAULT_VISIBLE_COLUMNS,
  MAX_COLUMN_WIDTH_PX,
  MIN_COLUMN_WIDTH_PX,
  TABLE_COLUMN,
  clampColumnWidth,
  isKnownColumnId,
} from './columns';

describe('clampColumnWidth', () => {
  it('keeps a width that is already within bounds', () => {
    expect(clampColumnWidth(200)).toBe(200);
  });

  it('clamps to the bounds', () => {
    expect(clampColumnWidth(MIN_COLUMN_WIDTH_PX - 50)).toBe(MIN_COLUMN_WIDTH_PX);
    expect(clampColumnWidth(MAX_COLUMN_WIDTH_PX + 50)).toBe(MAX_COLUMN_WIDTH_PX);
  });

  it('clamps a drag that ran past the left edge into a negative width', () => {
    expect(clampColumnWidth(-320)).toBe(MIN_COLUMN_WIDTH_PX);
  });

  // A pointer delta is fractional on a scaled display; a fractional column width
  // lands neighbouring cell borders on half pixels.
  it('rounds a fractional width', () => {
    expect(clampColumnWidth(200.4)).toBe(200);
    expect(clampColumnWidth(200.6)).toBe(201);
  });
});

describe('column registry', () => {
  it('registers every column in the default order exactly once', () => {
    expect(DEFAULT_COLUMN_ORDER).toHaveLength(Object.keys(COLUMN_DEFINITIONS_BY_ID).length);
    expect(new Set(DEFAULT_COLUMN_ORDER).size).toBe(DEFAULT_COLUMN_ORDER.length);
  });

  it('only defaults to columns that exist', () => {
    expect(DEFAULT_VISIBLE_COLUMNS.every(isKnownColumnId)).toBe(true);
  });

  it('gives every column a default width inside the resize bounds', () => {
    for (const definition of Object.values(COLUMN_DEFINITIONS_BY_ID)) {
      expect(clampColumnWidth(definition.widthPx)).toBe(definition.widthPx);
    }
  });

  // Payment type is opt-in: it's blank for most manually entered transactions.
  it('offers the payment type column but leaves it hidden by default', () => {
    expect(isKnownColumnId(TABLE_COLUMN.paymentType)).toBe(true);
    expect(DEFAULT_VISIBLE_COLUMNS).not.toContain(TABLE_COLUMN.paymentType);
  });
});
