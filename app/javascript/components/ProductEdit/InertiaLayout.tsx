import { Link, usePage } from "@inertiajs/react";
import * as React from "react";

import { classNames } from "$app/utils/classNames";

import { Button, NavigationButton } from "$app/components/Button";
import { CopyToClipboard } from "$app/components/CopyToClipboard";
import { useCurrentSeller } from "$app/components/CurrentSeller";
import { useDomains } from "$app/components/DomainSettings";
import { Icon } from "$app/components/Icons";
import { Preview } from "$app/components/Preview";
import { PreviewSidebar, WithPreviewSidebar } from "$app/components/PreviewSidebar";
import { useImageUploadSettings } from "$app/components/RichTextEditor";
import { showAlert } from "$app/components/server-components/Alert";
import { PageHeader } from "$app/components/ui/PageHeader";
import { Tabs, Tab } from "$app/components/ui/Tabs";
import { WithTooltip } from "$app/components/WithTooltip";

type InertiaLayoutProps = {
  children: React.ReactNode;
  preview?: React.ReactNode;
  isLoading?: boolean;
  headerActions?: React.ReactNode;
  previewScaleFactor?: number;
  showBorder?: boolean;
  showNavigationButton?: boolean;
  currentTab: "product" | "content" | "receipt" | "share";
  onSave: () => void;
  isSaving?: boolean;
};

export const useProductUrl = (params = {}) => {
  const props = usePage<any>().props;
  const currentSeller = useCurrentSeller();
  const { appDomain } = useDomains();

  const product = props.product;
  const uniquePermalink = props.unique_permalink;

  const isCoffee = product.native_type === "coffee";

  return isCoffee && currentSeller
    ? Routes.custom_domain_coffee_url({ host: currentSeller.subdomain, ...params })
    : Routes.short_link_url(product.custom_permalink ?? uniquePermalink, {
        host: currentSeller?.subdomain ?? appDomain,
        ...params,
      });
};

export const InertiaLayout = ({
  children,
  preview,
  isLoading = false,
  headerActions,
  previewScaleFactor = 0.4,
  showBorder = true,
  showNavigationButton = true,
  currentTab,
  onSave,
  isSaving = false,
}: InertiaLayoutProps) => {
  const props = usePage<any>().props;
  const currentSeller = useCurrentSeller();
  const { appDomain } = useDomains();

  const product = props.product;
  const uniquePermalink = props.unique_permalink;

  const isCoffee = product.native_type === "coffee";
  const rootPath = `/products/edit/${uniquePermalink}`;

  const productUrl = useProductUrl();

  const checkoutUrl =
    isCoffee && currentSeller
      ? Routes.custom_domain_coffee_url({ host: currentSeller.subdomain, wanted: true })
      : Routes.short_link_url(product.custom_permalink ?? uniquePermalink, {
          host: currentSeller?.subdomain ?? appDomain,
          wanted: true,
        });

  const imageSettings = useImageUploadSettings();
  const isUploadingFilesOrImages = isLoading || !!imageSettings?.isUploading;
  const isBusy = isUploadingFilesOrImages || isSaving;

  const saveButtonTooltip = isUploadingFilesOrImages
    ? "Images are still uploading..."
    : isSaving
      ? "Please wait..."
      : undefined;

  React.useEffect(() => {
    if (!isUploadingFilesOrImages) return;

    const beforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();

    window.addEventListener("beforeunload", beforeUnload);

    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isUploadingFilesOrImages]);

  const saveButton = (
    <WithTooltip tip={saveButtonTooltip}>
      <Button color="primary" disabled={isBusy} onClick={onSave}>
        {isSaving ? "Saving changes..." : "Save changes"}
      </Button>
    </WithTooltip>
  );

  const handleTabClick = (e: React.MouseEvent) => {
    const message = isUploadingFilesOrImages ? "Some images are still uploading, please wait..." : undefined;

    if (message) {
      e.preventDefault();
      showAlert(message, "warning");
    }
  };

  const handleShareTabClick = (e: React.MouseEvent) => {
    if (!product.is_published) {
      e.preventDefault();
      showAlert(
        "Not yet! You've got to publish your awesome product before you can share it with your audience and the world.",
        "warning",
      );
      return;
    }
    handleTabClick(e);
  };

  return (
    <>
      <PageHeader
        className="sticky-top"
        title={product.name || "Untitled"}
        actions={
          <>
            {saveButton}
            {showNavigationButton && (
              <>
                <CopyToClipboard text={productUrl} copyTooltip="Copy product URL">
                  <Button>
                    <Icon name="link" />
                  </Button>
                </CopyToClipboard>
                <CopyToClipboard text={checkoutUrl} copyTooltip="Copy checkout URL" tooltipPosition="left">
                  <Button>
                    <Icon name="cart-plus" />
                  </Button>
                </CopyToClipboard>
              </>
            )}
          </>
        }
      >
        <div
          className={classNames(
            "flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between",
            headerActions && "mt-2",
          )}
        >
          <Tabs style={{ gridColumn: 1 }}>
            <Tab asChild isSelected={currentTab === "product"}>
              <Link href={rootPath} onClick={handleTabClick}>
                Product
              </Link>
            </Tab>
            {!isCoffee && (
              <Tab asChild isSelected={currentTab === "content"}>
                <Link href={`${rootPath}/content`} onClick={handleTabClick}>
                  Content
                </Link>
              </Tab>
            )}
            <Tab asChild isSelected={currentTab === "receipt"}>
              <Link href={`${rootPath}/receipt`} onClick={handleTabClick}>
                Receipt
              </Link>
            </Tab>
            <Tab asChild isSelected={currentTab === "share"}>
              <Link href={`${rootPath}/share`} onClick={handleShareTabClick}>
                Share
              </Link>
            </Tab>
          </Tabs>
          {headerActions}
        </div>
      </PageHeader>
      {preview ? (
        <WithPreviewSidebar className="flex-1">
          {children}
          <PreviewSidebar
            {...(showNavigationButton && {
              previewLink: (props) => (
                <NavigationButton
                  {...props}
                  disabled={isBusy}
                  href={productUrl}
                  onClick={(evt) => {
                    evt.preventDefault();
                    onSave();
                    setTimeout(() => window.open(productUrl, "_blank"), 100);
                  }}
                />
              ),
            })}
          >
            <Preview
              scaleFactor={previewScaleFactor}
              style={
                showBorder
                  ? {
                      border: "var(--border)",
                      backgroundColor: "rgb(var(--filled))",
                      borderRadius: "var(--border-radius-2)",
                    }
                  : {}
              }
            >
              {preview}
            </Preview>
          </PreviewSidebar>
        </WithPreviewSidebar>
      ) : (
        <div className="flex-1">{children}</div>
      )}
    </>
  );
};
