"use client";

import PlanAvatar from "@/components/plan-avatar";
import { Header, Key, Label, ListBox, Select, Separator } from "@heroui/react";
import { PlanPickerPlanFragment } from "./__generated__/planPickerPlan.generated";
import { SelectionMode } from "./selection";

type Plan = PlanPickerPlanFragment;

type PlanPickerProps = {
  /** Names me for assistive technology, e.g. "Plans". */
  label: string;
  plans: readonly Plan[];
  selectionMode: SelectionMode;
  selectedIds: readonly string[];
  onChange: (ids: string[]) => void;
};

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
  const selected = plans.filter((it) => selectedIds.includes(it.id));
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
            {selected.map((plan) => (
              <PlanAvatar key={plan.id} plan={plan} size="sm" />
            ))}
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
