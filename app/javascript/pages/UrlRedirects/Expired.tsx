import { usePage } from "@inertiajs/react";
import * as React from "react";
import { cast } from "ts-safe-cast";

import { StandaloneLayout } from "$app/inertia/layout";

import { AccessExpiredContent, UnavailablePageLayout, type UnavailablePageProps } from "./UnavailablePageLayout";

type Props = UnavailablePageProps;

const ExpiredPage = () => {
  const props = cast<Props>(usePage().props);

  return (
    <UnavailablePageLayout {...props} titleSuffix="Access expired" contentUnavailabilityReasonCode="access_expired">
      <AccessExpiredContent />
    </UnavailablePageLayout>
  );
};

ExpiredPage.layout = (page: React.ReactNode) => <StandaloneLayout>{page}</StandaloneLayout>;

export default ExpiredPage;
