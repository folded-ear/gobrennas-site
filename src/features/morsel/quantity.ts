import { FRACTIONS } from "./fractions";

const DECIMAL = /^(\d+)\.(\d+)$/;

/** I show a quantity's fractional part as a fraction from FRACTIONS, or return undefined when none covers it. */
export function asFraction(quantity: number): string | undefined {
  const decimal = DECIMAL.exec(String(quantity));
  if (!decimal) return undefined;
  const [, whole, digits] = decimal;
  // Parse the digits alone so they equal the same digits written as a bound.
  const fraction = Number(`0.${digits}`);
  const row = FRACTIONS.find(
    ([low, high]) => low <= fraction && fraction <= (high ?? low),
  );
  if (!row) return undefined;
  const [, , display] = row;
  if (whole === "0") return display;
  return display.includes("/") ? `${whole} ${display}` : `${whole}${display}`;
}
