import React from "react";
import { useForm, Link } from "@inertiajs/react";

type Props = {
  query: string;
  product_title_query: string;
  purchase_status: string;
  endpoint: (params?: Record<string, string>) => string;
};

const AdminPurchasesFilterForm = ({
  query,
  product_title_query,
  purchase_status,
  endpoint,
}: Props) => {
  const { data, setData } = useForm({
    ...Object.fromEntries(new URLSearchParams(window.location.search)),
    query: query || "",
    product_title_query: product_title_query || "",
    purchase_status: purchase_status || "",
  });

  const onProductTitleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData("product_title_query", e.target.value);
  };

  const onPurchaseStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setData("purchase_status", e.target.value);
  };

  return (
    <form action={endpoint()} method="get" className="input-with-button mb-4">
      <input type="hidden" name="query" value={data.query} />

      <div className="input">
        <input
          type="text"
          name="product_title_query"
          placeholder="Filter by product title"
          value={data.product_title_query}
          onChange={onProductTitleQueryChange}
        />
      </div>

      <select
        name="purchase_status"
        onChange={onPurchaseStatusChange}
        defaultValue={data.purchase_status}
      >
        <option value="">Any status</option>
        <option value="chargeback">Chargeback</option>
        <option value="refunded">Refunded</option>
        <option value="failed">Failed</option>
      </select>

      <button type="submit" className="button primary">
        <span className="icon icon-solid-search"></span>
      </button>

      {
        (data.product_title_query || data.purchase_status) && (
          <Link href={Routes.admin_search_purchases_path({ query: data.query })} className="button secondary">Clear</Link>
        )
      }
    </form>
  );
};

export default AdminPurchasesFilterForm;
