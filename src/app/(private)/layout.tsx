"use client";

import { Button } from "@/components/ui/button";
import { Book, Calendar } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <div>
      <div className="flex p-4 bg-surface">
        <div className="flex-1 gap-md">
          <nav className="flex gap-sm">
            {primaryNav.map((item) => (
              <Button asChild>
                <Link key={item.label} href={item.href}>
                  {item.label}
                </Link>
              </Button>
            ))}
          </nav>
        </div>
        <div>
          <nav className="flex gap-sm">
            <Button asChild>
              <Link
                href={process.env.NEXT_PUBLIC_API_BASE_URL + "/oauth2/logout"}
              >
                Logout
              </Link>
            </Button>
          </nav>
        </div>
      </div>

      {children}
    </div>
  );
}
