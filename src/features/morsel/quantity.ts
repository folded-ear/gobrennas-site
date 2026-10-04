import { FRACTIONS, type FractionRow } from "./fractions";

const DECIMAL = /^(\d*)\.(\d+)$/;
const FRACTION = /^(?:(\d+) +)?(\d+)\/(\d+)$/;

type Parts = { whole: number; fraction: number };

/** I show a written quantity's fractional part as a fraction from fractions, or return it as written. */
export function displayQuantity(
  written: string | number,
  fractions: readonly FractionRow[] = FRACTIONS,
): string {
  const text = String(written);
  const parts = split(text);
  const row =
    parts &&
    fractions.find(
      ([low, high]) => low <= parts.fraction && parts.fraction <= (high ?? low),
    );
  if (!parts || !row) return text;
  const [, , display] = row;
  if (parts.whole === 0) return display;
  return display.includes("/")
    ? `${parts.whole} ${display}`
    : `${parts.whole}${display}`;
}

function split(text: string): Parts | undefined {
  const decimal = DECIMAL.exec(text);
  if (decimal) {
    const [, whole, digits] = decimal;
    // Parse the digits alone so they equal the same digits written as a bound.
    return { whole: Number(whole), fraction: Number(`0.${digits}`) };
  }
  const fraction = FRACTION.exec(text);
  if (fraction) {
    const [whole, numerator, denominator] = fraction.slice(1).map(Number);
    if (denominator === 0) return undefined;
    return {
      whole: (whole || 0) + Math.floor(numerator / denominator),
      fraction: (numerator % denominator) / denominator,
    };
  }
  return undefined;
}
