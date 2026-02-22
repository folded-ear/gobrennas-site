import { PropsWithChildren } from "react";

export const Container = ({ children }: PropsWithChildren) => {
  return (
    <div className="flex-1 p-md justify-center items-center">{children}</div>
  );
};
