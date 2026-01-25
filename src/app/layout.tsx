import { graphqlUri } from "@/app/(public)/constants";
import ErrorFallback from "@/components/views/error-fallback";
import { ApolloWrapper } from "@/lib/apollo-wrapper";
import { ThemeProvider } from "@/providers/theme-provider";
import type { Metadata } from "next";
import { CookiesProvider } from "next-client-cookies/server";
import { ErrorBoundary } from "react-error-boundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brenna's Food Software",
  description: "Your _face_ is a food software!",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background">
        <CookiesProvider>
          <ApolloWrapper graphqlUri={await graphqlUri()}>
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
