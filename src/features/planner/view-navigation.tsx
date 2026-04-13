"use client";

import { Button, ButtonGroup } from "@heroui/react";
import { Calendar, CalendarDays, List } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const VIEWS = [
  { id: "list", label: "List", icon: List, path: "/planner/list" },
  {
    id: "schedule",
    label: "Schedule",
    icon: CalendarDays,
    path: "/planner/schedule",
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: Calendar,
    path: "/planner/calendar",
  },
] as const;

export function ViewNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <ButtonGroup size="sm" variant="ghost">
      {VIEWS.map(({ id, label, icon: Icon, path }) => (
        <Button
          key={id}
          variant={pathname === path ? "primary" : "ghost"}
          onPress={() => router.push(path)}
        >
          <Icon size={16} />
          {label}
        </Button>
      ))}
    </ButtonGroup>
  );
}
