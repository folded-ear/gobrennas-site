"use client";

import { doLogout } from "@/app/(public)/constants";
import { HeaderInternal } from "@/components/layout/header/header-internal";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { UserMenu } from "@/components/ui/user-menu";
import { Button, CloseButton } from "@heroui/react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
    <HeaderInternal
      navChildren={
        <>
          {/* Desktop Navigation Links */}
          <div className="hidden items-center gap-6 sm:flex">
            {navigationItems.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-accent ${
                    isActive ? "text-accent" : "text-foreground"
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
        </>
      }
      headerChildren={
        /* Mobile Menu */
        isMobileMenuOpen && (
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
                          isActive ? "text-accent" : "text-foreground"
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
        )
      }
    />
  );
};
