import * as React from "react";

import { Form } from "$app/components/server-components/Admin/Form";
import { showAlert } from "$app/components/server-components/Alert";

export const AdminResendReceiptForm = ({ purchase: { id, email } }: { purchase: Purchase }) => (
  <Form
    url={Routes.resend_receipt_admin_purchase_path(id)}
    method="POST"
    confirmMessage="Are you sure you want to resend the receipt?"
    onSuccess={() => showAlert("Receipt sent successfully.", "success")}
  >
    {(isLoading) => (
      <fieldset>
        <div className="input-with-button">
          <input type="email" name="resend_receipt[email_address]" placeholder={email} />
          <button type="submit" className="button" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
        <small>This will update the purchase email to this new one!</small>
      </fieldset>
    )}
  </Form>
);

export default AdminResendReceiptForm;
