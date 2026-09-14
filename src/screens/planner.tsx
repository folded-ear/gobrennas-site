"use client";

import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import {
  buildPlanDirectory,
  PlanDirectoryProvider,
} from "@/features/plan-directory";
import { PlanDnd } from "@/features/plan-dnd";
import { buildPlanTree, canChangePlan } from "@/features/plan-dnd/moves";
import { usePlanMoves } from "@/features/plan-dnd/use-plan-moves";
import { PlanItemDetail, PlanItemHeader } from "@/features/plan-item/detail";
import { PlanSectionHeader } from "@/features/plan-item/section-header";
import { PlanPicker } from "@/features/plan-picker";
import { usePlanSelection } from "@/features/plan-picker/use-plan-selection";
import { buildPlanContext } from "@/features/plan-timeline/context";
import {
  buildSection,
  buildSubtree,
  PlanItemNode,
} from "@/features/plan-timeline/model";
import { sectionLabel } from "@/features/plan-timeline/section-label";
import { TimelineSkeleton } from "@/features/plan-timeline/skeleton";
import { useHistoryState } from "@/hooks/use-history-state";
import { orderPlans } from "@/lib/plans";
import { PREF_PLANNER_PLANS } from "@/lib/preferences";
import { PlannerDocument } from "@/screens/__generated__/planner.generated";
import { useSuspenseQuery } from "@apollo/client/react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

// Only the viewer's browser knows the viewer's date, so the timeline never
// renders on the server.
const PlanTimeline = dynamic(
  () => import("@/features/plan-timeline").then((m) => m.PlanTimeline),
  { ssr: false, loading: () => <TimelineSkeleton /> },
);

/** What the screen over the planner shows: one item, or one section. */
type PlannerOpen = { readonly item: string } | { readonly section: string };

// What's open rides its own history entry, so going back closes it.
const OPEN_KEY = "plannerOpen";

function openItemId(open: PlannerOpen | undefined): string | undefined {
  return open !== undefined && "item" in open ? open.item : undefined;
}

function openSectionKey(open: PlannerOpen | undefined): string | undefined {
  return open !== undefined && "section" in open ? open.section : undefined;
}

export function Planner() {
  const { data } = useSuspenseQuery(PlannerDocument);
  const open = useHistoryState<PlannerOpen>(OPEN_KEY);

  const plans = data.planner.plans;
  const directory = useMemo(() => buildPlanDirectory(plans), [plans]);
  const [planIds, setPlanIds] = usePlanSelection(
    PREF_PLANNER_PLANS,
    plans,
    "multiple",
  );
  const shownPlans = useMemo(
    () => orderPlans(plans).filter((plan) => planIds.includes(plan.id)),
    [plans, planIds],
  );
  const timelinePlans = useMemo(
    () =>
      shownPlans.map((plan) => ({
        rootIds: plan.children.map((it) => it.id),
        items: plan.descendants,
        buckets: plan.buckets,
      })),
    [shownPlans],
  );
  const items = useMemo(
    () => shownPlans.flatMap((plan) => plan.descendants),
    [shownPlans],
  );
  const selected = items.find((it) => it.id === openItemId(open.value));
  // A closing screen slides away still showing what it showed, not an
  // empty panel.
  const [shownOpen, setShownOpen] = useState(open.value);
  if (
    open.value !== undefined &&
    (openItemId(open.value) !== openItemId(shownOpen) ||
      openSectionKey(open.value) !== openSectionKey(shownOpen))
  ) {
    setShownOpen(open.value);
  }
  const shown = items.find((it) => it.id === openItemId(shownOpen));
  const shownSectionKey = openSectionKey(shownOpen);
  const shownSection = useMemo(
    () =>
      shownSectionKey === undefined
        ? null
        : buildSection(timelinePlans, shownSectionKey),
    [timelinePlans, shownSectionKey],
  );
  const descendants = useMemo((): readonly PlanItemNode[] => {
    if (shown) return buildSubtree(items, shown.id);
    // A section's own items head its screen's tree, each with everything
    // below it, however deep.
    return (shownSection?.roots ?? []).map((root) => ({
      item: root.item,
      children: buildSubtree(items, root.item.id),
    }));
  }, [items, shown, shownSection]);
  const isOpen =
    selected !== undefined ||
    (openSectionKey(open.value) !== undefined && shownSection !== null);
  const tree = useMemo(
    () =>
      buildPlanTree(shownPlans.flatMap((plan) => [plan, ...plan.descendants])),
    [shownPlans],
  );
  const context = useMemo(
    () => buildPlanContext({ plans: timelinePlans }),
    [timelinePlans],
  );
  const moves = usePlanMoves({ plans: shownPlans, tree });
  const changeable = new Set(
    shownPlans.filter(canChangePlan).map((plan) => plan.id),
  );
  const dnd: PlanDnd = {
    tree,
    canMove: (itemId) => {
      const plan = directory.planOfItem.get(itemId);
      return plan !== undefined && changeable.has(plan.id);
    },
    moves,
  };

  return (
    <PlanDirectoryProvider directory={directory}>
      <SectionHeader title="Planner">
        <PlanPicker
          label="Plans"
          plans={plans}
          selectionMode="multiple"
          selectedIds={planIds}
          onChange={setPlanIds}
        />
      </SectionHeader>
      <Screen
        label={shown?.name ?? (shownSection ? sectionLabel(shownSection) : "")}
        isOpen={isOpen}
        header={
          shown ? (
            <PlanItemHeader
              item={shown}
              context={context}
              hasDescendants={descendants.length > 0}
              onSelect={(id) => open.replace({ item: id })}
            />
          ) : shownSection ? (
            <PlanSectionHeader section={shownSection} />
          ) : null
        }
      >
        {shown || shownSection ? (
          <PlanItemDetail
            context={context}
            descendants={descendants}
            dnd={dnd}
          />
        ) : null}
      </Screen>

      <div className="p-md">
        {shownPlans.length > 0 ? (
          <PlanTimeline
            plans={timelinePlans}
            openId={selected?.id}
            onSelect={(id) => open.push({ item: id })}
            onOpenSection={(key) => open.push({ section: key })}
            dnd={dnd}
          />
        ) : (
          <p>There are no plans to show.</p>
        )}
      </div>
    </PlanDirectoryProvider>
  );
}
