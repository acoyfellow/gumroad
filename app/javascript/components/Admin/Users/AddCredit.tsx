import * as React from "react";

import { Button } from "$app/components/Button";

import { Form } from "$app/components/Admin/Form";
import type { User } from "$app/components/Admin/Users/User";
import { showAlert } from "$app/components/server-components/Alert";

type AdminUserAddCreditProps = {
  user: User;
};

const AdminUserAddCredit = ({ user }: AdminUserAddCreditProps) => (
  <>
    <hr />
    <details>
      <summary>
        <h3>Add credits</h3>
      </summary>
      <Form
        url={Routes.add_credit_admin_user_path(user.id)}
        method="POST"
        confirmMessage="Are you sure you want to add credits?"
        onSuccess={() => showAlert("Successfully added credits.", "success")}
      >
        {(isLoading) => (
          <fieldset>
            <div className="flex gap-2">
              <div className="input flex-1">
                <span className="pill">$</span>
                <input type="text" name="credit[credit_amount]" placeholder="10.25" inputMode="decimal" required />
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Add credits"}
              </Button>
            </div>

            <small>Subtract credits by providing a negative value</small>
          </fieldset>
        )}
      </Form>
    </details>
  </>
);

export default AdminUserAddCredit;
