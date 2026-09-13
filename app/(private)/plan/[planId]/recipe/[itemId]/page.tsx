import { Cook } from "@/screens/cook";

type PageProps = {
  params: Promise<{ planId: string; itemId: string }>;
};

export default async function CookPage({ params }: PageProps) {
  const { planId, itemId } = await params;
  return <Cook planId={planId} itemId={itemId} />;
}
