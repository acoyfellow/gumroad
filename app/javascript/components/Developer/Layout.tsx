import { Link } from "@inertiajs/react";
import * as React from "react";

import { PageHeader } from "$app/components/ui/PageHeader";
import { Tabs, Tab } from "$app/components/ui/Tabs";

const pageNames = {
  widgets: "Widgets",
  ping: "Ping",
  api: "API",
};
export type Page = keyof typeof pageNames;

type Props = {
  currentPage: Page;
  children: React.ReactNode;
};

export const Layout = ({ currentPage, children }: Props) => (
  <div>
    <PageHeader title={pageNames[currentPage]}>
      <Tabs>
        <Tab isSelected={currentPage === "widgets"} asChild>
          <Link href={Routes.widgets_path()}>Widgets</Link>
        </Tab>
        <Tab isSelected={currentPage === "ping"} asChild>
          <Link href={Routes.ping_path()}>Ping</Link>
        </Tab>
        <Tab isSelected={currentPage === "api"} asChild>
          <Link href={Routes.api_path()}>API</Link>
        </Tab>
      </Tabs>
    </PageHeader>
    {children}
  </div>
);
