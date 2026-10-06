import { FRACTIONS } from "./fractions";

const DECIMAL = /^(\d+)\.(\d+)$/;

/** I write a quantity prettily, its fractional part as a fraction from FRACTIONS, or return fallback when none covers it. */
export function humanQuantity(
  quantity: number,
  fallback: number | string = quantity,
): string {
  const decimal = DECIMAL.exec(String(quantity));
  if (!decimal) return String(fallback);
  const [, whole, digits] = decimal;
  // Parse the digits alone so they equal the same digits written as a bound.
  const fraction = Number(`0.${digits}`);
  const row = FRACTIONS.find(
    ([low, high]) => low <= fraction && fraction <= (high ?? low),
  );
  if (!row) return String(fallback);
  const [, , display] = row;
  if (whole === "0") return display;
  return display.includes("/") ? `${whole} ${display}` : `${whole}${display}`;
}
