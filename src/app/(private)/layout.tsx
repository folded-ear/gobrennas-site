"use client";

import { doLogout } from "@/app/(public)/constants";
import { Header } from "@/components/views/header";
import { Book, Calendar } from "lucide-react";
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
    doLogout();
  };

  return (
    <div className="h-dvh">
      <Header />
      <main>{children}</main>
      {/*<nav className="flex flex-col gap-y-sm">*/}
      {/*  <h1 className="text-xl">BFS</h1>*/}
      {/*  {primaryNav.map((nav) => (*/}
      {/*    <div key={nav.label} className="flex">*/}
      {/*      {nav.icon} <Link href={nav.href}>{nav.label}</Link>*/}
      {/*    </div>*/}
      {/*  ))}*/}
      {/*  <Button variant="ghost" onPress={handleLogout}>*/}
      {/*    <LogOut />*/}
      {/*  </Button>*/}
      {/*</nav>*/}
      {/*<main className="p-lg">*/}
      {/*  <SearchField />*/}
      {/*  {children}*/}
      {/*</main>*/}
      {/*<div className="border-3 border-green-600"></div>*/}
    </div>
  );
}
