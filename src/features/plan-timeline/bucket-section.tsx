import { PlanDotStack } from "@/components/plan-dot";
import {
  useBucketPlans,
  useShowsPlanIndicators,
} from "@/features/plan-directory";
import { useDragSession } from "@/features/plan-dnd/drag-session";
import { ZoneSpec } from "@/features/plan-dnd/zone-layer";
import { WHOLE_ZONE } from "@/features/plan-dnd/zones";
import { PlanContext } from "./context";
import {
  TimelineBucketSection,
  TimelineUnplanned,
  UNPLANNED_SECTION,
} from "./model";
import { sectionLabel } from "./section-label";
import { SectionShell } from "./section-shell";
import { TimelineDnd } from "./timeline-row";

type SectionProps = {
  /** The item open in its screen, marked wherever it shows. */
  openId?: string;
  onSelect?: (id: string) => void;
  /** Opens a section by its key. Left out, no section opens. */
  onOpenSection?: (key: string) => void;
  /** Left out, nothing can be dragged. */
  dnd?: TimelineDnd;
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
  onOpenSection,
  dnd,
}: BucketSectionProps) {
  const { dragged } = useDragSession();
  const label = sectionLabel(bucket);
  const sectionKey = bucket.key;
  const plans = useBucketPlans(bucket.bucketIds);
  const showsPlans = useShowsPlanIndicators();
  const zones: readonly ZoneSpec[] =
    dnd && dragged && dnd.sectionOf.get(dragged.id) !== sectionKey
      ? [
          {
            rect: WHOLE_ZONE,
            indicator: "fill",
            label: `Move to ${label}`,
            onDrop: () =>
              dnd.moves.moveToBucket(
                dragged.id,
                { name: bucket.name, date: bucket.date },
                dragged.name,
              ),
          },
        ]
      : [];

  return (
    <SectionShell
      label={label}
      marker={
        showsPlans && plans.length > 0 ? <PlanDotStack plans={plans} /> : null
      }
      roots={bucket.roots}
      zones={zones}
      sectionKey={sectionKey}
      context={context}
      openId={openId}
      onSelect={onSelect}
      onOpenSection={onOpenSection}
      dnd={dnd}
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
  onOpenSection,
  dnd,
}: UnplannedSectionProps) {
  const { dragged } = useDragSession();
  const label = sectionLabel(unplanned);
  const zones: readonly ZoneSpec[] =
    dnd && dragged && dnd.sectionOf.get(dragged.id) !== UNPLANNED_SECTION
      ? [
          {
            rect: WHOLE_ZONE,
            indicator: "fill",
            label: `Move to ${label}`,
            onDrop: () => dnd.moves.moveToUnplanned(dragged.id, dragged.name),
          },
        ]
      : [];

  return (
    <SectionShell
      label={label}
      roots={unplanned.roots}
      zones={zones}
      sectionKey={UNPLANNED_SECTION}
      context={context}
      openId={openId}
      onSelect={onSelect}
      onOpenSection={onOpenSection}
      dnd={dnd}
    />
  );
}
