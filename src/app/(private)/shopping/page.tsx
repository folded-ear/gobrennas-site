import { Shopping } from "@/features/shopping/shopping";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shopping List",
  description: "...",
};

export default function ShoppingView() {
  return <Shopping />;
}
