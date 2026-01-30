import { usePage } from "@inertiajs/react";

import { PoweredByFooter } from "$app/components/PoweredByFooter";
import { Layout, Props } from "$app/components/Product/Layout";

type PageProps = Props & {
  custom_styles: string;
};

function ProductShowPage() {
  const props = usePage<PageProps>().props;

  return (
    <>
      <style>{props.custom_styles}</style>
      <Layout {...props} />
      <PoweredByFooter />
    </>
  );
}

ProductShowPage.loggedInUserLayout = true;
export default ProductShowPage;
