"use client";

import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { DropZone } from "./drop-zone";
import { ZoneRect } from "./zones";

/** How a zone shows that a drop there would land. */
export type ZoneIndicator = "before" | "after" | "nest" | "fill";

/** One place a dragged item can be dropped. */
export type ZoneSpec = {
  readonly rect: ZoneRect;
  readonly indicator: ZoneIndicator;
  readonly label: string;
  onDrop(): void;
};

const INDICATOR_CLASSES: Readonly<Record<ZoneIndicator, string>> = {
  before: "inset-x-0 top-0 h-xxs -translate-y-1/2 bg-accent",
  after: "inset-x-0 bottom-0 h-xxs translate-y-1/2 bg-accent",
  nest: "inset-0 rounded-xs ring-2 ring-accent",
  fill: "inset-0 rounded-xs bg-accent-soft",
};

function Indicator({ kind }: { kind: ZoneIndicator }) {
  return (
    <>
      <div
        aria-hidden
        data-drop-indicator={kind}
        className={clsx(
          "pointer-events-none absolute",
          INDICATOR_CLASSES[kind],
        )}
      />
      {kind === "nest" ? (
        // The line a first child would sit on, indented as one.
        <div
          aria-hidden
          className="pointer-events-none absolute start-xl end-0 bottom-0 h-xxs translate-y-1/2 bg-accent"
        />
      ) : null}
    </>
  );
}

type ZoneTargetProps = {
  spec: ZoneSpec;
  onTarget(label: string, isTarget: boolean): void;
};

function ZoneTarget({ spec, onTarget }: ZoneTargetProps) {
  const { label } = spec;
  const handleTargetChange = useCallback(
    (isTarget: boolean) => onTarget(label, isTarget),
    [onTarget, label],
  );
  // A zone can go while targeted, when a drop makes it pointless.
  useEffect(() => () => onTarget(label, false), [onTarget, label]);
  return (
    <DropZone
      rect={spec.rect}
      label={label}
      onDrop={spec.onDrop}
      onTargetChange={handleTargetChange}
    />
  );
}

/**
 * I lay drop zones over a relatively positioned container and mark the one
 * a drag is over. I take up no room, so nothing moves when I appear.
 */
export function ZoneLayer({ zones }: { zones: readonly ZoneSpec[] }) {
  const [targetLabel, setTargetLabel] = useState<string | null>(null);
  const handleTarget = useCallback((label: string, isTarget: boolean) => {
    setTargetLabel((current) =>
      isTarget ? label : current === label ? null : current,
    );
  }, []);

  if (zones.length === 0) return null;
  const target = zones.find((spec) => spec.label === targetLabel);
  return (
    <>
      {zones.map((spec) => (
        <ZoneTarget key={spec.label} spec={spec} onTarget={handleTarget} />
      ))}
      {target ? <Indicator kind={target.indicator} /> : null}
    </>
  );
}
