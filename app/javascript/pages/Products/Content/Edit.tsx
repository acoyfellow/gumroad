import { useForm, usePage } from "@inertiajs/react";
import { DirectUpload } from "@rails/activestorage";
import { Editor, findChildren } from "@tiptap/core";
import { parseISO } from "date-fns";
import * as React from "react";
import { cast } from "ts-safe-cast";

import { type Post } from "$app/types/workflow";
import { classNames } from "$app/utils/classNames";
import { formatDate } from "$app/utils/date";
import { assertResponseError, request, ResponseError } from "$app/utils/request";

import { Button, NavigationButton } from "$app/components/Button";
import { ComboBox } from "$app/components/ComboBox";
import { EvaporateUploaderProvider } from "$app/components/EvaporateUploader";
import { Icon } from "$app/components/Icons";
import { Modal } from "$app/components/Modal";
import { ContentTabContent, extensions } from "$app/components/ProductEdit/ContentTab";
import { FileEmbed } from "$app/components/ProductEdit/ContentTab/FileEmbed";
import { titleWithFallback } from "$app/components/ProductEdit/ContentTab/PageTab";
import { Layout } from "$app/components/ProductEdit/Layout";
import type {
  EditProductContent,
  EditProductContentVariant,
  ExistingFileEntry,
} from "$app/components/ProductEdit/state";
import { checkFilesUploading } from "$app/components/ProductEdit/utils";
import { baseEditorOptions, ImageUploadSettingsContext } from "$app/components/RichTextEditor";
import { S3UploadConfigProvider } from "$app/components/S3UploadConfig";
import { LicenseProvider } from "$app/components/TiptapExtensions/LicenseKey";
import { PostsProvider } from "$app/components/TiptapExtensions/Posts";
import { Alert } from "$app/components/ui/Alert";
import { Checkbox } from "$app/components/ui/Checkbox";
import { InputGroup } from "$app/components/ui/InputGroup";
import { Label } from "$app/components/ui/Label";
import { useConfigureEvaporate } from "$app/components/useConfigureEvaporate";
import { useClientFlashMesage } from "$app/components/useFlashMessage";

const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];

type EditProductContentPageProps = {
  product: EditProductContent;
  existing_files: ExistingFileEntry[];
  page_metadata: {
    aws_key: string;
    s3_url: string;
    seller: {
      id: string;
      name: string;
      avatar_url: string;
      profile_url: string;
    };
    dropbox_picker_app_key: string;
  };
};

