import * as React from "react";

import { Icon } from "$app/components/Icons";
import { WithTooltip } from "$app/components/WithTooltip";

export const AuthorByline = ({
  name,
  profileUrl,
  avatarUrl,
  verified,
}: {
  name: string;
  profileUrl: string;
  avatarUrl?: string | undefined;
  verified?: boolean | undefined;
}) => (
  <a href={profileUrl} target="_blank" className="relative flex items-center gap-2" rel="noreferrer">
    {avatarUrl ? <img className="user-avatar" src={avatarUrl} /> : null}
    {name}
    {verified ? (
      <WithTooltip tip="Top creator" position="top">
        <Icon name="solid-check-circle" className="shrink-0 text-accent" />
      </WithTooltip>
    ) : null}
  </a>
);
