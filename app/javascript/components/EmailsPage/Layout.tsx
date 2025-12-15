import { Link } from "@inertiajs/react";
import React from "react";

import { Icon } from "$app/components/Icons";
import { Popover } from "$app/components/Popover";
import { PageHeader } from "$app/components/ui/PageHeader";
import { Tab, Tabs } from "$app/components/ui/Tabs";
import { WithTooltip } from "$app/components/WithTooltip";

const TABS = ["published", "scheduled", "drafts", "subscribers"] as const;
export type EmailTab = (typeof TABS)[number];

// Path helpers
export const emailTabPath = (tab: (typeof TABS)[number]) => `/emails/${tab}`;
export const newEmailPath = "/emails/new";
export const editEmailPath = (id: string) => `/emails/${id}/edit`;

type LayoutProps = {
  selectedTab: EmailTab;
  children: React.ReactNode;
  hasPosts?: boolean;
  query?: string;
  onQueryChange?: (query: string) => void;
};

export const EmailsLayout = ({ selectedTab, children, hasPosts, query, onQueryChange }: LayoutProps) => {
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = React.useState(false);

  React.useEffect(() => {
    if (isSearchPopoverOpen) searchInputRef.current?.focus();
  }, [isSearchPopoverOpen]);

  return (
    <div>
      <PageHeader
        title="Emails"
        actions={
          <>
            {hasPosts && onQueryChange ? (
              <Popover
                open={isSearchPopoverOpen}
                onToggle={setIsSearchPopoverOpen}
                aria-label="Toggle Search"
                trigger={
                  <WithTooltip tip="Search" position="bottom">
                    <div className="button">
                      <Icon name="solid-search" />
                    </div>
                  </WithTooltip>
                }
              >
                <div className="input">
                  <Icon name="solid-search" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search emails"
                    value={query ?? ""}
                    onChange={(evt) => onQueryChange(evt.target.value)}
                  />
                </div>
              </Popover>
            ) : null}
            <NewEmailButton />
          </>
        }
      >
        <Tabs>
          <Tab asChild isSelected={selectedTab === "published"}>
            <Link href="/emails/published">Published</Link>
          </Tab>
          <Tab asChild isSelected={selectedTab === "scheduled"}>
            <Link href="/emails/scheduled">Scheduled</Link>
          </Tab>
          <Tab asChild isSelected={selectedTab === "drafts"}>
            <Link href="/emails/drafts">Drafts</Link>
          </Tab>
          <Tab href={Routes.followers_path()} isSelected={false}>
            Subscribers
          </Tab>
        </Tabs>
      </PageHeader>
      {children}
    </div>
  );
};

export const NewEmailButton = ({ copyFrom }: { copyFrom?: string } = {}) => {
  const href = copyFrom ? `/emails/new?copy_from=${copyFrom}` : "/emails/new";

  return (
    <Link className={copyFrom ? "button" : "button accent"} href={href}>
      {copyFrom ? "Duplicate" : "New email"}
    </Link>
  );
};

export const EditEmailButton = ({ id }: { id: string }) => {
  return (
    <Link className="button" href={`/emails/${id}/edit`}>
      Edit
    </Link>
  );
};

