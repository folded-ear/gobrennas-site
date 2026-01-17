"use client";

import { doLogout } from "@/app/(public)/constants";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { UserMenu } from "@/components/ui/user-menu";
import { Button, CloseButton } from "@heroui/react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export const BFSLogo = () => {
  return (
    <div className="flex items-center gap-2">
      <Link href="/recipes" className="flex items-center gap-2 text-foreground">
        <svg
          width="26"
          height="25"
          viewBox="0 0 26 25"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7.14667 13.6089L10.92 9.83554L1.56 0.488875C-0.52 2.56888 -0.52 5.94221 1.56 8.03554L7.14667 13.6089ZM16.1867 11.1955C18.2267 12.1422 21.0933 11.4755 23.2133 9.35554C25.76 6.80887 26.2533 3.15554 24.2933 1.19554C22.3467 -0.751125 18.6933 -0.271124 16.1333 2.27554C14.0133 4.39554 13.3467 7.26221 14.2933 9.30221L1.28 22.3155L3.16 24.1955L12.3467 15.0355L21.52 24.2089L23.4 22.3289L14.2267 13.1555L16.1867 11.1955Z"
            fill="#CC2400"
          />
        </svg>
        <span className="font-bold">BFS</span>
      </Link>
    </div>
  );
};

const navigationItems = [
  { name: "Recipes", href: "/recipes" },
  { name: "Planner", href: "/planner" },
  { name: "Pantry", href: "/pantry" },
  { name: "Shopping", href: "/shopping" },
];

export const Header = () => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    doLogout();
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="border-b border-divider bg-background">
      <nav className="mx-auto flex max-w-full items-center justify-between px-4 py-3">
        <BFSLogo />

        {/* Desktop Navigation Links */}
        <div className="hidden items-center gap-6 sm:flex">
          {navigationItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive ? "text-primary" : "text-foreground"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <Button
            isIconOnly
            variant="ghost"
            className="sm:hidden"
            onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>

          <div className="hidden sm:flex sm:items-center sm:gap-3">
            <ModeToggle />
            <UserMenu onLogout={handleLogout} />
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 sm:hidden"
            onClick={closeMobileMenu}
          />

          {/* Menu Panel */}
          <div className="fixed right-0 top-0 z-50 h-full w-64 bg-background shadow-lg sm:hidden">
            <div className="flex flex-col p-4">
              <CloseButton onPress={closeMobileMenu} />

              <nav className="flex flex-col gap-4">
                {navigationItems.map((item) => {
                  const isActive = pathname?.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-default-100 ${
                        isActive ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex gap-4">
                <ModeToggle />
                <UserMenu onLogout={handleLogout} />
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
};
