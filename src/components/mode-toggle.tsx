"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <div className="flex">
      <Button variant="outline" size="icon" onPress={() => setTheme("light")}>
        <Sun />
      </Button>
      <Button variant="outline" size="icon" onPress={() => setTheme("dark")}>
        <Moon />
      </Button>
    </div>
  );
}
