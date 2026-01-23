import { Head, useForm } from "@inertiajs/react";
import * as React from "react";

import { Button } from "$app/components/Button";
import { PoweredByFooter } from "$app/components/PoweredByFooter";
import { showAlert } from "$app/components/server-components/Alert";
import { Card, CardContent } from "$app/components/ui/Card";
import * as Routes from "$app/utils/routes";

type SecureRedirectPageProps = {
  message: string;
  field_name: string;
  error_message: string;
  encrypted_payload: string;
};

const New = ({ message, field_name, error_message, encrypted_payload }: SecureRedirectPageProps) => {
  const form = useForm({
    confirmation_text: "",
    encrypted_payload,
    field_name,
    error_message,
    message,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.post(Routes.secure_url_redirect_path());
  };

  React.useEffect(() => {
    if (form.errors.confirmation_text) {
      showAlert(form.errors.confirmation_text, "error");
    }
  }, [form.errors.confirmation_text]);

  return (
    <>
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
          <form
            onSubmit={(e) => {
              handleSubmit(e);
            }}
          >
            <label htmlFor="confirmation_text" className="form-label grow">
              {field_name}
            </label>
            <input
              id="confirmation_text"
              name="confirmation_text"
              type="text"
              placeholder={field_name}
              required
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
      <PoweredByFooter className="fixed bottom-0 left-0 !p-6 !text-left lg:!py-6" />
    </>
  );
};

export default New;
