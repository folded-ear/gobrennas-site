import Link from "next/link";

type BFSLogoProps = {
  size?: "sm" | "lg";
  collapsed?: boolean;
};

export const BFSLogo = ({ collapsed = true, size = "sm" }: BFSLogoProps) => {
  const logoSize = size === "sm" ? 25 : 50;
  return (
    <Link href="/recipes" className="flex items-center gap-2 text-foreground">
      <svg
        width={logoSize}
        height={logoSize}
        viewBox="0 0 26 25"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path
          d="M7.14667 13.6089L10.92 9.83554L1.56 0.488875C-0.52 2.56888 -0.52 5.94221 1.56 8.03554L7.14667 13.6089ZM16.1867 11.1955C18.2267 12.1422 21.0933 11.4755 23.2133 9.35554C25.76 6.80887 26.2533 3.15554 24.2933 1.19554C22.3467 -0.751125 18.6933 -0.271124 16.1333 2.27554C14.0133 4.39554 13.3467 7.26221 14.2933 9.30221L1.28 22.3155L3.16 24.1955L12.3467 15.0355L21.52 24.2089L23.4 22.3289L14.2267 13.1555L16.1867 11.1955Z"
          fill="#CC2400"
          style={{ fill: "var(--accent)" }}
        />
      </svg>
      {!collapsed && <span className="font-bold">BFS</span>}
    </Link>
  );
};
