import { Link, usePage } from "@inertiajs/react";
import * as React from "react";

import { classNames } from "$app/utils/classNames";

import { Button } from "$app/components/Button";
import { CopyToClipboard } from "$app/components/CopyToClipboard";
import { useCurrentSeller } from "$app/components/CurrentSeller";
import { useDomains } from "$app/components/DomainSettings";
import { Icon } from "$app/components/Icons";
import { Preview } from "$app/components/Preview";
import { PreviewSidebar, WithPreviewSidebar } from "$app/components/PreviewSidebar";
import { useImageUploadSettings } from "$app/components/RichTextEditor";
import { showAlert } from "$app/components/server-components/Alert";
import { SubtitleFile } from "$app/components/SubtitleList/Row";
import { PageHeader } from "$app/components/ui/PageHeader";
import { Tabs, Tab } from "$app/components/ui/Tabs";
import { useDropbox } from "$app/components/useDropbox";

import { FileEntry, PublicFileWithStatus, useProductEditContext } from "./state";

export const useProductUrl = (params = {}) => {
  const { product, uniquePermalink } = useProductEditContext();
  const currentSeller = useCurrentSeller();
  const { appDomain } = useDomains();
  return product.native_type === "coffee" && currentSeller
    ? Routes.custom_domain_coffee_url({ host: currentSeller.subdomain, ...params })
    : Routes.short_link_url(product.custom_permalink ?? uniquePermalink, {
        host: currentSeller?.subdomain ?? appDomain,
        ...params,
      });
};

const useCurrentTab = (): "product" | "content" | "receipt" | "share" => {
  const componentToTab: Record<string, "product" | "content" | "receipt" | "share"> = {
    "Products/Product/Edit": "product",
    "Products/Content/Edit": "content",
    "Products/Receipt/Edit": "receipt",
    "Products/Share/Edit": "share",
  };
  return componentToTab[usePage().component] ?? "product";
};

type LayoutProps = {
  children: React.ReactNode;
  name?: string;
  preview?: React.ReactNode;
  headerActions?: React.ReactNode;
  previewScaleFactor?: number;
  showBorder?: boolean;
  isLoading?: boolean;
  isSaving?: boolean;
  isPublishing?: boolean;
  isUnpublishing?: boolean;
  isDirty?: boolean;
  files?: FileEntry[];
  publicFiles?: PublicFileWithStatus[];
  onSave?: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onSaveAndContinue?: () => void;
  onPreview?: () => void;
  onBeforeNavigate?: (targetPath: string) => boolean;
};

export const Layout = ({
  children,
  name = "Untitled",
  preview,
  headerActions,
  previewScaleFactor = 0.4,
  showBorder = true,
  isLoading = false,
  isSaving = false,
  isPublishing = false,
  isUnpublishing = false,
  isDirty = false,
  files = [],
  publicFiles = [],
  onSave,
  onPublish,
  onUnpublish,
  onSaveAndContinue,
  onPreview,
  onBeforeNavigate,
}: LayoutProps) => {
  const { product, uniquePermalink, dropboxAppKey } = useProductEditContext();
  const url = useProductUrl();
  const checkoutUrl = useProductUrl({ wanted: true });

  const tab = useCurrentTab();

  const isUploadingFile = (file: FileEntry | SubtitleFile) =>
    file.status.type === "unsaved" && file.status.uploadStatus.type === "uploading";
  const isUploadingFiles =
    publicFiles.some((f) => f.status?.type === "unsaved" && f.status.uploadStatus.type === "uploading") ||
    files.some((file) => isUploadingFile(file) || file.subtitle_files.some(isUploadingFile));
  const imageSettings = useImageUploadSettings();
  const isUploadingFilesOrImages = isLoading || isUploadingFiles || !!imageSettings?.isUploading;
  const isBusy = isUploadingFilesOrImages || isSaving;

  useDropbox(dropboxAppKey);

  React.useEffect(() => {
    if (!isUploadingFilesOrImages) return;

    const beforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();

    window.addEventListener("beforeunload", beforeUnload);

    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isUploadingFilesOrImages]);

  const handleTabClick = (e: React.MouseEvent, targetUrl: string) => {
    if (isUploadingFiles) {
      e.preventDefault();
      showAlert("Some files are still uploading, please wait...", "warning");
      return;
    }

    if (isUploadingFilesOrImages) {
      e.preventDefault();
      showAlert("Some images are still uploading, please wait...", "warning");
      return;
    }

    if (isDirty && onBeforeNavigate?.(targetUrl)) {
      e.preventDefault();
    }
  };

  const isCoffee = product.native_type === "coffee";

  const saveButton = onSave ? (
    <Button color="primary" disabled={isBusy} onClick={onSave}>
      {isSaving ? "Saving changes..." : "Save changes"}
    </Button>
  ) : null;

  const actions = product.is_published ? (
    <>
      {onUnpublish ? (
        <Button disabled={isBusy} onClick={onUnpublish}>
          {isUnpublishing ? "Unpublishing..." : "Unpublish"}
        </Button>
      ) : null}
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
  ) : tab === "product" && !isCoffee ? (
    onSaveAndContinue ? (
      <Button color="primary" disabled={isBusy} onClick={onSaveAndContinue}>
        {isSaving ? "Saving changes..." : "Save and continue"}
      </Button>
    ) : null
  ) : (
    <>
      {saveButton}
      {onPublish ? (
        <Button color="accent" disabled={isBusy} onClick={onPublish}>
          {isPublishing ? "Publishing..." : "Publish and continue"}
        </Button>
      ) : null}
    </>
  );

  return (
    <>
      {/* TODO: remove this legacy uploader stuff */}
      <form hidden data-id={uniquePermalink} id="edit-link-basic-form" />
      <PageHeader className="sticky-top" title={name || "Untitled"} actions={actions}>
        <div
          className={classNames(
            "flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between",
            headerActions && "mt-2",
          )}
        >
          <Tabs style={{ gridColumn: 1 }}>
            <Tab asChild isSelected={tab === "product"}>
              <Link
                href={Routes.edit_product_product_path(uniquePermalink)}
                onClick={(e) => handleTabClick(e, Routes.edit_product_product_path(uniquePermalink))}
                preserveScroll
              >
                Product
              </Link>
            </Tab>
            {!isCoffee ? (
              <Tab asChild isSelected={tab === "content"}>
                <Link
                  href={Routes.edit_product_content_path(uniquePermalink)}
                  onClick={(e) => handleTabClick(e, Routes.edit_product_content_path(uniquePermalink))}
                  preserveScroll
                >
                  Content
                </Link>
              </Tab>
            ) : null}
            <Tab asChild isSelected={tab === "receipt"}>
              <Link
                href={Routes.edit_product_receipt_path(uniquePermalink)}
                onClick={(e) => handleTabClick(e, Routes.edit_product_receipt_path(uniquePermalink))}
                preserveScroll
              >
                Receipt
              </Link>
            </Tab>
            <Tab asChild isSelected={tab === "share"}>
              <Link
                href={Routes.edit_product_share_path(uniquePermalink)}
                onClick={(e) => handleTabClick(e, Routes.edit_product_share_path(uniquePermalink))}
                preserveScroll
              >
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
            {...(onPreview && {
              previewLink: (props) => <Button {...props} onClick={onPreview} disabled={isBusy} />,
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
