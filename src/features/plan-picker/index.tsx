"use client";

import PlanAvatar from "@/components/plan-avatar";
import { groupPlans, PlanGroup, PlanOption } from "@/components/plan-option";
import { SelectionMode } from "@/lib/plan-selection";
import { orderPlans } from "@/lib/plans";
import { Button, Header, Key, ListBox, Select, Separator } from "@heroui/react";
import { selectVariants } from "@heroui/styles";
import clsx from "clsx";
import { Fragment, useId, useRef, useState, type RefObject } from "react";
import { PlanPickerPlanFragment } from "./__generated__/planPickerPlan.generated";
import { layoutTriggerSide, type OwnAvatar } from "./trigger-layout";

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

export const LAST_PLAN_HINT = "At least one plan must stay selected.";

/** Hides a fill avatar on screens too narrow for the row it fills out. */
const HIDDEN_BY_FILL_SLOT: Readonly<Record<number, string>> = {
  3: "max-md:hidden",
  4: "max-lg:hidden",
};

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

type PlanOptionsProps = {
  plans: readonly Plan[];
  selectionMode: SelectionMode;
  disabledIds: readonly string[];
  triggerRef?: RefObject<HTMLElement | null>;
};

function PlanOptions({
  plans,
  selectionMode,
  disabledIds,
  triggerRef,
}: PlanOptionsProps) {
  return (
    <Select.Popover triggerRef={triggerRef}>
      <ListBox selectionMode={selectionMode} disallowEmptySelection>
        {groupPlans(plans).map((group, i) => (
          <Fragment key={group.title}>
            {i > 0 ? <Separator /> : null}
            <PlanSection group={group} disabledIds={disabledIds} />
          </Fragment>
        ))}
      </ListBox>
    </Select.Popover>
  );
}

function selectionKeys(value: Key | Key[] | null) {
  const keys = Array.isArray(value) ? value : value == null ? [] : [value];
  return keys.map(String);
}

function SinglePlanPicker({
  label,
  plans,
  selectedIds,
  onChange,
  compact,
  hideSingleName,
  disabledIds,
}: Required<Omit<PlanPickerProps, "selectionMode">>) {
  const selected = plans.find((it) => it.id === selectedIds[0]);
  return (
    <Select
      className={compact ? "w-fit max-w-full shrink-0 sm:max-w-56" : undefined}
      aria-label={label}
      selectionMode="single"
      value={selectedIds[0] ?? null}
      onChange={(value) => {
        const ids = selectionKeys(value);
        // A selection is never empty; the last plan can't be unpicked.
        if (ids.length > 0) onChange(ids);
      }}
    >
      <Select.Trigger className={compact ? "gap-sm" : undefined}>
        <Select.Value>
          {selected ? (
            <span className="flex min-w-0 items-center gap-xs">
              <PlanAvatar
                plan={selected}
                size="sm"
                aria-hidden={compact || undefined}
              />
              <span
                className={clsx("truncate", {
                  hidden: hideSingleName,
                  "sm:block": hideSingleName,
                })}
              >
                {selected.name}
              </span>
            </span>
          ) : null}
        </Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <PlanOptions
        plans={plans}
        selectionMode="single"
        disabledIds={disabledIds}
      />
    </Select>
  );
}

type PlanToggleProps = {
  avatar: OwnAvatar<Plan>;
  selected: boolean;
  isDisabled: boolean;
  isOnlySelected: boolean;
  onToggle: () => void;
};

function PlanToggle({
  avatar: { plan, fillSlot },
  selected,
  isDisabled,
  isOnlySelected,
  onToggle,
}: PlanToggleProps) {
  const hintId = useId();
  return (
    <span
      className={clsx(
        "pointer-events-auto inline-flex",
        fillSlot === undefined ? undefined : HIDDEN_BY_FILL_SLOT[fillSlot],
      )}
    >
      {isOnlySelected ? (
        <span id={hintId} className="sr-only">
          {LAST_PLAN_HINT}
        </span>
      ) : null}
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        className="rounded-full"
        aria-label={plan.name}
        aria-pressed={selected}
        aria-describedby={isOnlySelected ? hintId : undefined}
        isDisabled={isDisabled || isOnlySelected}
        onPress={onToggle}
      >
        <PlanAvatar plan={plan} selected={selected} size="sm" aria-hidden />
      </Button>
    </span>
  );
}

