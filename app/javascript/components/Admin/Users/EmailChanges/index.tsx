import React from "react";

import type { User } from "$app/components/Admin/Users/User";

import { useLazyFetch } from "$app/hooks/useLazyFetch";

import EmailChanges, { type EmailChangesProps, type FieldsProps } from "$app/components/Admin/Users/EmailChanges/EmailChanges";

type AdminUserEmailChangesProps = {
  user: User;
};

const AdminUserEmailChanges = ({ user }: AdminUserEmailChangesProps) => {
  const { data: { email_changes, fields }, isLoading, fetchData: fetchEmailChanges } = useLazyFetch<{ email_changes: EmailChangesProps; fields: FieldsProps }>(
    { email_changes: [] as EmailChangesProps, fields: ['email', 'payment_address'] as FieldsProps },
    {
      url: Routes.admin_user_email_changes_path(user.id, { format: "json" }),
      responseParser: (data) => {
        return data as { email_changes: EmailChangesProps; fields: FieldsProps };
      },
    }
  );

  const [open, setOpen] = React.useState(false);

  const onToggle = (e: React.MouseEvent<HTMLDetailsElement>) => {
    setOpen(e.currentTarget.open);
    if (e.currentTarget.open) {
      fetchEmailChanges();
    }
  };

  return (
    <>
      <hr />
      <details open={open} onToggle={onToggle}>
        <summary>
          <h3>Email changes</h3>
        </summary>
        <EmailChanges fields={fields} emailChanges={email_changes} isLoading={isLoading} />
      </details>
    </>
  );
};

export default AdminUserEmailChanges;
