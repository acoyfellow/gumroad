import * as React from "react";
import { createCast } from "ts-safe-cast";

import { register } from "$app/utils/serverComponentUtil";

import { Button } from "$app/components/Button";
import { Placeholder } from "$app/components/ui/Placeholder";

import { Layout, LayoutProps } from "./Layout";

type EmailConfirmationProps = {
  authenticity_token?: string | undefined;
  confirmation_info?:
    | {
        id: string;
        destination: string | null;
        display: string | null;
        email: string | null;
      }
    | undefined;
};

const WithoutContent = ({ confirmation_info, authenticity_token, ...props }: LayoutProps & EmailConfirmationProps) => (
  <Layout {...props}>
    {props.content_unavailability_reason_code === "email_confirmation_required" ? (
      <EmailConfirmation confirmation_info={confirmation_info} authenticity_token={authenticity_token} />
    ) : null}
  </Layout>
);

const EmailConfirmation = ({ confirmation_info, authenticity_token }: EmailConfirmationProps) => (
  <Placeholder>
    <h2>You've viewed this product a few times already</h2>
    <p>Once you enter the email address used to purchase this product, you'll be able to access it again.</p>
    {confirmation_info ? (
      <form
        action={Routes.confirm_redirect_path()}
        className="flex flex-col gap-4"
        style={{ width: "calc(min(428px, 100%))" }}
        method="post"
      >
        <input type="hidden" name="utf8" value="✓" />
        {authenticity_token ? <input type="hidden" name="authenticity_token" value={authenticity_token} /> : null}
        <input type="hidden" name="id" value={confirmation_info.id} />
        <input type="hidden" name="destination" value={confirmation_info.destination ?? ""} />
        <input type="hidden" name="display" value={confirmation_info.display ?? ""} />
        <input type="text" name="email" placeholder="Email address" defaultValue={confirmation_info.email ?? ""} />
        <Button type="submit" color="accent">
          Confirm email
        </Button>
      </form>
    ) : null}
  </Placeholder>
);

export default register({ component: WithoutContent, propParser: createCast() });
