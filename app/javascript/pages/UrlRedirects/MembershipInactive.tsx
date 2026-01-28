import { usePage } from "@inertiajs/react";
import * as React from "react";
import { cast } from "ts-safe-cast";

import { StandaloneLayout } from "$app/inertia/layout";

import {
  InstallmentPlanInactiveContent,
  MembershipInactiveContent,
  UnavailablePageLayout,
  type UnavailablePageProps,
} from "./UnavailablePageLayout";

type Props = UnavailablePageProps;

const MembershipInactivePage = () => {
  const props = cast<Props>(usePage().props);

  const isInstallmentPlan = props.purchase?.membership?.is_installment_plan ?? false;
  const productName = props.purchase?.product_name ?? "";
  const productLongUrl = props.purchase?.product_long_url ?? null;
  const membership =
    props.purchase?.email && props.purchase.membership
      ? {
          is_alive_or_restartable: props.purchase.membership.is_alive_or_restartable,
          subscription_id: props.purchase.membership.subscription_id,
        }
      : null;

  return (
    <UnavailablePageLayout
      {...props}
      titleSuffix="Your membership is inactive"
      contentUnavailabilityReasonCode="inactive_membership"
    >
      {isInstallmentPlan ? (
        <InstallmentPlanInactiveContent
          product_name={productName}
          installment_plan={{
            is_alive_or_restartable: props.purchase?.membership?.is_alive_or_restartable ?? null,
            subscription_id: props.purchase?.membership?.subscription_id ?? "",
          }}
        />
      ) : (
        <MembershipInactiveContent
          product_name={productName}
          product_long_url={productLongUrl}
          membership={membership}
        />
      )}
    </UnavailablePageLayout>
  );
};

MembershipInactivePage.layout = (page: React.ReactNode) => <StandaloneLayout>{page}</StandaloneLayout>;

export default MembershipInactivePage;
