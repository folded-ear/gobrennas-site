"use client";

import { Input, Label, Switch } from "@heroui/react";
import { Search, X } from "lucide-react";

interface RecipeFilterProps {
  query: string;
  onQueryChange: (query: string) => void;
  includeOthers: boolean;
  onIncludeOthersChange: (includeOthers: boolean) => void;
}

export function RecipeFilter({
  query,
  onQueryChange,
  includeOthers,
  onIncludeOthersChange,
}: RecipeFilterProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted"
          aria-hidden
        />
        <Input
          className="w-full pl-9 pr-9"
          placeholder="Search recipes..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Search recipes"
          type="search"
        />
        {query && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      <Switch isSelected={includeOthers} onChange={onIncludeOthersChange}>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Label className="text-sm">Everyone&apos;s Recipes</Label>
      </Switch>
    </div>
  );
}
