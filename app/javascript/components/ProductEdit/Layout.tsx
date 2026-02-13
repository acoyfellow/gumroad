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
import { SubtitleFile } from "$app/components/SubtitleList/Row";
import { Alert } from "$app/components/ui/Alert";
import { PageHeader } from "$app/components/ui/PageHeader";
import { Tabs, Tab } from "$app/components/ui/Tabs";
import { useDropbox } from "$app/components/useDropbox";

import { FileEntry, PublicFileWithStatus, useProductEditContext, useProductFormContext } from "./state";
import { getContrastColor, hexToRgb } from "$app/utils/color";

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

const NotifyAboutProductUpdatesAlert = () => {
  const { uniquePermalink } = useProductEditContext();
  const { contentUpdates, setContentUpdates } = useProductFormContext();
  const timerRef = React.useRef<number | null>(null);
  const isVisible = !!contentUpdates;

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      close();
    }, 10_000);
  };

  const close = () => {
    clearTimer();
    setContentUpdates(null);
  };

  React.useEffect(() => {
    if (isVisible) {
      startTimer();
    }

    return clearTimer;
  }, [isVisible]);

  const handleMouseEnter = () => {
    clearTimer();
  };

  const handleMouseLeave = () => {
    startTimer();
  };

  return (
    <div
      className={classNames("fixed top-4 right-1/2", isVisible ? "visible" : "invisible")}
      style={{
        transform: `translateX(50%) translateY(${isVisible ? 0 : "calc(-100% - var(--spacer-4))"})`,
        transition: "all 0.3s ease-out 0.5s",
        zIndex: "var(--z-index-tooltip)",
        backgroundColor: "var(--body-bg)",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Alert variant="info">
        <div className="flex flex-col gap-4">
          Changes saved! Would you like to notify your customers about those changes?
          <div className="flex gap-2">
            <Button color="primary" outline onClick={() => close()}>
              Skip for now
            </Button>
            <NavigationButton
              color="primary"
              href={Routes.new_email_path({
                template: "content_updates",
                product: uniquePermalink,
                bought: contentUpdates?.uniquePermalinkOrVariantIds ?? [],
              })}
              onClick={() => {
                // NOTE: this is a workaround to make sure the alert closes after the tab is opened
                // with correct URL params. Otherwise `bought` won't be set correctly.
                setTimeout(() => close(), 100);
              }}
              target="_blank"
              rel="noreferrer"
            >
              Send notification
            </NavigationButton>
          </div>
        </div>
      </Alert>
    </div>
  );
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

  const currentSeller = useCurrentSeller();

  const profileColors =
    currentSeller && showBorder
      ? {
          "--accent": hexToRgb(currentSeller.profileHighlightColor),
          "--contrast-accent": hexToRgb(getContrastColor(currentSeller.profileHighlightColor)),
          "--filled": hexToRgb(currentSeller.profileBackgroundColor),
          "--color": hexToRgb(getContrastColor(currentSeller.profileBackgroundColor)),
        }
      : {};

  const fontUrl =
    currentSeller?.profileFont && currentSeller.profileFont !== "ABC Favorit"
      ? `https://fonts.googleapis.com/css2?family=${currentSeller.profileFont}:wght@400;600&display=swap`
      : null;

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
      <NotifyAboutProductUpdatesAlert />
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
                      borderRadius: "var(--border-radius-2)",
                      fontFamily: currentSeller?.profileFont === "ABC Favorit" ? undefined : currentSeller?.profileFont,
                      ...profileColors,
                      "--primary": "var(--color)",
                      "--body-bg": "rgb(var(--filled))",
                      "--contrast-primary": "var(--filled)",
                      "--contrast-filled": "var(--color)",
                      "--color-body": "var(--body-bg)",
                      "--color-background": "rgb(var(--filled))",
                      "--color-foreground": "rgb(var(--color))",
                      "--color-border": "rgb(var(--color) / var(--border-alpha))",
                      "--color-accent": "rgb(var(--accent))",
                      "--color-accent-foreground": "rgb(var(--contrast-accent))",
                      "--color-primary": "rgb(var(--primary))",
                      "--color-primary-foreground": "rgb(var(--contrast-primary))",
                      "--color-active-bg": "rgb(var(--color) / var(--gray-1))",
                      "--color-muted": "rgb(var(--color) / var(--gray-3))",
                      backgroundColor: "rgb(var(--filled))",
                      color: "rgb(var(--color))",
                    }
                  : {}
              }
            >
              {fontUrl ? (
                <>
                  <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
                  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                  <link rel="stylesheet" href={fontUrl} />
                </>
              ) : null}
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
