import { BFSLogoMark } from "@/components/bfs-logo-mark";
import Link from "next/link";

type BFSLogoProps = {
  size?: "sm" | "lg";
  collapsed?: boolean;
};

export const BFSLogo = ({ collapsed = true, size = "sm" }: BFSLogoProps) => {
  const logoSize = size === "sm" ? 25 : 50;
  return (
    <Link href="/recipes" className="flex items-center gap-2 text-foreground">
      <BFSLogoMark width={logoSize} height={logoSize} className="shrink-0" />
      {!collapsed && <span className="font-bold">BFS</span>}
    </Link>
  );
};
