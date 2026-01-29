import * as React from "react";

import {
  UnavailablePageWrapper,
  usePageTitle,
  useUnavailablePageProps,
  withStandaloneLayout,
} from "./UnavailablePageLayout";

const TITLE_SUFFIX = "Access expired";

function ExpiredPage() {
  const pageProps = useUnavailablePageProps();
  usePageTitle(pageProps.product_name, TITLE_SUFFIX);

  return (
    <UnavailablePageWrapper pageProps={pageProps}>
      <h2>Access expired</h2>
      <p>It looks like your access to this product has expired. Please contact the creator for further assistance.</p>
    </UnavailablePageWrapper>
  );
}

ExpiredPage.layout = withStandaloneLayout;

export default ExpiredPage;
