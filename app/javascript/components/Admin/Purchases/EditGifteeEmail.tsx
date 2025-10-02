import React from "react";
import { type Purchase } from "$app/components/Admin/Purchases/Purchase";
import { useForm, usePage } from "@inertiajs/react";
import { showAlert } from "$app/components/server-components/Alert";

type Props = {
  purchase: Purchase;
};

const AdminPurchasesEditGifteeEmail = ({ purchase }: Props) => {
  const { authenticity_token } = usePage().props;

  const { data, setData, post, reset } = useForm({
    authenticity_token: authenticity_token as string,
    update_giftee_email: {
      giftee_email: purchase.gift.giftee_email,
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    post(Routes.update_giftee_email_admin_purchase_path(purchase.id), {
      onSuccess: () => {
        showAlert("Giftee email updated successfully!", "success");
        reset();
      },
    });
  };

  const setGifteeEmail = (event: React.ChangeEvent<HTMLInputElement>) => {
    setData("update_giftee_email.giftee_email", event.target.value);
  };

  return (
    <details>
      <summary>
        <h3>Edit giftee email</h3>
      </summary>
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="authenticity_token" value={data.authenticity_token} />
        <input
          type="text"
          name="giftee_email"
          placeholder="Enter new giftee email"
          value={data.update_giftee_email.giftee_email}
          onChange={setGifteeEmail}
        />
        <button type="submit" className="button">Update</button>
      </form>
    </details>
  );
};

export default AdminPurchasesEditGifteeEmail;
