/** I'm one displayed fraction: the range of fractional parts I cover, and how I show. */
export type FractionRow = readonly [
  low: number,
  high: number | null,
  display: string,
];

/**
 * I list the fractions shown in place of written quantities. A quantity whose
 * fractional part is between low and high, inclusive, shows as display. A
 * null high covers exactly low. My rows are sorted and never overlap.
 */
// prettier-ignore
export const FRACTIONS: readonly FractionRow[] = [
  //  low   high    display
  [0.06,  0.063,  "1/16"],
  [0.12,  0.13,   "⅛"],
  [0.16,  0.17,   "⅙"],
  [0.18,  0.19,   "3/16"],
  [0.25,  null,   "¼"],
  [0.31,  0.313,  "5/16"],
  [0.33,  0.334,  "⅓"],
  [0.37,  0.38,   "⅜"],
  [0.43,  0.44,   "7/16"],
  [0.5,   null,   "½"],
  [0.56,  0.563,  "9/16"],
  [0.62,  0.63,   "⅝"],
  [0.66,  0.67,   "⅔"],
  [0.68,  0.69,   "11/16"],
  [0.75,  null,   "¾"],
  [0.81,  0.813,  "13/16"],
  [0.83,  0.834,  "⅚"],
  [0.87,  0.88,   "⅞"],
  [0.93,  0.94,   "15/16"],
];
