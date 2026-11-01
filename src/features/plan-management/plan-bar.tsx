"use client";

import { PlanDot } from "@/components/plan-dot";
import { canChangePlan, orderPlans } from "@/lib/plans";
import { useFragment } from "@apollo/client/react";
import { Button, Dropdown, Label, Popover } from "@heroui/react";
import clsx from "clsx";
import { Ellipsis, Plus } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  PlannerPlanBarFragmentDoc,
  type PlannerPlanBarFragment,
} from "./__generated__/management.generated";
import { visiblePlanCount } from "./overflow";

type Plan = PlannerPlanBarFragment;
type PlanReference = { __typename?: "Plan"; id: string };

function planLabel(plan: Plan) {
  return !plan.mine && plan.ownedBy?.name
    ? `${plan.name} · ${plan.ownedBy.name}`
    : plan.name;
}

function PlanControl({
  plan,
  selected,
  onToggle,
  onManage,
  ownerAvatar,
}: {
  plan: Plan;
  selected: boolean;
  onToggle: () => void;
  onManage: () => void;
  ownerAvatar: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex shrink-0 items-center rounded-lg border",
        selected ? "border-accent ring-1 ring-accent" : "border-border",
      )}
    >
      <Button
        variant="ghost"
        aria-pressed={selected}
        aria-label={planLabel(plan)}
        className="min-w-0 gap-sm"
        onPress={onToggle}
      >
        <span aria-hidden>
          <PlanDot plan={plan} />
        </span>
        <span
          className="min-w-0 max-w-[16ch] truncate text-left"
          title={plan.name}
        >
          {plan.name}
        </span>
        {ownerAvatar}
      </Button>
      {canChangePlan(plan) ? (
        <Dropdown>
          <Button
            isIconOnly
            variant="ghost"
            aria-label={`Options for ${planLabel(plan)}`}
          >
            <Ellipsis aria-hidden />
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu aria-label={`Options for ${planLabel(plan)}`}>
              <Dropdown.Item
                id="settings"
                textValue="Plan settings"
                onAction={onManage}
              >
                <Label>Plan settings</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      ) : null}
    </div>
  );
}

function PlanBarEntry({
  plan: reference,
  selected,
  onToggle,
  onManage,
  heading,
  reserveHeading,
  renderOwnerAvatar,
}: {
  plan: PlanReference;
  selected: boolean;
  onToggle: () => void;
  onManage: () => void;
  heading?: string;
  reserveHeading: boolean;
  renderOwnerAvatar: (planId: string) => ReactNode;
}) {
  const { data: plan, complete } = useFragment({
    fragment: PlannerPlanBarFragmentDoc,
    from: reference,
  });
  if (!complete) return null;
  return (
    <div className="flex shrink-0 flex-col items-start gap-xxs">
      {reserveHeading ? (
        <span className="h-4 whitespace-nowrap text-xs text-muted">
          {heading}
        </span>
      ) : null}
      <PlanControl
        plan={plan}
        selected={selected}
        onToggle={onToggle}
        onManage={onManage}
        ownerAvatar={
          !plan.mine && plan.ownedBy ? renderOwnerAvatar(plan.id) : null
        }
      />
    </div>
  );
}

type BarPlan = PlanReference & { mine: boolean };

