import { AddIcon, ExpandDownIcon, ExpandUpIcon } from "@/components/icons";
import { Button } from "@heroui/react";
import { useState } from "react";

export const Section = ({
  title,
  children,
  defaultExpanded = true,
  onAdd,
  isCollapsed,
}: {
  title: string;
  children?: React.ReactNode;
  defaultExpanded?: boolean;
  onAdd?: () => void;
  isCollapsed?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-md border-b-1 py-md">
        {children}
      </div>
    );
  }

  return (
    <div className="mb-1">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex flex-1 items-center py-2 gap-1 text-xs text-foreground/70 hover:text-foreground"
        >
          <span>{title}</span>
          {isExpanded ? (
            <ExpandUpIcon size="tiny" />
          ) : (
            <ExpandDownIcon size="tiny" />
          )}
        </button>
        {onAdd && (
          <Button isIconOnly variant="secondary" size="sm" onPress={onAdd}>
            <AddIcon />
          </Button>
        )}
      </div>
      {isExpanded && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  );
};
