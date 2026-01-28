import { Head, useForm, usePage } from "@inertiajs/react";
import * as React from "react";

import { Button } from "$app/components/Button";
import { PoweredByFooter } from "$app/components/PoweredByFooter";
import { Card, CardContent } from "$app/components/ui/Card";
import * as Routes from "$app/utils/routes";

type SecureRedirectPageProps = {
  message: string;
  field_name: string;
  error_message: string;
  encrypted_payload: string;
};

const New = () => {
  const { message, field_name, encrypted_payload, error_message } = usePage<SecureRedirectPageProps>().props;

  const form = useForm({
    confirmation_text: "",
    encrypted_payload,
  });

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    form.post(Routes.secure_url_redirect_path({ message, field_name, error_message }), {
      preserveScroll: true,
      preserveState: true,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <Head title="Confirm access" />
      <Card className="single-page-form horizontal-form">
        <CardContent asChild>
          <header>
            <h2 className="grow">Confirm access</h2>
            <p>{message}</p>
          </header>
        </CardContent>
        <CardContent className="mini-rule legacy-only"></CardContent>
        <CardContent asChild>
          <form onSubmit={submitForm}>
            <label htmlFor="confirmation_text" className="form-label grow">
              {field_name}
            </label>
            <input
              id="confirmation_text"
              name="confirmation_text"
              type="text"
              placeholder={field_name}
              value={form.data.confirmation_text}
              onChange={(e) => form.setData("confirmation_text", e.target.value)}
              disabled={form.processing}
            />
            <Button type="submit" color="primary" disabled={form.processing}>
              {form.processing ? "Processing..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <PoweredByFooter className="mt-auto w-full !p-6 lg:!py-6" />
    </div>
  );
};

export default New;
