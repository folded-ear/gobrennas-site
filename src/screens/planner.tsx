"use client";

import { Screen } from "@/components/screen";
import { SectionHeader } from "@/components/section-header";
import { useWatchPlans } from "@/features/page-engine";
import { PlanAdd, PlanAddForm } from "@/features/plan-add";
import { canAddToSection } from "@/features/plan-add/destination";
import {
  BucketDialog,
  BucketMenu,
  type BucketAction,
} from "@/features/plan-buckets";
import {
  buildPlanDirectory,
  PlanDirectoryProvider,
} from "@/features/plan-directory";
import { PlanDnd } from "@/features/plan-dnd";
import { buildPlanTree } from "@/features/plan-dnd/moves";
import { usePlanMoves } from "@/features/plan-dnd/use-plan-moves";
import {
  buildEntries,
  EditSurfaceProvider,
  treeOrder,
  useEditState,
} from "@/features/plan-edit";
import { PlanItemDetail, PlanItemHeader } from "@/features/plan-item/detail";
import { PlanSectionHeader } from "@/features/plan-item/section-header";
import { PlanManagement, PlanManagementMenu } from "@/features/plan-management";
import { PlanPicker } from "@/features/plan-picker";
import { usePlanSelection } from "@/features/plan-picker/use-plan-selection";
import { buildPlanContext } from "@/features/plan-timeline/context";
import {
  buildSection,
  buildSubtree,
  PlanItemNode,
  type TimelineSection,
} from "@/features/plan-timeline/model";
import { sectionLabel } from "@/features/plan-timeline/section-label";
import { TimelineSkeleton } from "@/features/plan-timeline/skeleton";
import { useHistoryState } from "@/hooks/use-history-state";
import { displayName } from "@/lib/plan-item-name";
import { canAdministerPlan, canChangePlan, orderPlans } from "@/lib/plans";
import { PREF_PLANNER_PLANS } from "@/lib/preferences";
import { PlannerDocument } from "@/screens/__generated__/planner.generated";
import { useSuspenseQuery } from "@apollo/client/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

// Only the viewer's browser knows the viewer's date, so the timeline never
// renders on the server.
const PlanTimeline = dynamic(
  () => import("@/features/plan-timeline").then((m) => m.PlanTimeline),
  { ssr: false, loading: () => <TimelineSkeleton /> },
);

/** What the screen over the planner shows: an item, a section, or plan settings. */
type PlannerOpen =
  | { readonly item: string }
  | { readonly section: string }
  | { readonly plan: string };

// What's open rides its own history entry, so going back closes it.
const OPEN_KEY = "plannerOpen";

function openItemId(open: PlannerOpen | undefined): string | undefined {
  return open !== undefined && "item" in open ? open.item : undefined;
}

function openSectionKey(open: PlannerOpen | undefined): string | undefined {
  return open !== undefined && "section" in open ? open.section : undefined;
}

function openPlanId(open: PlannerOpen | undefined): string | undefined {
  return open !== undefined && "plan" in open ? open.plan : undefined;
}

