"use client";

import PlanAvatar from "@/components/plan-avatar";
import { groupPlans, PlanGroup, PlanOption } from "@/components/plan-option";
import { SelectionMode } from "@/lib/plan-selection";
import { orderPlans } from "@/lib/plans";
import { Header, Key, ListBox, Select, Separator } from "@heroui/react";
import clsx from "clsx";
import { Fragment } from "react";
import { PlanPickerPlanFragment } from "./__generated__/planPickerPlan.generated";

type Plan = PlanPickerPlanFragment;

type PlanPickerProps = {
  /** Names me for assistive technology, e.g. "Plans". */
  label: string;
  plans: readonly Plan[];
  selectionMode: SelectionMode;
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
  hideSingleName?: boolean;
  /** A small, natural-width trigger with a dot for the selected plan. */
  compact?: boolean;
  /** Plans I list but don't let be picked. */
  disabledIds?: readonly string[];
};

type AvatarGroupProps = {
  label: string;
  plans: readonly Plan[];
};

/** Past this many avatars, a group stacks them, each half over the last. */
const MOST_SIDE_BY_SIDE = 3;

function AvatarGroup({ label, plans }: AvatarGroupProps) {
  if (plans.length === 0) return null;
  const stacked = plans.length > MOST_SIDE_BY_SIDE;
  return (
    <span
      role="group"
      aria-label={label}
      className={clsx("flex items-center", !stacked && "gap-xs")}
    >
      {plans.map((plan) => (
        <PlanAvatar
          key={plan.id}
          plan={plan}
          size="sm"
          // half of a small avatar's width, ringed so each edge stays clear
          className={clsx(stacked && "-ms-4 ring-2 ring-surface first:ms-0")}
        />
      ))}
    </span>
  );
}

type PlanSectionProps = {
  group: PlanGroup<Plan>;
  disabledIds: readonly string[];
};

function PlanSection({ group, disabledIds }: PlanSectionProps) {
  return (
    <ListBox.Section>
      <Header>{group.title}</Header>
      {group.plans.map((plan) => (
        <ListBox.Item
          key={plan.id}
          id={plan.id}
          textValue={plan.name}
          aria-label={plan.name}
          isDisabled={disabledIds.includes(plan.id)}
        >
          {({ isSelected, isDisabled }) => (
            <PlanOption
              plan={plan}
              selected={isSelected}
              disabled={isDisabled}
            />
          )}
        </ListBox.Item>
      ))}
    </ListBox.Section>
  );
}

/**
 * I pick one plan or several from those a user can reach, the user's own
 * apart from those shared with them. Each selected plan shows on my trigger
 * as its avatar. With fewer than two plans there's no choice, so I render
 * nothing.
 */
export function PlanPicker({
  label,
  plans,
  selectionMode,
  selectedIds,
  onChange,
  compact = false,
  // if not specified, default to compact
  hideSingleName = compact,
  disabledIds = [],
}: PlanPickerProps) {
  if (plans.length < 2) return null;

  const selected = orderPlans(plans).filter((it) =>
    selectedIds.includes(it.id),
  );
  const selectedMine = selected.filter((it) => it.mine);
  const selectedShared = selected.filter((it) => !it.mine);
  const single = selectionMode === "single";

  return (
    <Select
      className={compact ? "w-fit max-w-full shrink-0 sm:max-w-56" : undefined}
      aria-label={label}
      selectionMode={selectionMode}
      value={single ? (selectedIds[0] ?? null) : [...selectedIds]}
      onChange={(value) => {
        const keys: Key[] = Array.isArray(value)
          ? value
          : value == null
            ? []
            : [value];
        // A selection is never empty; the last plan can't be unpicked.
        if (keys.length > 0) onChange(keys.map(String));
      }}
    >
      <Select.Trigger className={compact ? "gap-sm" : undefined}>
        <Select.Value>
          <span className="flex min-w-0 items-center gap-xs">
            {compact && selected.length === 1 ? (
              <span aria-hidden className="inline-flex">
                <AvatarGroup label="My Plans" plans={selected} />
              </span>
            ) : (
              <>
                <AvatarGroup label="My Plans" plans={selectedMine} />
                {selectedMine.length > 0 && selectedShared.length > 0 ? (
                  <span aria-hidden className="h-5 w-px bg-separator" />
                ) : null}
                <AvatarGroup label="Shared Plans" plans={selectedShared} />
              </>
            )}
            {selected.length === 1 ? (
              <span
                className={clsx("truncate", {
                  hidden: hideSingleName,
                  "sm:block": hideSingleName,
                })}
              >
                {selected[0].name}
              </span>
            ) : null}
          </span>
        </Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox selectionMode={selectionMode} disallowEmptySelection>
          {groupPlans(plans).map((group, i) => (
            <Fragment key={group.title}>
              {i > 0 ? <Separator /> : null}
              <PlanSection group={group} disabledIds={disabledIds} />
            </Fragment>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
