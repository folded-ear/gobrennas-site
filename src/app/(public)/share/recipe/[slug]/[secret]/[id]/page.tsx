import BarePage from "@/components/ui/layout/bare-page";

interface Params {
  slug: string;
  secret: string;
  id: string;
}

interface Props {
  params: Promise<Params>;
}

export default async function SharedRecipe({ params }: Props) {
  const ps = await params;
  return (
    <BarePage>
      <h1>oh hai!</h1>
      <pre>{JSON.stringify(ps, null, 3)}</pre>
    </BarePage>
  );
}
