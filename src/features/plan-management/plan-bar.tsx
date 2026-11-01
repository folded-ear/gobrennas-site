"use client";

import { PlanDot } from "@/components/plan-dot";
import { canChangePlan, orderPlans } from "@/lib/plans";
import { useFragment } from "@apollo/client/react";
import { Button, Dropdown, Label, Popover } from "@heroui/react";
import clsx from "clsx";
import { Ellipsis, Plus, Settings } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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

function groupLabel(mine: boolean) {
  return mine ? "Your plans" : "Shared with you";
}

function moreLabel(selected: number) {
  return `More plans · ${selected} selected`;
}

function PlanControl({
  plan,
  selected,
  onToggle,
  onManage,
  ownerAvatar,
  isOnlySelected,
}: {
  plan: Plan;
  selected: boolean;
  onToggle: () => void;
  onManage: () => void;
  ownerAvatar: ReactNode;
  isOnlySelected: boolean;
}) {
  const hintId = useId();
  const hint = "At least one plan must stay selected.";
  return (
    <div
      title={isOnlySelected ? hint : undefined}
      className={clsx(
        "flex shrink-0 items-center rounded-lg border",
        selected ? "border-accent ring-1 ring-accent" : "border-border",
      )}
    >
      {isOnlySelected ? (
        <span id={hintId} className="sr-only">
          {hint}
        </span>
      ) : null}
      <Button
        variant="ghost"
        aria-pressed={selected}
        aria-label={planLabel(plan)}
        isDisabled={isOnlySelected}
        aria-describedby={isOnlySelected ? hintId : undefined}
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
  ownerAvatar,
  isOnlySelected,
}: {
  plan: PlanReference;
  selected: boolean;
  onToggle: () => void;
  onManage: () => void;
  heading?: string;
  ownerAvatar: ReactNode;
  isOnlySelected: boolean;
}) {
  const { data: plan, complete } = useFragment({
    fragment: PlannerPlanBarFragmentDoc,
    from: reference,
  });
  if (!complete) return null;
  return (
    <div className="flex shrink-0 flex-col items-start gap-xxs">
      {heading !== undefined ? (
        <span className="h-4 whitespace-nowrap text-xs text-muted">
          {heading}
        </span>
      ) : null}
      <PlanControl
        plan={plan}
        selected={selected}
        onToggle={onToggle}
        onManage={onManage}
        ownerAvatar={ownerAvatar}
        isOnlySelected={isOnlySelected}
      />
    </div>
  );
}

type BarPlan = PlanReference & { mine: boolean };

export function PlannerPlanBar<P extends BarPlan>({
  plans,
  selectedIds,
  onChange,
  onManage,
  onCreate,
  onManageAll,
  renderOwnerAvatar,
}: {
  plans: readonly P[];
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
  onManage: (id: string) => void;
  onCreate: () => void;
  onManageAll?: () => void;
  renderOwnerAvatar: (plan: P) => ReactNode;
}) {
  const ordered = orderPlans(plans);
  const selected = new Set(selectedIds);
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
  const hiddenSelected = hidden.filter((plan) => selected.has(plan.id)).length;
  const toggle = (id: string) => {
    const next = selected.has(id)
      ? selectedIds.filter((selected) => selected !== id)
      : [...selectedIds, id];
    if (next.length) onChange(next);
  };
  const entry = (plan: P, heading?: string) => (
    <PlanBarEntry
      key={plan.id}
      plan={plan}
      selected={selected.has(plan.id)}
      isOnlySelected={selected.size === 1 && selected.has(plan.id)}
      ownerAvatar={!plan.mine ? renderOwnerAvatar(plan) : null}
      onToggle={() => toggle(plan.id)}
      onManage={() => {
        setOverflowOpen(false);
        onManage(plan.id);
      }}
      heading={heading}
    />
  );
  const firstShared = ordered.findIndex((plan) => !plan.mine);
  // An empty heading reserves the bar's label row; overflow omits it entirely.
  const barEntries = ordered.map((plan, index) =>
    entry(
      plan,
      index === 0 || index === firstShared ? groupLabel(plan.mine) : "",
    ),
  );
  return (
    <div
      aria-label="Planner plans"
      role="group"
      className="relative flex shrink-0 items-end gap-sm border-b border-separator bg-background px-md py-sm"
    >
      <div ref={available} className="min-w-0 flex-1">
        <div className="-m-xxs flex items-end gap-sm overflow-hidden p-xxs">
          {barEntries.slice(0, count)}
          {hidden.length ? (
            <Popover isOpen={overflowOpen} onOpenChange={setOverflowOpen}>
              <Button variant="secondary" className="shrink-0">
                <Ellipsis aria-hidden />
                <span className="tabular-nums">
                  {moreLabel(hiddenSelected)}
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
                        aria-label={groupLabel(mine)}
                        className="flex flex-col gap-sm py-sm"
                      >
                        <h2 className="text-sm">{groupLabel(mine)}</h2>
                        {group.map((plan) => entry(plan))}
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
      {onManageAll ? (
        <Button
          isIconOnly
          variant="ghost"
          className="shrink-0"
          aria-label="Manage plans"
          onPress={onManageAll}
        >
          <Settings aria-hidden />
        </Button>
      ) : null}
      <div
        aria-hidden
        inert
        className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden"
      >
        <div ref={measurements} className="flex w-max items-center gap-sm">
          {barEntries}
          <Button variant="secondary">
            <Ellipsis />
            <span className="tabular-nums">{moreLabel(plans.length)}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
