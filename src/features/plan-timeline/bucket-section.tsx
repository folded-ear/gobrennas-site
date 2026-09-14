import { useDragSession } from "@/features/plan-dnd/drag-session";
import { ZoneSpec } from "@/features/plan-dnd/zone-layer";
import { WHOLE_ZONE } from "@/features/plan-dnd/zones";
import { PlanContext } from "./context";
import { formatDayLabel } from "./dates";
import {
  bucketSectionKey,
  TimelineBucketSection,
  TimelineUnplanned,
  UNPLANNED_SECTION,
} from "./model";
import { SectionShell } from "./section-shell";
import { TimelineDnd } from "./timeline-row";

const UNPLANNED_LABEL = "Unplanned";

type SectionProps = {
  /** The item open in its screen, marked wherever it shows. */
  openId?: string;
  onSelect?: (id: string) => void;
  /** Left out, nothing can be dragged. */
  dnd?: TimelineDnd;
  /** Left out, no item offers to be cooked. */
  planId?: string;
};

type BucketSectionProps = SectionProps & {
  bucket: TimelineBucketSection;
  context: PlanContext;
};

/** I label one named bucket, dated or not, and show whatever it holds. */
export function BucketSection({
  bucket,
  context,
  openId,
  onSelect,
  dnd,
  planId,
}: BucketSectionProps) {
  const { dragged } = useDragSession();
  const label =
    bucket.date !== null
      ? `${bucket.name} – ${formatDayLabel(bucket.date)}`
      : bucket.name;
  const sectionKey = bucketSectionKey(bucket.bucketId);
  const zones: readonly ZoneSpec[] =
    dnd && dragged && dnd.sectionOf.get(dragged.id) !== sectionKey
      ? [
          {
            rect: WHOLE_ZONE,
            indicator: "fill",
            label: `Move to ${label}`,
            onDrop: () =>
              dnd.moves.moveToBucket(dragged.id, bucket.bucketId, dragged.name),
          },
        ]
      : [];

  return (
    <SectionShell
      label={label}
      roots={bucket.roots}
      zones={zones}
      sectionKey={sectionKey}
      context={context}
      openId={openId}
      onSelect={onSelect}
      dnd={dnd}
      planId={planId}
    />
  );
}

type UnplannedSectionProps = SectionProps & {
  unplanned: TimelineUnplanned;
  context: PlanContext;
};

/** I label the items no bucket places anywhere else. */
export function UnplannedSection({
  unplanned,
  context,
  openId,
  onSelect,
  dnd,
  planId,
}: UnplannedSectionProps) {
  const { dragged } = useDragSession();
  const zones: readonly ZoneSpec[] =
    dnd && dragged && dnd.sectionOf.get(dragged.id) !== UNPLANNED_SECTION
      ? [
          {
            rect: WHOLE_ZONE,
            indicator: "fill",
            label: `Move to ${UNPLANNED_LABEL}`,
            onDrop: () => dnd.moves.moveToUnplanned(dragged.id, dragged.name),
          },
        ]
      : [];

  return (
    <SectionShell
      label={UNPLANNED_LABEL}
      roots={unplanned.roots}
      zones={zones}
      sectionKey={UNPLANNED_SECTION}
      context={context}
      openId={openId}
      onSelect={onSelect}
      dnd={dnd}
      planId={planId}
    />
  );
}
