"use server";

import { Header } from "@/components/views/header";
import { GET_PROFILE } from "@/data/get-profile";
import { PreloadQuery } from "@/lib/apollo-client";
import { PropsWithChildren } from "react";

export default async function PrivateLayout({ children }: PropsWithChildren) {
  return (
    <PreloadQuery query={GET_PROFILE} variables={{}}>
      <div className="h-dvh">
        <Header />
        <main>{children}</main>
      </div>
    </PreloadQuery>
  );
}
