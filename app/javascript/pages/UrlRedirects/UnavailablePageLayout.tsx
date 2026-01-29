import { usePage } from "@inertiajs/react";
import * as React from "react";
import { cast } from "ts-safe-cast";

import { StandaloneLayout } from "$app/inertia/layout";

import { Layout, LayoutProps } from "$app/components/server-components/DownloadPage/Layout";
import { Placeholder, PlaceholderImage } from "$app/components/ui/Placeholder";

import placeholderImage from "$assets/images/placeholders/comic-stars.png";

export type UnavailablePageProps = LayoutProps & {
  product_name: string;
};

export const useUnavailablePageProps = () => cast<UnavailablePageProps>(usePage().props);

export const usePageTitle = (productName: string, titleSuffix: string) => {
  React.useEffect(() => {
    document.title = `${productName} - ${titleSuffix}`;
  }, [productName, titleSuffix]);
};

export const UnavailablePageContent = ({ children }: { children: React.ReactNode }) => (
  <Placeholder>
    <PlaceholderImage src={placeholderImage} />
    {children}
  </Placeholder>
);

export const UnavailablePageWrapper = ({
  pageProps,
  children,
}: {
  pageProps: UnavailablePageProps;
  children: React.ReactNode;
}) => (
  <Layout {...pageProps}>
    <UnavailablePageContent>{children}</UnavailablePageContent>
  </Layout>
);

export const withStandaloneLayout = (page: React.ReactNode) => <StandaloneLayout>{page}</StandaloneLayout>;
