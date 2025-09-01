"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@heroui/button";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <div className="flex">
      <Button onPress={() => setTheme("light")}>
        <Sun />
      </Button>
      <Button onPress={() => setTheme("dark")}>
        <Moon />
      </Button>
    </div>
  );
}
