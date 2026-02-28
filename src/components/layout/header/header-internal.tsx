import Link from "next/link";
import { ReactNode } from "react";

const BFSLogo = () => {
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
            style={{ fill: "var(--accent)" }}
          />
        </svg>
        <span className="font-bold">BFS</span>
      </Link>
    </div>
  );
};

type HeaderInternalProps = {
  navChildren?: ReactNode;
  headerChildren?: ReactNode;
};

export const HeaderInternal = ({
  navChildren,
  headerChildren,
}: HeaderInternalProps) => {
  return (
    <header className="border-b border-divider bg-background">
      <nav className="mx-auto flex max-w-full items-center justify-between px-4 py-3">
        <BFSLogo />
        {navChildren}
      </nav>
      {headerChildren}
    </header>
  );
};
