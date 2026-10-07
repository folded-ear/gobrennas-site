import { PropsWithChildren } from "react";

type ButtonBarProps = PropsWithChildren<{
  id: string;
}>;

export function RecipeActionBar({ id, children }: ButtonBarProps) {
  return <div className="flex gap-xxs px-xxs">{children}</div>;
}
