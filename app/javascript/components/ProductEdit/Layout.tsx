import { Link } from "@inertiajs/react";
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

import type { ContentUpdates, EditProductBase } from "./state";

export type ProductEditTabs = "content" | "product" | "receipt" | "share";

export const useProductUrl = (product: EditProductBase, params: Record<string, unknown> = {}) => {
  const currentSeller = useCurrentSeller();
  const { appDomain } = useDomains();
  return product.native_type === "coffee" && currentSeller
    ? Routes.custom_domain_coffee_url({ host: currentSeller.subdomain, ...params })
    : Routes.short_link_url(product.custom_permalink ?? product.unique_permalink, {
        host: currentSeller?.subdomain ?? appDomain,
        ...params,
      });
};

export const Layout = ({
  children,
  preview,
  product,
  isLoading = false,
  headerActions,
  previewScaleFactor = 0.4,
  showBorder = true,
  showNavigationButton = true,
  selectedTab,
  save,
  processing,
  isUploadingFiles = false,
  isFormDirty,
}: {
  children: React.ReactNode;
  preview?: React.ReactNode;
  product: EditProductBase;
  isLoading?: boolean;
  headerActions?: React.ReactNode;
  previewScaleFactor?: number;
  showBorder?: boolean;
  showNavigationButton?: boolean;
  selectedTab: ProductEditTabs;
  save: (
    options?: { onSuccess?: () => void; onFinish?: () => void },
    data?: { next_url?: string; publish?: boolean },
  ) => void;
  processing: boolean;
  contentUpdates?: ContentUpdates;
  setContentUpdates?: React.Dispatch<React.SetStateAction<ContentUpdates>>;
  isUploadingFiles?: boolean;
  isFormDirty: boolean;
}) => {
  const url = useProductUrl(product);
  const checkoutUrl = useProductUrl(product, { wanted: true });

  const [saveFlowStatus, setSaveFlowStatus] = React.useState<"saving" | "publishing" | null>(null);
  const processingStatus = saveFlowStatus ?? (processing ? "saving" : null);

  const changeProductStateTo = (action: "publish" | "unpublish") => {
    setSaveFlowStatus("publishing");
    save({ onFinish: () => setSaveFlowStatus(null) }, { publish: action === "publish" });
  };

  const imageSettings = useImageUploadSettings();
  const isUploadingFilesOrImages = isLoading || isUploadingFiles || !!imageSettings?.isUploading;
  const isBusy = isUploadingFilesOrImages || !!processingStatus;
  const saveButtonTooltip = isUploadingFiles
    ? "Files are still uploading..."
    : isUploadingFilesOrImages
      ? "Images are still uploading..."
      : isBusy
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
      <Button color="primary" disabled={isBusy} onClick={() => save()}>
        {processingStatus === "saving" ? "Saving changes..." : "Save changes"}
      </Button>
    </WithTooltip>
  );

  const onTabClick = (event: React.MouseEvent) => {
    if (!(event.target instanceof HTMLAnchorElement)) return;

    const message = isUploadingFiles
      ? "Some files are still uploading, please wait..."
      : isUploadingFilesOrImages
        ? "Some images are still uploading, please wait..."
        : undefined;
    if (message) {
      event.preventDefault();
      showAlert(message, "warning");
      return;
    }

    const url = new URL(event.target.href);
    if (url.pathname.startsWith(Routes.edit_product_share_path(product.unique_permalink)) && !product.is_published) {
      event.preventDefault();
      showAlert(
        "Not yet! You've got to publish your awesome product before you can share it with your audience and the world.",
        "warning",
      );
      return;
    }

    if (!isFormDirty) return;
    event.preventDefault();
    setSaveFlowStatus("saving");
    save({ onFinish: () => setSaveFlowStatus(null) }, { next_url: event.target.href });
  };

  const isCoffee = product.native_type === "coffee";

  return (
    <>
      {/* TODO: remove this legacy uploader stuff */}
      <form hidden data-id={product.unique_permalink} id="edit-link-basic-form" />
      <PageHeader
        className="sticky-top"
        title={product.name || "Untitled"}
        actions={
          product.is_published ? (
            <>
              <Button disabled={isBusy} onClick={() => changeProductStateTo("unpublish")}>
                {processingStatus === "publishing" ? "Unpublishing..." : "Unpublish"}
              </Button>
              {saveButton}
              <CopyToClipboard text={url} copyTooltip="Copy product URL">
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
          ) : selectedTab === "product" && !isCoffee ? (
            <Button color="primary" disabled={isBusy} onClick={() => save()}>
              {processingStatus === "saving" ? "Saving changes..." : "Save and continue"}
            </Button>
          ) : selectedTab === "content" || selectedTab === "receipt" ? (
            <>
              {saveButton}
              <WithTooltip tip={saveButtonTooltip}>
                <Button color="accent" disabled={isBusy} onClick={() => changeProductStateTo("publish")}>
                  {processingStatus === "publishing" ? "Publishing..." : "Publish and continue"}
                </Button>
              </WithTooltip>
            </>
          ) : (
            saveButton
          )
        }
      >
        <div
          className={classNames(
            "flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between",
            headerActions && "mt-2",
          )}
        >
          <Tabs style={{ gridColumn: 1 }}>
            <Tab asChild isSelected={selectedTab === "product"}>
              <Link href={Routes.edit_product_path(product.unique_permalink)} onClick={onTabClick}>
                Product
              </Link>
            </Tab>
            {!isCoffee ? (
              <Tab asChild isSelected={selectedTab === "content"}>
                <Link href={Routes.edit_product_content_path(product.unique_permalink)} onClick={onTabClick}>
                  Content
                </Link>
              </Tab>
            ) : null}
            <Tab asChild isSelected={selectedTab === "receipt"}>
              <Link href={Routes.edit_product_receipt_path(product.unique_permalink)} onClick={onTabClick}>
                Receipt
              </Link>
            </Tab>
            <Tab asChild isSelected={selectedTab === "share"}>
              <Link href={Routes.edit_product_share_path(product.unique_permalink)} onClick={onTabClick}>
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
                  href={url}
                  onClick={(evt) => {
                    evt.preventDefault();
                    setSaveFlowStatus("saving");
                    save({
                      onFinish: () => setSaveFlowStatus(null),
                      onSuccess: () => window.open(url, "_blank"),
                    });
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
