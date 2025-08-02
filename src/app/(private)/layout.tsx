"use client";

import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { Book, Calendar, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";

export default function PrivateLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();

  const primaryNav = [
    {
      label: "Recipes",
      href: "/recipes",
      icon: <Book />,
      active: pathname === "/recipes",
    },
    {
      label: "Planner",
      href: "/planner",
      icon: <Calendar />,
      active: pathname === "/planner",
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    window.location.href = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/oauth2/logout`;
  };

  return (
    <div className="grid grid-cols-[150px_minmax(400px,_1fr)_min-content] gap-xs h-dvh">
      <nav className="flex flex-col gap-y-sm">
        <h1 className="text-xl">BFS</h1>
        {primaryNav.map((nav) => (
          <div key={nav.label} className="flex">
            {nav.icon} <Link href={nav.href}>{nav.label}</Link>
          </div>
        ))}
        <Button variant="ghost" onPress={handleLogout}>
          <LogOut />
        </Button>
      </nav>
      <main className="p-lg">
        <SearchField />
        {children}
      </main>
      <div className="border-3 border-green-600"></div>
    </div>
  );
}