function MultiplePlanPicker({
  label,
  plans,
  selectedIds,
  onChange,
  hideSingleName,
  disabledIds,
}: Required<Omit<PlanPickerProps, "selectionMode" | "compact">>) {
  const [recentIds, setRecentIds] = useState<readonly string[]>([]);
  const [isOpen, setOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const change = (ids: string[]) => {
    const toggled = [
      ...ids.filter((id) => !selectedIds.includes(id)),
      ...selectedIds.filter((id) => !ids.includes(id)),
    ];
    setRecentIds((recent) => [
      ...toggled,
      ...recent.filter((id) => !toggled.includes(id)),
    ]);
    onChange(ids);
  };
  const toggle = (id: string) =>
    change(
      selectedIds.includes(id)
        ? selectedIds.filter((it) => it !== id)
        : [...selectedIds, id],
    );

  const sides = groupPlans(orderPlans(plans))
    .map((group) => ({
      title: group.title,
      ...layoutTriggerSide(group.plans, selectedIds, recentIds),
    }))
    .filter((side) => side.own.length + side.stacked.length > 0);
  const shown = sides.flatMap((side) => [
    ...side.own.map((it) => it.plan),
    ...side.stacked,
  ]);
  const onlyShown = shown.length === 1 ? shown[0] : undefined;

  return (
    // Select's trigger styles draw the box; the real trigger lies invisibly across it
    <div
      ref={rowRef}
      role="group"
      aria-label={label}
      className={clsx(
        selectVariants().trigger(),
        "min-w-0 has-[[data-slot=select-trigger][data-focus-visible=true]]:status-focused",
      )}
    >
      <Select
        className="absolute inset-0"
        aria-label={label}
        selectionMode="multiple"
        value={[...selectedIds]}
        isOpen={isOpen}
        onOpenChange={setOpen}
        onChange={(value) => {
          const ids = selectionKeys(value);
          // A selection is never empty; the last plan can't be unpicked.
          if (ids.length > 0) change(ids);
        }}
      >
        <Select.Trigger className="size-full opacity-0" />
        <Select.Indicator className="pointer-events-none" />
        <PlanOptions
          plans={plans}
          selectionMode="multiple"
          disabledIds={disabledIds}
          triggerRef={rowRef}
        />
      </Select>
      <span className="pointer-events-none relative flex min-w-0 items-center gap-xs">
        {sides.map((side, i) => (
          <Fragment key={side.title}>
            {i > 0 ? (
              <span aria-hidden className="h-5 w-px bg-separator" />
            ) : null}
            <span
              role="group"
              aria-label={side.title}
              className="flex items-center gap-xs"
            >
              {side.own.map((avatar) => (
                <PlanToggle
                  key={avatar.plan.id}
                  avatar={avatar}
                  selected={selectedIds.includes(avatar.plan.id)}
                  isDisabled={disabledIds.includes(avatar.plan.id)}
                  isOnlySelected={
                    selectedIds.length === 1 &&
                    selectedIds[0] === avatar.plan.id
                  }
                  onToggle={() => toggle(avatar.plan.id)}
                />
              ))}
              {side.stacked.length > 0 ? (
                <span
                  role="img"
                  aria-label={side.stacked.map((it) => it.name).join(", ")}
                  className="flex"
                >
                  {side.stacked.map((plan) => (
                    <PlanAvatar
                      key={plan.id}
                      plan={plan}
                      size="sm"
                      aria-hidden
                      // half of a small avatar's width, ringed so each edge stays clear
                      className="-ms-4 ring-2 ring-field first:ms-0"
                    />
                  ))}
                </span>
              ) : null}
            </span>
          </Fragment>
        ))}
        {onlyShown ? (
          <span
            className={clsx("truncate", {
              hidden: hideSingleName,
              "sm:block": hideSingleName,
            })}
          >
            {onlyShown.name}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/**
 * I pick one plan or several from those a user can reach, the user's own
 * apart from those shared with them. With fewer than two plans there's no
 * choice, so I render nothing.
 *
 * Picking one plan, my trigger shows the selected plan's avatar. Picking
 * several, each plan beside my trigger toggles from its own avatar: the
 * selected plans, and the plans toggled recently, unselected ones as rings.
 * Past three selected plans, the rest stack, opening my list.
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
  return selectionMode === "multiple" ? (
    <MultiplePlanPicker
      label={label}
      plans={plans}
      selectedIds={selectedIds}
      onChange={onChange}
      hideSingleName={hideSingleName}
      disabledIds={disabledIds}
    />
  ) : (
    <SinglePlanPicker
      label={label}
      plans={plans}
      selectedIds={selectedIds}
      onChange={onChange}
      compact={compact}
      hideSingleName={hideSingleName}
      disabledIds={disabledIds}
    />
  );
}
