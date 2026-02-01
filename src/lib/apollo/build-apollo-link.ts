import {
  ApolloLink,
  CombinedGraphQLErrors,
  CombinedProtocolErrors,
  HttpLink,
  ServerError,
  ServerParseError,
} from "@apollo/client";
import { ErrorLink } from "@apollo/client/link/error";

export function buildApolloLink(tag: string, ...links: ApolloLink[]) {
  // clone first
  links = links.slice(0);

  // log every operation right off the bat
  links.unshift(
    new ApolloLink((operation, forward) => {
      console.log(`[Operation - ${tag}]:`, operation);
      return forward(operation);
    }),
  );

  // add error logging right before the HttpLink
  const httpIdx = links.findIndex((it) => it instanceof HttpLink);
  links.splice(
    httpIdx,
    0,
    new ErrorLink(({ error }) => {
      if (CombinedGraphQLErrors.is(error)) {
        error.errors.forEach(({ extensions, message, locations, path }) => {
          console.log(
            `[GraphQL error - ${tag}]: Message: ${message}, Location: ${locations}, Path: ${path}, Extensions: ${JSON.stringify(
              extensions,
            )}`,
          );
        });
      } else if (CombinedProtocolErrors.is(error)) {
        error.errors.forEach(({ message, extensions }) =>
          console.log(
            `[Protocol error - ${tag}]: Message: ${message}, Extensions: ${JSON.stringify(
              extensions,
            )}`,
          ),
        );
      } else if (ServerError.is(error)) {
        console.error(`[Server error - ${tag}]: ${error}`, error.statusCode);
      } else if (ServerParseError.is(error)) {
        console.error(`[Parse error - ${tag}]: ${error}`, error.statusCode);
      } else {
        console.error(`[Network error - ${tag}]: ${error}`);
      }
    }),
  );

  // assemble the final link
  return ApolloLink.from(links);
}
