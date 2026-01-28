import { usePage } from "@inertiajs/react";
import * as React from "react";
import { cast } from "ts-safe-cast";

import { StandaloneLayout } from "$app/inertia/layout";

import { RentalExpiredContent, UnavailablePageLayout, type UnavailablePageProps } from "./UnavailablePageLayout";

type Props = UnavailablePageProps;

const RentalExpiredPage = () => {
  const props = cast<Props>(usePage().props);

  return (
    <UnavailablePageLayout
      {...props}
      titleSuffix="Your rental has expired"
      contentUnavailabilityReasonCode="rental_expired"
    >
      <RentalExpiredContent />
    </UnavailablePageLayout>
  );
};

RentalExpiredPage.layout = (page: React.ReactNode) => <StandaloneLayout>{page}</StandaloneLayout>;

export default RentalExpiredPage;
