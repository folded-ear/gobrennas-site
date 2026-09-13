type RecipeEditProps = {
  id: string;
};

export function RecipeEdit({ id }: RecipeEditProps) {
  return (
    <>
      <h1>oh hai!</h1>
      <pre>{JSON.stringify({ id }, null, 3)}</pre>
    </>
  );
}