export function PlannerPlanBar({
  plans,
  selectedIds,
  onChange,
  onManage,
  onCreate,
  renderOwnerAvatar,
}: {
  plans: readonly BarPlan[];
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
  onManage: (id: string) => void;
  onCreate: () => void;
  renderOwnerAvatar: (planId: string) => ReactNode;
}) {
  const ordered = orderPlans(plans);
  const available = useRef<HTMLDivElement>(null);
  const measurements = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<number | undefined>(undefined);
  const [overflowOpen, setOverflowOpen] = useState(false);
  // Observe content as well as available space: names, fonts and group labels
  // can change the fit without a window resize.
  useEffect(() => {
    const container = available.current;
    const row = measurements.current;
    if (!container || !row) return;
    const measure = () => {
      if (container.clientWidth <= 0) return;
      const children = Array.from(row.children);
      const overflow = children.pop();
      const gap = Number.parseFloat(getComputedStyle(row).columnGap) || 0;
      setVisible(
        visiblePlanCount(
          container.clientWidth,
          children.map((child) => child.getBoundingClientRect().width),
          overflow?.getBoundingClientRect().width ?? 0,
          gap,
        ),
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(row);
    for (const child of row.children) observer.observe(child);
    measure();
    return () => observer.disconnect();
  }, [plans.length]);

  const count = Math.min(visible ?? ordered.length, ordered.length);
  const hidden = ordered.slice(count);
  const hiddenSelected = hidden.filter((plan) =>
    selectedIds.includes(plan.id),
  ).length;
  const toggle = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((selected) => selected !== id)
      : [...selectedIds, id];
    if (next.length) onChange(next);
  };
  const entry = (plan: BarPlan, index: number, withHeading: boolean) => (
    <PlanBarEntry
      key={plan.id}
      plan={plan}
      selected={selectedIds.includes(plan.id)}
      reserveHeading={withHeading}
      renderOwnerAvatar={renderOwnerAvatar}
      onToggle={() => toggle(plan.id)}
      onManage={() => {
        setOverflowOpen(false);
        onManage(plan.id);
      }}
      heading={
        withHeading && (index === 0 || ordered[index - 1].mine !== plan.mine)
          ? plan.mine
            ? "Your plans"
            : "Shared with you"
          : undefined
      }
    />
  );
  const overflowLabel = `More plans · ${hiddenSelected} selected`;
  return (
    <div
      aria-label="Planner plans"
      role="group"
      className="relative flex shrink-0 items-end gap-sm border-b border-separator bg-background px-md py-sm"
    >
      <div ref={available} className="min-w-0 flex-1">
        <div className="-m-xxs flex items-end gap-sm overflow-hidden p-xxs">
          {ordered
            .slice(0, count)
            .map((plan, index) => entry(plan, index, true))}
          {hidden.length ? (
            <Popover isOpen={overflowOpen} onOpenChange={setOverflowOpen}>
              <Button
                variant="secondary"
                className="shrink-0"
                aria-label={overflowLabel}
              >
                <Ellipsis aria-hidden />
                <span className="tabular-nums">
                  More plans · {hiddenSelected} selected
                </span>
              </Button>
              <Popover.Content
                placement="bottom start"
                className="max-w-[calc(100vw-2rem)]"
              >
                <Popover.Dialog
                  aria-label="More plans"
                  className="max-h-[60dvh] overflow-y-auto"
                >
                  {[true, false].map((mine) => {
                    const group = hidden.filter((plan) => plan.mine === mine);
                    return group.length ? (
                      <section
                        key={String(mine)}
                        aria-label={mine ? "Your plans" : "Shared with you"}
                        className="flex flex-col gap-sm py-sm"
                      >
                        <h2 className="text-sm">
                          {mine ? "Your plans" : "Shared with you"}
                        </h2>
                        {group.map((plan) => entry(plan, 0, false))}
                      </section>
                    ) : null;
                  })}
                </Popover.Dialog>
              </Popover.Content>
            </Popover>
          ) : null}
        </div>
      </div>
      <Button
        variant="secondary"
        aria-label="New plan"
        className="shrink-0 max-sm:aspect-square max-sm:px-0"
        onPress={onCreate}
      >
        <Plus aria-hidden />
        <span className="hidden sm:inline">New plan</span>
      </Button>
      <div
        aria-hidden
        inert
        className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden"
      >
        <div ref={measurements} className="flex w-max items-center gap-sm">
          {ordered.map((plan, index) => entry(plan, index, true))}
          <Button variant="secondary">
            <Ellipsis />
            <span className="tabular-nums">
              More plans · {plans.length} selected
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