export function Planner() {
  const { data } = useSuspenseQuery(PlannerDocument);
  const open = useHistoryState<PlannerOpen>(OPEN_KEY);
  const router = useRouter();
  const edit = useEditState();
  const [addingSections, setAddingSections] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const sectionKey = (section: TimelineSection) =>
    section.kind === "day"
      ? section.date
      : section.kind === "bucket"
        ? section.key
        : "unplanned";
  const setAdding = (section: TimelineSection, adding: boolean) =>
    setAddingSections((previous) => {
      const next = new Set(previous);
      if (adding) next.add(sectionKey(section));
      else next.delete(sectionKey(section));
      return next;
    });
  const [bucketAction, setBucketAction] = useState<BucketAction | null>(null);

  const plans = data.planner.plans;
  const directory = useMemo(() => buildPlanDirectory(plans), [plans]);
  const [planIds, setPlanIds] = usePlanSelection(
    PREF_PLANNER_PLANS,
    plans,
    "multiple",
  );
  useWatchPlans(planIds);
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
      openSectionKey(open.value) !== openSectionKey(shownOpen) ||
      openPlanId(open.value) !== openPlanId(shownOpen))
  ) {
    setShownOpen(open.value);
  }
  const shown = items.find((it) => it.id === openItemId(shownOpen));
  const shownPlan = plans.find((plan) => plan.id === openPlanId(shownOpen));
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
    plans.some((plan) => plan.id === openPlanId(open.value)) ||
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
  const openId = shown?.id ?? null;
  // The screen's editable rows, as it shows them, heading first.
  const editOrder = isOpen
    ? treeOrder(
        buildEntries(descendants, edit.drafts, openId),
        openId === null ? null : { id: openId },
      )
    : [];
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
      {bucketAction ? (
        <BucketDialog
          action={bucketAction}
          plans={shownPlans}
          onClose={() => setBucketAction(null)}
        />
      ) : null}
      <div className="flex h-[calc(100dvh-var(--section-nav-clearance))] flex-col overflow-hidden">
        <SectionHeader title="Planner">
          <div className="flex min-w-0 items-center gap-sm">
            <PlanPicker
              label="Plans"
              plans={plans}
              selectionMode="multiple"
              selectedIds={planIds}
              onChange={setPlanIds}
            />
            <PlanManagementMenu
              plans={plans}
              onSelect={(id) => open.push({ plan: id })}
            />
          </div>
        </SectionHeader>
        <EditSurfaceProvider
          state={edit}
          order={editOrder}
          tree={tree}
          createdStayPut
        >
          <Screen
            label={
              shownPlan
                ? `Manage ${shownPlan.name}`
                : shown
                  ? displayName(shown.name)
                  : shownSection
                    ? sectionLabel(shownSection)
                    : "Planner details"
            }
            isOpen={isOpen}
            header={
              shownPlan ? (
                <h2>Manage {shownPlan.name}</h2>
              ) : shown ? (
                <PlanItemHeader
                  item={shown}
                  context={context}
                  hasDescendants={descendants.length > 0}
                  onSelect={(id) => open.replace({ item: id })}
                  onRemoved={() => {
                    // Only while it's still open: an edit ended by the screen
                    // closing mustn't go back again.
                    if (openItemId(open.value) === shown.id) router.back();
                  }}
                />
              ) : shownSection ? (
                <PlanSectionHeader section={shownSection} />
              ) : null
            }
          >
            {shownPlan ? (
              <PlanManagement
                plan={shownPlan}
                onDeleted={() => router.back()}
              />
            ) : shown || shownSection ? (
              <PlanItemDetail
                context={context}
                descendants={descendants}
                parentId={shown?.id}
                dnd={dnd}
                holdsSection={!shown}
              />
            ) : null}
          </Screen>
        </EditSurfaceProvider>

        <div className="min-h-0 flex-1 bg-surface">
          {shownPlans.length > 0 ? (
            <PlanTimeline
              plans={timelinePlans}
              renderHeaderActions={(section) => (
                <>
                  <PlanAdd
                    plans={shownPlans}
                    section={section}
                    isOpen={addingSections.has(sectionKey(section))}
                    onOpenChange={(adding) => setAdding(section, adding)}
                    onAddBucket={
                      section.kind === "day" &&
                      shownPlans.some(canAdministerPlan)
                        ? () =>
                            setBucketAction({
                              kind: "create",
                              date: section.date,
                            })
                        : undefined
                    }
                  />
                  {section.kind === "bucket" ? (
                    <BucketMenu
                      plans={shownPlans}
                      bucketIds={section.bucketIds}
                      label={sectionLabel(section)}
                      onAction={setBucketAction}
                    />
                  ) : null}
                </>
              )}
              renderFooter={(section) =>
                addingSections.has(sectionKey(section)) ? (
                  <PlanAddForm
                    plans={shownPlans.filter((plan) =>
                      canAddToSection(plan, section),
                    )}
                    section={section}
                    onClose={() => setAdding(section, false)}
                  />
                ) : null
              }
              openId={selected?.id}
              onSelect={(id) => open.push({ item: id })}
              onOpenSection={(key) => open.push({ section: key })}
              dnd={dnd}
            />
          ) : (
            <p className="p-md">There are no plans to show.</p>
          )}
        </div>
      </div>
    </PlanDirectoryProvider>
  );
}
