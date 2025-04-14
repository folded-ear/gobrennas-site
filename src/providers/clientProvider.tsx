"use client";

import { defaultTheme, Provider } from "@adobe/react-spectrum";
import { useRouter } from "next/navigation";

declare module "@adobe/react-spectrum" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export function ClientProviders({ children }) {
  let router = useRouter();

  return (
    <Provider theme={defaultTheme} router={{ navigate: router.push }}>
      {children}
    </Provider>
  );
}
