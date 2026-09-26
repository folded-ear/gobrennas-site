import { screen, userEvent, waitFor } from "@/test";
import { onTestFinished, vi } from "vitest";
import { ACTIVATION_DISTANCE } from "../drag-session";

/** How far dnd-kit's stock keyboard sensor moves a drag per arrow press. */
const KEYBOARD_STEP = 25;

/** The side of the box everything but a zone is laid out as. */
const BOX_SIZE = 10;

const ZONE_WIDTH = 4 * KEYBOARD_STEP;

// Zones are invisible and hidden from assistive tech, so nothing accessible
// can find them; their labels are only announced while a drag is over one.
const ZONE_ATTRIBUTE = "data-drop-zone";

/** A zone's whole label, or a pattern its label matches. */
type ZoneLabel = string | RegExp;

let keyboardSteps = 0;

// A pointer drag spans several calls, and each direct userEvent call starts
// over with nothing pressed.
let pointerUser = userEvent.setup();

function allZones(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(`[${ZONE_ATTRIBUTE}]`),
  );
}

/** I give a zone's label. */
export function dropZoneLabel(zone: Element): string {
  return zone.getAttribute(ZONE_ATTRIBUTE) ?? "";
}

/** I give the zones whose labels match, in document order. */
export function queryAllDropZones(label: ZoneLabel): HTMLElement[] {
  return allZones().filter((zone) => {
    const text = dropZoneLabel(zone);
    return typeof label === "string" ? text === label : label.test(text);
  });
}

/** I give the one zone whose label matches, or null. More than one throws. */
export function queryDropZone(label: ZoneLabel): HTMLElement | null {
  const zones = queryAllDropZones(label);
  if (zones.length > 1) {
    throw new Error(`Found ${zones.length} drop zones labelled ${label}`);
  }
  return zones[0] ?? null;
}

/** I give the one zone whose label matches. None, or more than one, throws. */
export function getDropZone(label: ZoneLabel): HTMLElement {
  const zone = queryDropZone(label);
  if (zone === null) throw new Error(`Found no drop zone labelled ${label}`);
  return zone;
}

// Zones stack down a column, each a step tall below a step's gap, so a box
// moved in whole steps sits squarely inside one zone or between two.
function zoneSteps(zone: HTMLElement): number {
  return 2 * (allZones().indexOf(zone) + 1);
}

function stubbedRect(element: Element): DOMRect {
  const isZone = element instanceof HTMLElement && allZones().includes(element);
  return DOMRect.fromRect(
    isZone
      ? {
          x: 0,
          y: zoneSteps(element) * KEYBOARD_STEP,
          width: ZONE_WIDTH,
          height: KEYBOARD_STEP,
        }
      : { x: 0, y: 0, width: BOX_SIZE, height: BOX_SIZE },
  );
}

/** I lay the page out for the rest of the test, since jsdom lays out nothing. */
function stubLayout(): void {
  if (vi.isMockFunction(Element.prototype.getBoundingClientRect)) return;
  const spy = vi
    .spyOn(Element.prototype, "getBoundingClientRect")
    .mockImplementation(function (this: Element) {
      return stubbedRect(this);
    });
  onTestFinished(() => spy.mockRestore());
}

/**
 * I pick an item up by its handle from the keyboard, returning once the
 * drag is listening for arrow keys.
 */
export async function keyboardDrag(handleName: string): Promise<void> {
  stubLayout();
  keyboardSteps = 0;
  const handle = screen.getByRole("button", { name: handleName });
  handle.focus();
  await userEvent.keyboard("{Enter}");
  await waitFor(() => {
    if (handle.getAttribute("aria-pressed") !== "true") {
      throw new Error(`The drag from "${handleName}" never started`);
    }
  });
  // The sensor starts listening for keys a tick after the drag starts.
  await new Promise((resolve) => setTimeout(resolve));
}

/** I move the drag under way by arrow keys until it's over this zone. */
export async function keyboardMoveTo(label: ZoneLabel): Promise<void> {
  const target = zoneSteps(getDropZone(label));
  const key = target > keyboardSteps ? "{ArrowDown}" : "{ArrowUp}";
  const step = target > keyboardSteps ? 1 : -1;
  while (keyboardSteps !== target) {
    await userEvent.keyboard(key);
    keyboardSteps += step;
  }
}

/** I move the drag under way to this zone and drop it there. */
export async function keyboardDrop(label: ZoneLabel): Promise<void> {
  await keyboardMoveTo(label);
  await userEvent.keyboard("{Enter}");
}

/** I call off the drag under way. */
export async function keyboardCancel(): Promise<void> {
  await userEvent.keyboard("{Escape}");
}

/**
 * I press an item's handle and move the pointer this far, leaving it held.
 * Left out, I move just far enough to start a drag.
 */
export async function pointerDrag(
  handleName: string,
  distance = ACTIVATION_DISTANCE + 1,
): Promise<void> {
  stubLayout();
  pointerUser = userEvent.setup();
  const handle = screen.getByRole("button", { name: handleName });
  const start = BOX_SIZE / 2;
  await pointerUser.pointer([
    {
      keys: "[MouseLeft>]",
      target: handle,
      coords: { clientX: start, clientY: start },
    },
    { coords: { clientX: start, clientY: start + distance } },
  ]);
}

/** I let go of the pointer wherever it is. */
export async function pointerRelease(): Promise<void> {
  await pointerUser.pointer({ keys: "[/MouseLeft]" });
}

/** I move the pointer dragging an item onto this zone and let go. */
export async function pointerDrop(label: ZoneLabel): Promise<void> {
  const zone = getDropZone(label);
  const middle = (zoneSteps(zone) + 0.5) * KEYBOARD_STEP;
  await pointerUser.pointer([
    { coords: { clientX: BOX_SIZE / 2, clientY: middle } },
    { keys: "[/MouseLeft]" },
  ]);
}
