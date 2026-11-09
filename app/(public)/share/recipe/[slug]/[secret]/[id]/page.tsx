import { getRecipeMetadata } from "@/data-rsc/get-recipe-metadata";
import { isAuthenticated } from "@/data-rsc/is-authenticated";
import { SharedRecipe } from "@/screens/shared-recipe";
import { CombinedGraphQLErrors } from "@apollo/client";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type Params = {
  slug: string;
  secret: string;
  id: string;
};

type PageProps = {
  params: Promise<Params>;
};

async function findSharedRecipe(id: string, secret: string) {
  try {
    return await getRecipeMetadata(id, secret);
  } catch (error) {
    // The API answers a wrong secret or a missing recipe with an error.
    if (CombinedGraphQLErrors.is(error)) notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id, secret } = await params;
  const { name: title } = await findSharedRecipe(id, secret);
  return {
    title,
  };
}

export default async function SharedRecipePage({ params }: PageProps) {
  const { id, secret } = await params;
  if (await isAuthenticated()) redirect(`/recipes/${encodeURIComponent(id)}`);
  await findSharedRecipe(id, secret);
  return <SharedRecipe id={id} secret={secret} />;
}
