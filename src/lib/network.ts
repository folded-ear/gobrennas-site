import type { TypedDocumentString } from "@/__graphql/graphql";
import { verifyToken } from "@/lib/data";
import { cookies } from "next/headers";

export async function fetchGraphQL<TResult, TVariables>(
  query: TypedDocumentString<TResult, TVariables>,
  ...[variables]: TVariables extends Record<string, never> ? [] : [TVariables]
): Promise<TResult | null> {
  const token = await verifyToken();
  if (!token.isAuthed) return null;

  const kookies = await cookies();

  try {
    const body = JSON.stringify({
      query,
      variables,
    });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/graphql`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `FTOKEN=${kookies.get("FTOKEN")?.value}`,
        },
        body,
        cache: "default",
        mode: "cors",
        credentials: "include",
      },
    );

    if (!response.ok) {
      console.error("Response Status:", response);
      throw new Error(response.statusText);
    }

    const data = await response.json();

    if (data.errors) {
      console.error("GraphQL Errors:", data.errors);
      throw new Error("Error executing GraphQL query");
    }

    return data.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
