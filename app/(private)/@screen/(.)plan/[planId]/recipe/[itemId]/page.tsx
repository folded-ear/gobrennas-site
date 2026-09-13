import { Screen } from "@/components/screen";
import { Cook } from "@/screens/cook";

type PageProps = {
  params: Promise<{ planId: string; itemId: string }>;
};

export default async function CookScreen({ params }: PageProps) {
  const { planId, itemId } = await params;
  return (
    <Screen label="Cook view">
      <Cook planId={planId} itemId={itemId} />
    </Screen>
  );
}
