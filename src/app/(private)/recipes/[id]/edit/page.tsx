export default async function RecipeEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ps = await params;

  return (
    <>
      <h1>oh hai!</h1>
      <pre>{JSON.stringify(ps, null, 3)}</pre>
    </>
  );
}
