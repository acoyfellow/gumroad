import * as React from "react";

import {
  UnavailablePageWrapper,
  usePageTitle,
  useUnavailablePageProps,
  withStandaloneLayout,
} from "./UnavailablePageLayout";

const TITLE_SUFFIX = "Your rental has expired";

function RentalExpiredPage() {
  const pageProps = useUnavailablePageProps();
  usePageTitle(pageProps.product_name, TITLE_SUFFIX);

  return (
    <UnavailablePageWrapper pageProps={pageProps}>
      <h2>Your rental has expired</h2>
      <p>Rentals expire 30 days after purchase or 72 hours after you've begun watching it.</p>
    </UnavailablePageWrapper>
  );
}

RentalExpiredPage.layout = withStandaloneLayout;

export default RentalExpiredPage;
