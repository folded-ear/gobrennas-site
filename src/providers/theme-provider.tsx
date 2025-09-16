"use client";

import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { PropsWithChildren } from "react";

export function ThemeProvider({ children }: PropsWithChildren) {
  return (
    <HeroUIProvider>
      <NextThemesProvider
        attribute="class"
        enableSystem
        storageKey="nextJsTheme"
      >
        {children}
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
