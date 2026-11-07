import { type AccessLevel } from "@/__generated__/graphql";
import { ACCESS_LEVELS } from "@/lib/plans";
import { ListBox, Select } from "@heroui/react";

/** I choose an access level to a plan. */
export function LevelSelect({
  label,
  value,
  isDisabled = false,
  onChange,
}: {
  /** Names me for assistive technology, e.g. "Access for Pat". */
  label: string;
  value: AccessLevel;
  isDisabled?: boolean;
  onChange: (level: AccessLevel) => void;
}) {
  return (
    <Select
      aria-label={label}
      className="w-36 shrink-0"
      value={value}
      isDisabled={isDisabled}
      onChange={(key) => {
        const chosen = ACCESS_LEVELS.find((it) => it.level === key);
        if (chosen) onChange(chosen.level);
      }}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {ACCESS_LEVELS.map((it) => (
            <ListBox.Item key={it.level} id={it.level} textValue={it.label}>
              {it.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
