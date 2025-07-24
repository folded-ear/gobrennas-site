import { ClientProviders } from "@/providers/clientProvider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brenna's Food Software",
  description: "Your _face_ is a food software!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="h-full">
        <ClientProviders>
          <div className="flex flex-col">
            <main className="flex-1">{children}</main>
            <footer className="sticky bottom-0 flex gap-[24px] flex-wrap items-center justify-center">
              proudfeet
            </footer>
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
