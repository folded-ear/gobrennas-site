import { query } from "@/lib/apollo-rsc";
import { cache } from "react";
import { GetRecipeMetaRscDocument } from "./__generated__/getRecipeMetaRsc.generated";

export const getRecipeMetadata = cache(async (id: string, secret?: string) => {
  const { data } = await query({
    query: GetRecipeMetaRscDocument,
    variables: { id, secret },
  });
  if (!data) throw new TypeError(`Failed to get metadata for recipe '${id}'`);
  return data.library.getRecipeById;
});
