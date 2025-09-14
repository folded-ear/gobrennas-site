"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@heroui/button";
import { ButtonGroup } from "@heroui/react";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <ButtonGroup variant="flat">
      <Button isIconOnly onPress={() => setTheme("light")}>
        <Sun />
      </Button>
      <Button isIconOnly onPress={() => setTheme("dark")}>
        <Moon />
      </Button>
    </ButtonGroup>
  );
}
