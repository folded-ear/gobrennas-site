import { graphqlUri } from "@/app/(public)/constants";
import { ErrorFallback } from "@/components/error-fallback";
import { getUserProfile } from "@/data-rsc/get-user-profile";
import { ApolloWrapper } from "@/lib/apollo-browser-and-ssr";
import { ThemeProvider } from "@/providers/theme-provider";
import type { Metadata, Viewport } from "next";
import { CookiesProvider } from "next-client-cookies/server";
import { ErrorBoundary } from "react-error-boundary";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Brenna's Food Software", template: "%s :: BFS" },
  description: "Your _face_ is a food software!",
};

export const viewport: Viewport = {
  userScalable: false,
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  themeColor: "#F57F17", // duplicated in styles
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [gqlUri, profileQuery] = await Promise.all([
    graphqlUri(),
    getUserProfile(),
  ]);
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="bg-background text-foreground h-full">
        <CookiesProvider>
          <ApolloWrapper graphqlUri={gqlUri} profileQuery={profileQuery}>
            <ThemeProvider>
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                {children}
              </ErrorBoundary>
            </ThemeProvider>
          </ApolloWrapper>
        </CookiesProvider>
      </body>
    </html>
  );
}
