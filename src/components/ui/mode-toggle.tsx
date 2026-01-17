"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button, ButtonGroup } from "@heroui/react";

export function ModeToggle() {
  const { setTheme, systemTheme } = useTheme();

  const handleThemeChange = (theme: string) => {
    // Treat explicitly selecting the system theme not as a mandate, but as a
    // request to follow the system from now on.
    if (theme === systemTheme) theme = "system";
    setTheme(theme);
  };

  return (
    <ButtonGroup variant="tertiary">
      <Button isIconOnly onPress={() => handleThemeChange("light")}>
        <Sun />
      </Button>
      <Button isIconOnly onPress={() => handleThemeChange("dark")}>
        <Moon />
      </Button>
    </ButtonGroup>
  );
}
