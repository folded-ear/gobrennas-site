import { Pantry } from "@/features/pantry/pantry";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pantry Management",
  description: "...",
};

export default function PantryView() {
  return <Pantry />;
}
