import { FRACTIONS } from "./fractions";

/** Rounding fractional parts to millionths clears float error without touching anything a person would enter. */
const FRACTION_SCALE = 1_000_000;

const NUMBER_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 3,
});

/**
 * I write a quantity prettily, its fractional part as a fraction from
 * FRACTIONS. When none covers it, I return fallback: a number to at most three
 * decimal places, a string as is.
 */
export function humanQuantity(
  quantity: number,
  fallback: number | string = quantity,
): string {
  const whole = Math.trunc(quantity);
  const fraction =
    Math.round((quantity - whole) * FRACTION_SCALE) / FRACTION_SCALE;
  const row = FRACTIONS.find(
    ([low, high]) => low <= fraction && fraction <= (high ?? low),
  );
  if (!row) {
    return typeof fallback === "number"
      ? NUMBER_FORMAT.format(fallback)
      : fallback;
  }
  const [, , display] = row;
  if (whole === 0) return display;
  const written = NUMBER_FORMAT.format(whole);
  return display.includes("/")
    ? `${written} ${display}`
    : `${written}${display}`;
}
