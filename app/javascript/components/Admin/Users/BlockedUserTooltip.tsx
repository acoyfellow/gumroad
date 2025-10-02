import React from "react";
import { WithTooltip, type Position } from "$app/components/WithTooltip";
import { Icon } from "$app/components/Icons";
import type { User } from "$app/components/Admin/Users/User";
import { formatDate } from "$app/utils/date";

export type Props = {
  user: User;
  position?: Position;
};

const BlockedUserTooltip = ({ user, position = "bottom" }: Props) => {
  const {
    blocked_by_form_email_at,
    form_email_domain,
    blocked_by_form_email_domain_at
  } = user;

  if (!blocked_by_form_email_at && !blocked_by_form_email_domain_at) {
    return null;
  }

  const content = () => {
    return (
      <div className="paragraphs">
        {blocked_by_form_email_at && <span>{`Email blocked ${formatDate(new Date(blocked_by_form_email_at))}`}</span>}
        {blocked_by_form_email_domain_at && <span>{`${form_email_domain} blocked ${formatDate(new Date(blocked_by_form_email_domain_at))}`}</span>}
      </div>
    );
  }

  return (
    <WithTooltip tip={content()} position={position}>
      <Icon name="solid-shield-exclamation" style={{ color: "rgb(var(--warning))" }} />
    </WithTooltip>
  );
}

export default BlockedUserTooltip;
