"use client";

import PlanAvatar from "@/components/plan-avatar";
import { Header, Key, Label, ListBox, Select, Separator } from "@heroui/react";
import clsx from "clsx";
import { PlanPickerPlanFragment } from "./__generated__/planPickerPlan.generated";
import { pickerOrder, SelectionMode } from "./selection";

type Plan = PlanPickerPlanFragment;

type PlanPickerProps = {
  /** Names me for assistive technology, e.g. "Plans". */
  label: string;
  plans: readonly Plan[];
  selectionMode: SelectionMode;
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
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
  title: string;
  plans: readonly Plan[];
};

function PlanSection({ title, plans }: PlanSectionProps) {
  return (
    <ListBox.Section>
      <Header>{title}</Header>
      {plans.map((plan) => (
        <ListBox.Item key={plan.id} id={plan.id} textValue={plan.name}>
          <PlanAvatar plan={plan} size="sm" aria-hidden />
          <Label>{plan.name}</Label>
          <ListBox.ItemIndicator />
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
}: PlanPickerProps) {
  if (plans.length < 2) return null;

  const mine = plans.filter((it) => it.mine);
  const shared = plans.filter((it) => !it.mine);
  const selected = pickerOrder(plans).filter((it) =>
    selectedIds.includes(it.id),
  );
  const selectedMine = selected.filter((it) => it.mine);
  const selectedShared = selected.filter((it) => !it.mine);
  const single = selectionMode === "single";

  return (
    <Select
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
      <Select.Trigger>
        <Select.Value>
          <span className="flex items-center gap-xs">
            <AvatarGroup label="My Plans" plans={selectedMine} />
            {selectedMine.length > 0 && selectedShared.length > 0 ? (
              <span aria-hidden className="h-5 w-px bg-separator" />
            ) : null}
            <AvatarGroup label="Shared Plans" plans={selectedShared} />
            {selected.length === 1 ? (
              <span className="truncate">{selected[0].name}</span>
            ) : null}
          </span>
        </Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox selectionMode={selectionMode} disallowEmptySelection>
          {mine.length > 0 ? (
            <PlanSection title="My Plans" plans={mine} />
          ) : null}
          {mine.length > 0 && shared.length > 0 ? <Separator /> : null}
          {shared.length > 0 ? (
            <PlanSection title="Shared Plans" plans={shared} />
          ) : null}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