const NotifyAboutProductUpdatesAlert = () => {
  const timerRef = React.useRef<number | null>(null);
  const { flashData, clear } = useClientFlashMesage("frontend_alert_contents_updated");

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
    clear();
  };

  React.useEffect(() => {
    if (flashData) {
      startTimer();
    }

    return clearTimer;
  }, [flashData]);

  const handleMouseEnter = () => {
    clearTimer();
  };

  const handleMouseLeave = () => {
    startTimer();
  };

  return (
    <div
      className={classNames("fixed top-4 right-1/2", flashData ? "visible" : "invisible")}
      style={{
        transform: `translateX(50%) translateY(${flashData ? 0 : "calc(-100% - var(--spacer-4))"})`,
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
            <NavigationButton color="primary" href={flashData?.data.new_email_url} target="_blank" rel="noreferrer">
              Send notification
            </NavigationButton>
          </div>
        </div>
      </Alert>
    </div>
  );
};

const EditProductContentPage = () => {
  const { product, existing_files, page_metadata } = cast<EditProductContentPageProps>(usePage().props);
  const form = useForm({ product });

  const [selectedVariantId, setSelectedVariantId] = React.useState(product.variants[0]?.id ?? null);

  const [confirmingDiscardVariantContent, setConfirmingDiscardVariantContent] = React.useState(false);
  const selectedVariant = form.data.product.variants.find((variant) => variant.id === selectedVariantId);
  const [syncRichContentIdsFromServer, setSyncRichContentIdsFromServer] = React.useState(0);

  const setHasSameRichContent = (value: boolean) => {
    if (value) {
      const newRichContent = form.data.product.rich_content.length
        ? form.data.product.rich_content
        : (selectedVariant?.rich_content ?? []);
      form.setData("product.has_same_rich_content_for_all_variants", true);
      form.setData("product.rich_content", newRichContent);
      form.data.product.variants.forEach((_, index) => {
        form.setData(`product.variants.${index}.rich_content`, []);
      });
    } else {
      const oldRichContent = form.data.product.rich_content;
      form.setData("product.has_same_rich_content_for_all_variants", false);
      form.setData("product.rich_content", []);
      if (oldRichContent.length > 0) {
        form.data.product.variants.forEach((_, index) => {
          form.setData(`product.variants.${index}.rich_content`, oldRichContent);
        });
      }
    }
  };

  const { evaporateUploader, s3UploadConfig } = useConfigureEvaporate({
    aws_access_key_id: page_metadata.aws_key,
    s3_url: page_metadata.s3_url,
    user_id: page_metadata.seller.id,
  });

  const loadedPostsData = React.useRef(
    new Map<string | null, { posts: Post[]; total: number; next_page: number | null }>(),
  );
  const [loadingPostsCount, setLoadingPostsCount] = React.useState(0);
  const postsDataForEditingId = loadedPostsData.current.get(selectedVariantId);

  const fetchMorePosts = async (refresh?: boolean) => {
    const page = refresh ? 1 : postsDataForEditingId?.next_page;
    if (page === null) return;
    setLoadingPostsCount((count) => ++count);
    try {
      const response = await request({
        method: "GET",
        url: Routes.internal_product_product_posts_path(product.unique_permalink, {
          params: { page: page ?? 1, variant_id: selectedVariantId },
        }),
        accept: "json",
      });
      if (!response.ok) throw new ResponseError();
      const parsedResponse = cast<{ posts: Post[]; total: number; next_page: number | null }>(await response.json());
      loadedPostsData.current.set(
        selectedVariantId,
        refresh
          ? parsedResponse
          : {
              posts: [...(postsDataForEditingId?.posts ?? []), ...parsedResponse.posts],
              total: parsedResponse.total,
              next_page: parsedResponse.next_page,
            },
      );
    } finally {
      setLoadingPostsCount((count) => --count);
    }
  };

  const postsContext = {
    posts: postsDataForEditingId?.posts || null,
    total: postsDataForEditingId?.total || 0,
    isLoading: loadingPostsCount > 0,
    hasMorePosts: postsDataForEditingId?.next_page !== null,
    fetchMorePosts,
    productPermalink: product.unique_permalink,
  };

  const licenseInfo = {
    licenseKey: "6F0E4C97-B72A4E69-A11BF6C4-AF6517E7",
    isMultiSeatLicense: product.native_type === "membership" ? form.data.product.is_multiseat_license : null,
    seats: form.data.product.is_multiseat_license ? 5 : null,
    onIsMultiSeatLicenseChange: (value: boolean) => form.setData("product.is_multiseat_license", value),
    productId: product.id,
  };

  const saveContentFields = (
    options?: { onSuccess?: () => void; onFinish?: () => void },
    saveData?: { next_url?: string; publish?: boolean },
  ) => {
    form.transform((data) => {
      // TODO remove this once we have a better content uploader
      const editor = new Editor(baseEditorOptions(extensions(product.id)));
      const richContents =
        data.product.has_same_rich_content_for_all_variants || !data.product.variants.length
          ? data.product.rich_content
          : [...data.product.rich_content, ...data.product.variants.flatMap((variant) => variant.rich_content)];
      const fileIds = new Set(
        richContents.flatMap((content) =>
          findChildren(
            editor.schema.nodeFromJSON(content.description),
            (node) => node.type.name === FileEmbed.name,
          ).map<unknown>((child) => child.node.attrs.id),
        ),
      );
      editor.destroy();
      const filteredFiles = data.product.files.filter((file) => fileIds.has(file.id));

      return {
        product: {
          has_same_rich_content_for_all_variants: data.product.has_same_rich_content_for_all_variants,
          rich_content: data.product.rich_content,
          files: filteredFiles.map(({ file_size, ...file }) => ({
            ...file,
            ...(file_size != null && { size: file_size }),
            subtitle_files: file.subtitle_files.map(({ file_size: sub_size, ...sub }) => ({
              ...sub,
              ...(sub_size != null && { size: sub_size }),
            })),
          })),
          variants: data.product.variants.map((variant) => ({
            id: variant.id,
            rich_content: variant.rich_content,
          })),
          publish: saveData?.publish,
        },
        ...(saveData?.next_url && { next_url: saveData.next_url }),
      };
    });

    form.patch(Routes.product_content_path(product.unique_permalink), {
      only: ["product", "errors", "flash", "existing_files"],
      onSuccess: (data) => {
        options?.onSuccess?.();
        options?.onFinish?.();
        if (data.url === Routes.edit_product_content_path(product.unique_permalink)) {
          form.setData("product", cast<EditProductContent>(data.props.product));
          form.setDefaults();
          setSyncRichContentIdsFromServer((count) => count + 1);
        }
      },
      ...(options?.onFinish && { onError: options.onFinish }),
    });
  };

  const prepareDownload = () =>
    new Promise<void>((resolve) => {
      saveContentFields({ onFinish: resolve });
    });

  const isUploadingFiles = React.useMemo(() => checkFilesUploading(form.data.product.files), [form.data.product.files]);

  const imageSettings = React.useMemo(
    () => ({
      onUpload: (file: File) =>
        new Promise<string>((resolve, reject) => {
          const upload = new DirectUpload(file, Routes.rails_direct_uploads_path());
          upload.create((error, blob) => {
            if (error) reject(error);
            else
              request({
                method: "GET",
                accept: "json",
                url: Routes.s3_utility_cdn_url_for_blob_path({ key: blob.key }),
              })
                .then((response) => response.json())
                .then((data) => resolve(cast<{ url: string }>(data).url))
                .catch((e: unknown) => {
                  assertResponseError(e);
                  reject(e);
                });
          });
        }),
      allowedExtensions: ALLOWED_IMAGE_EXTENSIONS,
    }),
    [],
  );

  return (
    <PostsProvider value={postsContext}>
      <LicenseProvider value={licenseInfo}>
        <EvaporateUploaderProvider value={evaporateUploader}>
          <S3UploadConfigProvider value={s3UploadConfig}>
            <ImageUploadSettingsContext.Provider value={imageSettings}>
              <Layout
                product={form.data.product}
                headerActions={
                  form.data.product.variants.length > 0 ? (
                    <>
                      <hr className="relative left-1/2 my-2 w-screen max-w-none -translate-x-1/2 border-border lg:hidden" />
                      <ComboBox<EditProductContentVariant>
                        // TODO: Currently needed to get the icon on the selected option even though this is not multiple select. We should fix this in the design system
                        multiple
                        input={(props) => (
                          <InputGroup {...props} className="cursor-pointer py-3" aria-label="Select a version">
                            <span className="text-singleline flex-1">
                              {selectedVariant && !form.data.product.has_same_rich_content_for_all_variants
                                ? `Editing: ${selectedVariant.name || "Untitled"}`
                                : "Editing: All versions"}
                            </span>
                            <Icon name="outline-cheveron-down" />
                          </InputGroup>
                        )}
                        options={form.data.product.variants}
                        option={(item, props, index) => (
                          <>
                            <div
                              {...props}
                              onClick={(e) => {
                                props.onClick?.(e);
                                setSelectedVariantId(item.id);
                              }}
                              aria-selected={item.id === selectedVariantId}
                              inert={form.data.product.has_same_rich_content_for_all_variants}
                            >
                              <div className="flex-1">
                                <h4>{item.name || "Untitled"}</h4>
                                {item.id === selectedVariant?.id ? (
                                  <small>Editing</small>
                                ) : form.data.product.has_same_rich_content_for_all_variants ||
                                  item.rich_content.length ? (
                                  <small>
                                    Last edited on{" "}
                                    {formatDate(
                                      (form.data.product.has_same_rich_content_for_all_variants
                                        ? form.data.product.rich_content
                                        : item.rich_content
                                      ).reduce<Date | null>((acc, item) => {
                                        const date = parseISO(item.updated_at);
                                        return acc && acc > date ? acc : date;
                                      }, null) ?? new Date(),
                                    )}
                                  </small>
                                ) : (
                                  <small className="text-muted">No content yet</small>
                                )}
                              </div>
                              {item.id === selectedVariant?.id && (
                                <Icon name="solid-check-circle" className="ml-auto text-success" />
                              )}
                            </div>
                            {index === form.data.product.variants.length - 1 ? (
                              <div className="option">
                                <Label className="items-center">
                                  <Checkbox
                                    checked={form.data.product.has_same_rich_content_for_all_variants}
                                    onChange={() => {
                                      if (
                                        !form.data.product.has_same_rich_content_for_all_variants &&
                                        form.data.product.variants.length > 1
                                      )
                                        return setConfirmingDiscardVariantContent(true);
                                      setHasSameRichContent(!form.data.product.has_same_rich_content_for_all_variants);
                                    }}
                                  />
                                  <small>Use the same content for all versions</small>
                                </Label>
                              </div>
                            ) : null}
                          </>
                        )}
                      />
                    </>
                  ) : null
                }
                selectedTab="content"
                processing={form.processing}
                save={saveContentFields}
                isUploadingFiles={isUploadingFiles}
                isFormDirty={form.isDirty}
              >
                <NotifyAboutProductUpdatesAlert />
                <ContentTabContent
                  key={syncRichContentIdsFromServer}
                  selectedVariantId={selectedVariantId}
                  productId={form.data.product.id}
                  productName={form.data.product.name}
                  nativeType={form.data.product.native_type}
                  uniquePermalink={form.data.product.unique_permalink}
                  files={form.data.product.files}
                  variants={form.data.product.variants}
                  richContent={form.data.product.rich_content}
                  hasSameRichContentForAllVariants={form.data.product.has_same_rich_content_for_all_variants}
                  onUpdateFiles={(updater) => {
                    form.setData((current) => {
                      const updatedFiles = updater([...current.product.files]);
                      return {
                        ...current,
                        product: {
                          ...current.product,
                          files: updatedFiles.map((file) => ({ ...file })),
                        },
                      };
                    });
                  }}
                  onUpdateVariantRichContent={(variantIndex, richContent) =>
                    form.setData(`product.variants.${variantIndex}.rich_content`, richContent)
                  }
                  onUpdateSharedRichContent={(richContent) => {
                    form.setData((current) => ({
                      ...current,
                      product: {
                        ...current.product,
                        has_same_rich_content_for_all_variants: true,
                        rich_content: richContent,
                      },
                    }));
                  }}
                  existingFiles={existing_files}
                  prepareDownload={prepareDownload}
                  seller={page_metadata.seller}
                  dropboxPickerAppKey={page_metadata.dropbox_picker_app_key}
                />
              </Layout>
              <Modal
                open={confirmingDiscardVariantContent}
                onClose={() => setConfirmingDiscardVariantContent(false)}
                title="Discard content from other versions?"
                footer={
                  <>
                    <Button onClick={() => setConfirmingDiscardVariantContent(false)}>No, cancel</Button>
                    <Button
                      color="danger"
                      onClick={() => {
                        setHasSameRichContent(true);
                        setConfirmingDiscardVariantContent(false);
                      }}
                    >
                      Yes, proceed
                    </Button>
                  </>
                }
              >
                If you proceed, the content from all other versions of this product will be removed and replaced with
                the content of "{titleWithFallback(selectedVariant?.name)}".
                <strong>This action is irreversible.</strong>
              </Modal>
            </ImageUploadSettingsContext.Provider>
          </S3UploadConfigProvider>
        </EvaporateUploaderProvider>
      </LicenseProvider>
    </PostsProvider>
  );
};

export default EditProductContentPage;
