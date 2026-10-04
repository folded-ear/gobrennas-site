import { ApolloClient, gql } from "@apollo/client";
import { MockLink } from "@apollo/client/testing";
import { toast } from "@heroui/react";
import { describe, expect, it } from "vitest";
import { buildInMemoryCache } from "./build-in-memory-cache";
import { failureToastLink } from "./failure-toast-link";

const RENAME_LABEL = gql`
  mutation renameLabel($id: ID!, $name: String!) {
    labels {
      rename(id: $id, name: $name) {
        id
        name
      }
    }
  }
`;

const LABEL = gql`
  query label($id: ID!) {
    label(id: $id) {
      id
      name
    }
  }
`;

const RENAME = { id: "12", name: "Weeknight" };

function clientAnswering(mock: MockLink.MockedResponse) {
  return new ApolloClient({
    cache: buildInMemoryCache(),
    link: failureToastLink.concat(new MockLink([mock])),
  });
}

const RENAME_REQUEST = { query: RENAME_LABEL, variables: RENAME };

function toasts() {
  return toast.getQueue().visibleToasts.map(({ content }) => content);
}

const GENERIC = {
  title: "Couldn’t save your change",
  description: "Please try again.",
  variant: "danger",
};

describe("failureToastLink", () => {
  it("toasts a mutation that fails on the network", async () => {
    const client = clientAnswering({
      request: RENAME_REQUEST,
      error: new Error("Failed to fetch"),
    });

    await expect(
      client.mutate({ mutation: RENAME_LABEL, variables: RENAME }),
    ).rejects.toThrow();

    expect(toasts()).toEqual([expect.objectContaining(GENERIC)]);
  });

  it("toasts a mutation that comes back with GraphQL errors", async () => {
    const client = clientAnswering({
      request: RENAME_REQUEST,
      result: { errors: [{ message: "Label not found" }] },
    });

    await expect(
      client.mutate({ mutation: RENAME_LABEL, variables: RENAME }),
    ).rejects.toThrow();

    expect(toasts()).toEqual([expect.objectContaining(GENERIC)]);
  });

  it("doesn't toast a mutation whose caller reports its own failure", async () => {
    const client = clientAnswering({
      request: RENAME_REQUEST,
      error: new Error("Failed to fetch"),
    });

    await expect(
      client.mutate({
        mutation: RENAME_LABEL,
        variables: RENAME,
        context: { failureToast: false },
      }),
    ).rejects.toThrow();

    expect(toasts()).toEqual([]);
  });

  it("doesn't toast an aborted mutation", async () => {
    const client = clientAnswering({
      request: RENAME_REQUEST,
      error: new DOMException("The operation was aborted.", "AbortError"),
    });

    await expect(
      client.mutate({ mutation: RENAME_LABEL, variables: RENAME }),
    ).rejects.toThrow();

    expect(toasts()).toEqual([]);
  });

  it("doesn't toast a failed query", async () => {
    const client = clientAnswering({
      request: { query: LABEL, variables: { id: RENAME.id } },
      error: new Error("Failed to fetch"),
    });

    await expect(
      client.query({ query: LABEL, variables: { id: RENAME.id } }),
    ).rejects.toThrow();

    expect(toasts()).toEqual([]);
  });
});
