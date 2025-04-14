"use client";

import { Link, View } from "@adobe/react-spectrum";
import { Book, Calendar } from "lucide-react";
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
    <View>
      <div className="flex p-4 bg-surface">
        <div className="flex-1 gap-md">
          <nav className="flex gap-sm">
            {primaryNav.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <nav className="flex gap-sm">
            <Link
              href={process.env.NEXT_PUBLIC_API_BASE_URL + "/oauth2/logout"}
            >
              Logout
            </Link>
          </nav>
        </div>
      </div>

      {children}
    </View>
  );
}
