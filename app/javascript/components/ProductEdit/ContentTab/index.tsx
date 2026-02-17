import { router } from "@inertiajs/react";
import { findChildren, generateJSON, Node as TiptapNode } from "@tiptap/core";
import { DOMSerializer } from "@tiptap/pm/model";
import { EditorContent } from "@tiptap/react";
import { partition } from "lodash-es";
import * as React from "react";
import { ReactSortable } from "react-sortablejs";

import { fetchDropboxFiles, ResponseDropboxFile, uploadDropboxFile } from "$app/data/dropbox_upload";
import { useDropbox } from "$app/hooks/useDropbox";
import { ProductNativeType } from "$app/parsers/product";
import { escapeRegExp } from "$app/utils";
import { assertDefined } from "$app/utils/assert";
import FileUtils from "$app/utils/file";
import GuidGenerator from "$app/utils/guid_generator";
import { getMimeType } from "$app/utils/mimetypes";
import { assertResponseError } from "$app/utils/request";
import { generatePageIcon } from "$app/utils/rich_content_page";

import { Button } from "$app/components/Button";
import { InputtedDiscount } from "$app/components/CheckoutDashboard/DiscountInput";
import { PageList, PageListLayout, PageListItem } from "$app/components/Download/PageListLayout";
import { EntityInfo } from "$app/components/DownloadPage/Layout";
import { useEvaporateUploader } from "$app/components/EvaporateUploader";
import { FileKindIcon } from "$app/components/FileRowContent";
import { Icon } from "$app/components/Icons";
import { LoadingSpinner } from "$app/components/LoadingSpinner";
import { Modal } from "$app/components/Modal";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "$app/components/Popover";
import { FileEmbed, FileEmbedConfig, getDownloadUrl } from "$app/components/ProductEdit/ContentTab/FileEmbed";
import { FileEmbedGroup } from "$app/components/ProductEdit/ContentTab/FileEmbedGroup";
import { Page, PageTab, titleWithFallback } from "$app/components/ProductEdit/ContentTab/PageTab";
import { EditProductContentVariant, ExistingFileEntry, FileEntry } from "$app/components/ProductEdit/state";
import { ReviewForm } from "$app/components/ReviewForm";
import {
  baseEditorOptions,
  getInsertAtFromSelection,
  PopoverMenuItem,
  RichTextEditorToolbar,
  useImageUploadSettings,
  useRichTextEditor,
  validateUrl,
} from "$app/components/RichTextEditor";
import { useS3UploadConfig } from "$app/components/S3UploadConfig";
import { Separator } from "$app/components/Separator";
import { showAlert } from "$app/components/server-components/Alert";
import { TestimonialSelectModal } from "$app/components/TestimonialSelectModal";
import { FileUpload } from "$app/components/TiptapExtensions/FileUpload";
import { uploadImages } from "$app/components/TiptapExtensions/Image";
import { LicenseKey } from "$app/components/TiptapExtensions/LicenseKey";
import { LinkMenuItem } from "$app/components/TiptapExtensions/Link";
import { LongAnswer } from "$app/components/TiptapExtensions/LongAnswer";
import { EmbedMediaForm, ExternalMediaFileEmbed, insertMediaEmbed } from "$app/components/TiptapExtensions/MediaEmbed";
import { MoreLikeThis } from "$app/components/TiptapExtensions/MoreLikeThis";
import { MoveNode } from "$app/components/TiptapExtensions/MoveNode";
import { Posts } from "$app/components/TiptapExtensions/Posts";
import { ShortAnswer } from "$app/components/TiptapExtensions/ShortAnswer";
import { UpsellCard } from "$app/components/TiptapExtensions/UpsellCard";
import { Card, CardContent } from "$app/components/ui/Card";
import { Row, RowContent, Rows } from "$app/components/ui/Rows";
import { Tabs, Tab } from "$app/components/ui/Tabs";
import { Product, ProductOption, UpsellSelectModal } from "$app/components/UpsellSelectModal";
import { useIsAboveBreakpoint } from "$app/components/useIsAboveBreakpoint";
import { useLatest } from "$app/components/useRefToLatest";
import { WithTooltip } from "$app/components/WithTooltip";

declare global {
  interface Window {
    ___dropbox_files_picked: DropboxFile[] | null;
  }
}

export const extensions = (productId: string, extraExtensions: TiptapNode[] = []) => [
  ...extraExtensions,
  ...[
    FileEmbed,
    FileEmbedGroup,
    ExternalMediaFileEmbed,
    Posts,
    LicenseKey,
    ShortAnswer,
    LongAnswer,
    FileUpload,
    MoveNode,
    UpsellCard,
    MoreLikeThis.configure({ productId }),
  ].filter((ext) => !extraExtensions.some((existing) => existing.name === ext.name)),
];

const FileUploadMenu = ({
  existingFiles,
  onEmbedMedia,
  onUploadFile,
  onSelectExistingFiles,
  onUploadFromDropbox,
}: {
  existingFiles: ExistingFileEntry[];
  onEmbedMedia: () => void;
  onUploadFile: (target: HTMLInputElement) => void;
  onSelectExistingFiles: () => void;
  onUploadFromDropbox: () => void;
}) => (
  <div role="menu" aria-label="Image and file uploader">
    <PopoverClose asChild>
      <div role="menuitem" onClick={onEmbedMedia}>
        <Icon name="media" />
        <span>Embed media</span>
      </div>
    </PopoverClose>
    <PopoverClose asChild>
      <label role="menuitem">
        <input type="file" name="file" multiple onChange={(e) => onUploadFile(e.target)} />
        <Icon name="paperclip" />
        <span>Computer files</span>
      </label>
    </PopoverClose>
    {existingFiles.length > 0 ? (
      <PopoverClose asChild>
        <div role="menuitem" onClick={onSelectExistingFiles}>
          <Icon name="files-earmark" />
          <span>Existing product files</span>
        </div>
      </PopoverClose>
    ) : null}
    <PopoverClose asChild>
      <div role="menuitem" onClick={onUploadFromDropbox}>
        <Icon name="dropbox" />
        <span>Dropbox files</span>
      </div>
    </PopoverClose>
  </div>
);

export const ContentTabContent = ({
  selectedVariantId,
  productId,
  productName,
  nativeType,
  uniquePermalink,
  files,
  variants,
  richContent,
  hasSameRichContentForAllVariants,
  onUpdateFiles,
  onUpdateVariantRichContent,
  onUpdateSharedRichContent,
  existingFiles,
  prepareDownload,
  seller,
  dropboxPickerAppKey,
}: {
  selectedVariantId: string | null;
  productId: string;
  productName: string;
  nativeType: ProductNativeType;
  uniquePermalink: string;
  files: FileEntry[];
  variants: EditProductContentVariant[];
  richContent: Page[];
  hasSameRichContentForAllVariants: boolean;
  onUpdateFiles: (updater: (prev: FileEntry[]) => FileEntry[]) => void;
  onUpdateVariantRichContent: (variantIndex: number, richContent: Page[]) => void;
  onUpdateSharedRichContent: (richContent: Page[]) => void;
  existingFiles: ExistingFileEntry[];
  prepareDownload: () => Promise<void>;
  seller: {
    id: string;
    name: string;
    avatar_url: string;
    profile_url: string;
  };
  dropboxPickerAppKey: string;
}) => {
  useDropbox(dropboxPickerAppKey);

  const filesByIdRef = useLatest(
    React.useMemo(
      () => new Map(files.map((file) => [file.id, { ...file, url: getDownloadUrl(productId, file) }])),
      [files, productId],
    ),
  );

  const uid = React.useId();
  const isDesktop = useIsAboveBreakpoint("lg");
  const imageSettings = useImageUploadSettings();

  const selectedVariant = hasSameRichContentForAllVariants
    ? null
    : variants.find((variant) => variant.id === selectedVariantId);
  const pages: (Page & { chosen?: boolean })[] = selectedVariant ? selectedVariant.rich_content : richContent;
  const pagesRef = useLatest(pages);
  const updatePages = (pages: Page[]) => {
    if (selectedVariant) {
      const variantIndex = variants.findIndex((v) => v.id === selectedVariantId);
      if (variantIndex !== -1) {
        onUpdateVariantRichContent(variantIndex, pages);
      }
    } else {
      onUpdateSharedRichContent(pages);
    }
  };
  const addPage = (description?: object) => {
    const page = {
      id: GuidGenerator.generate(),
      description: description ?? { type: "doc", content: [{ type: "paragraph" }] },
      title: null,
      updated_at: new Date().toISOString(),
    };
    updatePages([...pages, page]);
    setSelectedPageId(page.id);
    return page;
  };
  const [selectedPageId, setSelectedPageId] = React.useState(pages[0]?.id);
  const selectedPage = pages.find((page) => page.id === selectedPageId);
  if ((selectedPageId || pages.length) && !selectedPage) setSelectedPageId(pages[0]?.id);
  const [renamingPageId, setRenamingPageId] = React.useState<string | null>(null);
  const [confirmingDeletePage, setConfirmingDeletePage] = React.useState<Page | null>(null);
  const [pagesExpanded, setPagesExpanded] = React.useState(false);
  const showPageList = pages.length > 1 || selectedPage?.title || renamingPageId != null || nativeType === "commission";
  const [insertMenuState, setInsertMenuState] = React.useState<"open" | "inputs" | null>(null);
  const initialValue = React.useMemo(() => selectedPage?.description ?? "", [selectedPageId]);

  const onSelectFiles = (ids: string[]) => {
    if (!editor) return;
    if (ids.length > 1) {
      const fileEmbedSchema = assertDefined(editor.view.state.schema.nodes[FileEmbed.name]);
      editor.commands.insertFileEmbedGroup({
        content: ids.map((id) => fileEmbedSchema.create({ id, uid: GuidGenerator.generate() })),
        pos: getInsertAtFromSelection(editor.state.selection),
      });
    } else if (ids[0]) {
      editor.commands.insertContentAt(getInsertAtFromSelection(editor.state.selection), {
        type: FileEmbed.name,
        attrs: { id: ids[0], uid: GuidGenerator.generate() },
      });
    }
  };
  const uploader = assertDefined(useEvaporateUploader());
  const s3UploadConfig = useS3UploadConfig();
  const uploadFiles = (files: File[]) => {
    const fileEntries = files.map((file) => {
      const id = FileUtils.generateGuid();
      const { s3key, fileUrl } = s3UploadConfig.generateS3KeyForUpload(id, file.name);
      const mimeType = getMimeType(file.name);
      const extension = FileUtils.getFileExtension(file.name).toUpperCase();
      const fileStatus: FileEntry["status"] = {
        type: "unsaved",
        uploadStatus: { type: "uploading", progress: { percent: 0, bitrate: 0 } },
        url: URL.createObjectURL(file),
      };
      const fileEntry: FileEntry = {
        display_name: FileUtils.getFileNameWithoutExtension(file.name),
        extension,
        description: null,
        file_size: file.size,
        is_pdf: extension === "PDF",
        pdf_stamp_enabled: false,
        is_streamable: FileUtils.isFileExtensionStreamable(extension),
        stream_only: false,
        is_transcoding_in_progress: false,
        id,
        subtitle_files: [],
        url: fileUrl,
        status: fileStatus,
        thumbnail: null,
      };
      const status = uploader.scheduleUpload({
        cancellationKey: `file_${id}`,
        name: s3key,
        file,
        mimeType,
        onComplete: () => {
          fileStatus.uploadStatus = { type: "uploaded" };
          onUpdateFiles((prev) => {
            const file = prev.find((fileEntry) => fileEntry.id === id);
            if (file && file.status.type === "unsaved") {
              return prev.map((f) =>
                f.id === id
                  ? {
                      ...f,
                      status: { ...f.status, uploadStatus: { type: "uploaded" } },
                    }
                  : f,
              );
            }
            return prev;
          });
        },
        onProgress: (progress) => {
          fileStatus.uploadStatus = { type: "uploading", progress };
          onUpdateFiles((prev) => {
            const file = prev.find((fileEntry) => fileEntry.id === id);
            if (file && file.status.type === "unsaved") {
              return prev.map((f) =>
                f.id === id
                  ? {
                      ...f,
                      status: { ...f.status, uploadStatus: { type: "uploading", progress } },
                    }
                  : f,
              );
            }
            return prev;
          });
        },
      });
      if (typeof status === "string") {
        // status contains error string if any, otherwise index of file in array
        showAlert(status, "error");
      }
      return fileEntry;
    });
    onUpdateFiles((prev) => [...prev, ...fileEntries]);
    onSelectFiles(fileEntries.map((fileEntry) => fileEntry.id));
  };
  const uploadFileInput = (input: HTMLInputElement) => {
    if (!input.files?.length) return;
    uploadFiles([...input.files]);
    input.value = "";
  };

  const updateFile = React.useCallback(
    (fileId: string, data: Partial<FileEntry>) => {
      onUpdateFiles((prev) => {
        const fileIndex = prev.findIndex((f) => f.id === fileId);
        if (fileIndex === -1) {
          return prev;
        }
        const currentFile = prev[fileIndex];
        if (!currentFile) return prev;
        const updatedFile = { ...currentFile, ...data };
        return prev.map((file, index) => (index === fileIndex ? updatedFile : file));
      });
    },
    [onUpdateFiles],
  );
  const fileEmbedGroupConfig = useLatest({
    productId,
    variantId: selectedVariantId,
    prepareDownload,
    get filesById() {
      return filesByIdRef.current;
    },
  });

  const fileEmbedConfig = useLatest<FileEmbedConfig>({
    get filesById() {
      return filesByIdRef.current;
    },
    id: productId,
    onUpdateFile: updateFile,
    removeFile: (fileId) => onUpdateFiles((prev) => prev.filter((f) => f.id !== fileId)),
  });
  const uploadFilesRef = useLatest(uploadFiles);
  const contentEditorExtensions = extensions(productId, [
    FileEmbedGroup.configure({ getConfig: () => fileEmbedGroupConfig.current }),
    FileEmbed.configure({ getConfig: () => fileEmbedConfig.current }),
  ]);
  const editor = useRichTextEditor({
    ariaLabel: "Content editor",
    initialValue,
    editable: true,
    extensions: contentEditorExtensions,
    onInputNonImageFiles: (files) => uploadFilesRef.current(files),
  });
  const updateContentRef = useLatest(() => {
    if (!editor) return;

    // Correctly set the IDs of the file embeds copied from another product
    const fragment = DOMSerializer.fromSchema(editor.schema).serializeFragment(editor.state.doc.content);
    const newFiles: FileEntry[] = [];
    fragment.querySelectorAll("file-embed[url]").forEach((node) => {
      const file = existingFiles.find(
        (file) => file.id === node.getAttribute("id") || file.url === node.getAttribute("url"),
      );
      if (file) {
        node.setAttribute("id", file.id);
        if (node.hasAttribute("url")) {
          newFiles.push(file);
          node.removeAttribute("url");
        }
      } else {
        node.remove();
      }
    });
    if (newFiles.length > 0) onUpdateFiles((prev) => [...prev.filter((f) => !newFiles.includes(f)), ...newFiles]);
    const description = generateJSON(
      new XMLSerializer().serializeToString(fragment),
      baseEditorOptions(contentEditorExtensions).extensions,
    );

    const currentSelectedPage = pagesRef.current.find((page) => page.id === selectedPageId);
    if (currentSelectedPage)
      updatePages(pagesRef.current.map((page) => (page === currentSelectedPage ? { ...page, description } : page)));
    else addPage(description);
  });
  const handleCreatePageClick = () => {
    setPagesExpanded(true);
    setRenamingPageId((pages.length > 1 || selectedPage?.title ? addPage() : (selectedPage ?? addPage())).id);
  };
  React.useEffect(() => {
    if (!editor) return;

    const updateContent = () => updateContentRef.current();
    editor.on("update", updateContent);
    editor.on("blur", updateContent);
    return () => {
      editor.off("update", updateContent);
      editor.off("blur", updateContent);
    };
  }, [editor]);

  const pageIcons = React.useMemo(
    () =>
      new Map(
        editor
          ? pages.map((page) => {
              const description = editor.schema.nodeFromJSON(page.description);
              return [
                page.id,
                generatePageIcon({
                  hasLicense: findChildren(description, (node) => node.type.name === LicenseKey.name).length > 0,
                  fileIds: findChildren(description, (node) => node.type.name === FileEmbed.name).map(({ node }) =>
                    String(node.attrs.id),
                  ),
                  allFiles: files,
                }),
              ] as const;
            })
          : [],
      ),
    [pages],
  );

  const findPageWithNode = (type: string) =>
    editor &&
    pages.find(
      (page) =>
        findChildren(editor.schema.nodeFromJSON(page.description), (node) => node.type.name === type).length > 0,
    );

  const onInsertPosts = () => {
    if (!editor) return;
    if (selectedPage?.description && editor.$node(Posts.name)) {
      showAlert("You can't insert a list of posts more than once per page", "error");
    } else {
      editor.chain().focus().insertPosts({}).run();
    }
  };

  const onInsertLicense = () => {
    const pageWithLicense = findPageWithNode(LicenseKey.name);
    if (pageWithLicense) {
      showAlert(
        pages.length > 1
          ? `The license key has already been added to "${titleWithFallback(pageWithLicense.title)}"`
          : variants.length > 1
            ? `You can't insert more than one license key per ${nativeType === "membership" ? "tier" : "version"}`
            : "You can't insert more than one license key",
        "error",
      );
    } else {
      editor?.chain().focus().insertLicenseKey({}).run();
    }
  };

  const [showInsertPostModal, setShowInsertPostModal] = React.useState(false);
  const [addingButton, setAddingButton] = React.useState<{ label: string; url: string } | null>(null);
  const [showEmbedModal, setShowEmbedModal] = React.useState(false);
  const [selectingExistingFiles, setSelectingExistingFiles] = React.useState<{
    selected: ExistingFileEntry[];
    query: string;
    isLoading?: boolean;
  } | null>(null);
  const filteredExistingFiles = React.useMemo(() => {
    if (!selectingExistingFiles) return [];
    const regex = new RegExp(escapeRegExp(selectingExistingFiles.query), "iu");
    return existingFiles.filter((file) => regex.test(file.display_name));
  }, [existingFiles, selectingExistingFiles?.query]);

  const fetchLatestExistingFiles = async () => {
    await Promise.all([
      router.reload({
        only: ["existing_files"],
        onFinish: () => {
          setSelectingExistingFiles((state) => (state ? { ...state, isLoading: false } : null));
        },
      }),
      // Enforce minimum loading time to prevent jarring spinner flicker UX on fast connections
      new Promise((resolve) => setTimeout(resolve, 250)),
    ]);
  };

  const addDropboxFiles = (dropboxFiles: ResponseDropboxFile[]) => {
    onUpdateFiles((prev) => {
      const [updatedFiles, nonModifiedFiles] = partition(prev, (file) =>
        dropboxFiles.some(({ external_id }) => file.id === external_id),
      );
      const newFiles = dropboxFiles.map((file) => {
        const existing = updatedFiles.find(({ id }) => id === file.external_id);
        const extension = FileUtils.getFileExtension(file.name).toUpperCase();
        return {
          display_name: existing?.display_name ?? FileUtils.getFileNameWithoutExtension(file.name),
          extension,
          description: existing?.description ?? null,
          file_size: file.bytes,
          is_pdf: extension === "PDF",
          pdf_stamp_enabled: false,
          is_streamable: FileUtils.isFileNameStreamable(file.name),
          stream_only: false,
          is_transcoding_in_progress: false,
          id: file.external_id,
          subtitle_files: [],
          url: file.s3_url,
          status: { type: "dropbox", externalId: file.external_id, uploadState: file.state } as const,
          thumbnail: existing?.thumbnail ?? null,
        };
      });
      return [...nonModifiedFiles, ...newFiles];
    });
  };
  const uploadFromDropbox = () => {
    const uploadFiles = async (files: DropboxFile[]) => {
      for (const file of files) {
        try {
          const response = await uploadDropboxFile(uniquePermalink, file);
          addDropboxFiles([response.dropbox_file]);
          setTimeout(() => onSelectFiles([response.dropbox_file.external_id]), 100);
        } catch (error) {
          assertResponseError(error);
          showAlert(error.message, "error");
        }
      }
    };
    // hack for use in E2E tests
    if (window.___dropbox_files_picked) {
      void uploadFiles(window.___dropbox_files_picked);
      window.___dropbox_files_picked = null;
      return;
    }
    window.Dropbox.choose({ linkType: "direct", multiselect: true, success: (files) => void uploadFiles(files) });
  };
  React.useEffect(() => {
    const interval = setInterval(
      () => void fetchDropboxFiles(uniquePermalink).then(({ dropbox_files }) => addDropboxFiles(dropbox_files)),
      10000,
    );
    return () => clearInterval(interval);
  }, [editor]);

  const [showUpsellModal, setShowUpsellModal] = React.useState(false);
  const [showReviewModal, setShowReviewModal] = React.useState(false);

  const onInsertUpsell = (product: Product, variant: ProductOption | null, discount: InputtedDiscount | null) => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .insertUpsellCard({
        productId: product.id,
        variantId: variant?.id || null,
        discount: discount
          ? discount.type === "cents"
            ? { type: "fixed", cents: discount.value ?? 0 }
            : { type: "percent", percents: discount.value ?? 0 }
          : null,
      })
      .run();
    setShowUpsellModal(false);
  };

  const onInsertReviews = (reviewIds: string[]) => {
    if (!editor) return;
    for (const reviewId of reviewIds) {
      editor.chain().focus().insertReviewCard({ reviewId }).run();
    }
    setShowReviewModal(false);
  };

  const onInsertMoreLikeThis = () => {
    if (!editor) return;
    if (selectedPage?.description && editor.$node(MoreLikeThis.name)) {
      showAlert("You can't insert a More like this block more than once per page", "error");
    } else {
      editor.chain().focus().insertContent({ type: "moreLikeThis", attrs: { productId } }).run();
    }
  };

  const onInsertButton = () => {
    if (!editor) return;
    if (!addingButton) return;

    const href = validateUrl(addingButton.url);
    if (!href) return showAlert("Please enter a valid URL.", "error");
    editor
      .chain()
      .focus()
      .insertContent({
        type: "button",
        attrs: { href },
        content: [{ type: "text", text: addingButton.label || href || "" }],
      })
      .run();
    setAddingButton(null);
  };

  return (
    <>
      <div className="h-screen sm:h-full md:flex md:flex-col">
        {editor ? (
          <RichTextEditorToolbar
            color="ghost"
            className="border-b border-border px-8"
            editor={editor}
            productId={productId}
            custom={
              <>
                <LinkMenuItem editor={editor} />
                <PopoverMenuItem name="Upload files" icon="upload-fill">
                  <FileUploadMenu
                    existingFiles={existingFiles}
                    onEmbedMedia={() => setShowEmbedModal(true)}
                    onUploadFile={uploadFileInput}
                    onSelectExistingFiles={() => {
                      setSelectingExistingFiles({ selected: [], query: "", isLoading: true });
                      void fetchLatestExistingFiles();
                    }}
                    onUploadFromDropbox={uploadFromDropbox}
                  />
                </PopoverMenuItem>
                {selectingExistingFiles ? (
                  <Modal
                    open
                    onClose={() => setSelectingExistingFiles(null)}
                    title="Select existing product files"
                    footer={
                      <>
                        <Button onClick={() => setSelectingExistingFiles(null)}>Cancel</Button>
                        <Button
                          color="primary"
                          onClick={() => {
                            onUpdateFiles((prev) => [...prev, ...selectingExistingFiles.selected]);
                            onSelectFiles(selectingExistingFiles.selected.map((file) => file.id));
                            setSelectingExistingFiles(null);
                          }}
                        >
                          Select
                        </Button>
                      </>
                    }
                  >
                    <div className="flex flex-col gap-4">
                      <input
                        type="text"
                        placeholder="Find your files"
                        value={selectingExistingFiles.query}
                        onChange={(evt) =>
                          setSelectingExistingFiles({ ...selectingExistingFiles, query: evt.target.value })
                        }
                      />
                      <Rows
                        className="overflow-auto"
                        role="listbox"
                        style={{ maxHeight: "20rem", textAlign: "initial" }}
                      >
                        {selectingExistingFiles.isLoading ? (
                          <div className="flex min-h-40 justify-center">
                            <LoadingSpinner className="size-8" />
                          </div>
                        ) : (
                          filteredExistingFiles.map((file) => (
                            <Row key={file.id} role="option" className="cursor-pointer" asChild>
                              <label>
                                <RowContent>
                                  <FileKindIcon extension={file.extension} />
                                  <div>
                                    <h4>{file.display_name}</h4>
                                    <span>{`${file.attached_product_name || "N/A"} (${FileUtils.getFullFileSizeString(file.file_size ?? 0)})`}</span>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={selectingExistingFiles.selected.includes(file)}
                                    onChange={() => {
                                      setSelectingExistingFiles({
                                        ...selectingExistingFiles,
                                        selected: selectingExistingFiles.selected.includes(file)
                                          ? selectingExistingFiles.selected.filter((id) => id !== file)
                                          : [...selectingExistingFiles.selected, file],
                                      });
                                    }}
                                    style={{ marginLeft: "auto" }}
                                  />
                                </RowContent>
                              </label>
                            </Row>
                          ))
                        )}
                      </Rows>
                    </div>
                  </Modal>
                ) : null}

                <Modal open={showEmbedModal} onClose={() => setShowEmbedModal(false)} title="Embed media">
                  <p>Paste a video link or upload images or videos.</p>
                  <Tabs variant="buttons">
                    <Tab isSelected aria-controls={`${uid}-embed-tab`} asChild>
                      <button type="button">
                        <Icon name="link" />
                        <h4>Embed link</h4>
                      </button>
                    </Tab>
                    <Tab isSelected={false} asChild>
                      <label>
                        <input
                          className="sr-only"
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={(e) => {
                            if (!e.target.files) return;
                            const [images, nonImages] = partition([...e.target.files], (file) =>
                              file.type.startsWith("image"),
                            );
                            uploadImages({ view: editor.view, files: images, imageSettings });
                            uploadFiles(nonImages);
                            e.target.value = "";
                            setShowEmbedModal(false);
                          }}
                        />
                        <Icon name="upload-fill" />
                        <h4>Upload</h4>
                      </label>
                    </Tab>
                  </Tabs>
                  <div id={`${uid}-embed-tab`}>
                    <EmbedMediaForm
                      type="embed"
                      onClose={() => setShowEmbedModal(false)}
                      onEmbedReceived={(embed) => {
                        insertMediaEmbed(editor, embed);
                        setShowEmbedModal(false);
                      }}
                    />
                  </div>
                </Modal>
                <Separator aria-orientation="vertical" />
                <Popover
                  open={insertMenuState != null}
                  onOpenChange={(open) => setInsertMenuState(open ? "open" : null)}
                >
                  <PopoverTrigger className="toolbar-item all-unset">
                    Insert <Icon name="outline-cheveron-down" />
                  </PopoverTrigger>
                  <PopoverContent sideOffset={4} className="border-0 p-0 shadow-none">
                    <div role="menu" onClick={() => setInsertMenuState(null)}>
                      {insertMenuState === "inputs" ? (
                        <>
                          <div
                            role="menuitem"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInsertMenuState("open");
                            }}
                          >
                            <Icon name="outline-cheveron-left" />
                            <span>Back</span>
                          </div>
                          <div role="menuitem" onClick={() => editor.chain().focus().insertShortAnswer({}).run()}>
                            <Icon name="card-text" />
                            <span>Short answer</span>
                          </div>
                          <div role="menuitem" onClick={() => editor.chain().focus().insertLongAnswer({}).run()}>
                            <Icon name="file-text" />
                            <span>Long answer</span>
                          </div>
                          <div role="menuitem" onClick={() => editor.chain().focus().insertFileUpload({}).run()}>
                            <Icon name="folder-plus" />
                            <span>Upload file</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div role="menuitem" onClick={() => setAddingButton({ label: "", url: "" })}>
                            <Icon name="button" />
                            <span>Button</span>
                          </div>
                          <div role="menuitem" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                            <Icon name="horizontal-rule" />
                            <span>Divider</span>
                          </div>
                          <div
                            role="menuitem"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInsertMenuState("inputs");
                            }}
                            className="flex items-center"
                          >
                            <Icon name="input-cursor-text" />
                            <span>Input</span>
                            <Icon name="outline-cheveron-right" className="ml-auto" />
                          </div>
                          <div role="menuitem" onClick={onInsertMoreLikeThis}>
                            <Icon name="grid" />
                            <span>More like this</span>
                          </div>
                          <div role="menuitem" onClick={onInsertPosts}>
                            <Icon name="file-earmark-medical" />
                            <span>List of posts</span>
                          </div>
                          <div role="menuitem" onClick={onInsertLicense}>
                            <Icon name="outline-key" />
                            <span>License key</span>
                          </div>
                          <div role="menuitem" onClick={() => setShowInsertPostModal(true)}>
                            <Icon name="twitter" />
                            <span>Twitter post</span>
                          </div>
                          <div
                            role="menuitem"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowUpsellModal(true);
                            }}
                          >
                            <Icon name="cart-plus" />
                            <span>Upsell</span>
                          </div>
                          <div
                            role="menuitem"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowReviewModal(true);
                            }}
                          >
                            <Icon name="solid-star" />
                            <span>Review</span>
                          </div>
                        </>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <Separator aria-orientation="vertical" />
                <button className="toolbar-item cursor-pointer all-unset" onClick={handleCreatePageClick}>
                  <Icon name="plus" /> Page
                </button>
              </>
            }
          />
        ) : null}
        <PageListLayout
          className="md:h-auto! md:flex-1"
          pageList={
            !isDesktop && !showPageList ? null : (
              <div className="flex flex-col gap-4">
                {showPageList ? (
                  <ReactSortable
                    draggable="[role=tab]"
                    handle="[aria-grabbed]"
                    tag={PageList}
                    list={pages.map((page) => ({ ...page, id: page.id }))}
                    setList={updatePages}
                  >
                    <>
                      {isDesktop ? null : (
                        <PageListItem asChild className="text-left">
                          <button className="cursor-pointer all-unset" onClick={() => setPagesExpanded(!pagesExpanded)}>
                            <span className="flex-1">
                              <strong>Table of contents:</strong> {titleWithFallback(selectedPage?.title)}
                            </span>

                            <Icon name={pagesExpanded ? "outline-cheveron-down" : "outline-cheveron-right"} />
                          </button>
                        </PageListItem>
                      )}
                      {isDesktop || pagesExpanded ? (
                        <>
                          {pages.map((page) => (
                            <PageTab
                              key={page.id}
                              page={page}
                              selected={page === selectedPage}
                              icon={pageIcons.get(page.id) ?? "file-text"}
                              dragging={!!page.chosen}
                              renaming={page.id === renamingPageId}
                              setRenaming={(renaming) => setRenamingPageId(renaming ? page.id : null)}
                              onClick={() => {
                                setSelectedPageId(page.id);
                                if (!isDesktop) setPagesExpanded(false);
                              }}
                              onUpdate={(title) =>
                                updatePages(
                                  pagesRef.current.map((existing) =>
                                    existing.id === page.id ? { ...existing, title } : existing,
                                  ),
                                )
                              }
                              onDelete={() => setConfirmingDeletePage(page)}
                            />
                          ))}
                          {nativeType === "commission" ? (
                            <WithTooltip
                              tip="Commission files will appear on this page upon completion"
                              position="bottom"
                            >
                              <PageTab
                                page={{
                                  id: "",
                                  title: "Downloads",
                                  description: {
                                    type: "doc",
                                    content: [],
                                  },
                                  updated_at: pages[0]?.updated_at ?? new Date().toString(),
                                }}
                                selected={false}
                                icon="file-arrow-down"
                                dragging={false}
                                renaming={false}
                                onClick={() => {}}
                                onUpdate={() => {}}
                                onDelete={() => {}}
                                setRenaming={() => {}}
                                disabled
                              />
                            </WithTooltip>
                          ) : null}
                          <PageListItem asChild className="tailwind-override text-left">
                            <button
                              className="add-page"
                              onClick={(e) => {
                                e.preventDefault();
                                handleCreatePageClick();
                              }}
                            >
                              <Icon name="plus" />
                              <span className="flex-1">Add another page</span>
                            </button>
                          </PageListItem>
                        </>
                      ) : null}
                    </>
                  </ReactSortable>
                ) : null}
                {isDesktop ? (
                  <>
                    <Card>
                      <ReviewForm
                        permalink=""
                        purchaseId=""
                        review={null}
                        preview
                        className="flex flex-wrap items-center justify-between gap-4 p-4"
                      />
                    </Card>
                    <Card>
                      {nativeType === "membership" ? (
                        <CardContent asChild details>
                          <details>
                            <summary className="grow grid-flow-col grid-cols-[1fr_auto] before:col-start-2" inert>
                              Membership
                            </summary>
                          </details>
                        </CardContent>
                      ) : null}
                      <CardContent asChild details>
                        <details>
                          <summary inert className="grow grid-flow-col grid-cols-[1fr_auto] before:col-start-2">
                            Receipt
                          </summary>
                        </details>
                      </CardContent>
                      <CardContent asChild details>
                        <details>
                          <summary inert className="grow grid-flow-col grid-cols-[1fr_auto] before:col-start-2">
                            Library
                          </summary>
                        </details>
                      </CardContent>
                    </Card>
                    <EntityInfo
                      entityName={selectedVariant ? `${productName} - ${selectedVariant.name}` : productName}
                      creator={seller}
                    />
                  </>
                ) : null}
              </div>
            )
          }
        >
          <div className="relative h-full flex-1">
            {editor?.isEmpty ? (
              <div className="pointer-events-none absolute inset-0 flex items-start">
                <p className="flex flex-wrap items-center gap-1 text-muted">
                  <span>Enter the content you want to sell.</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button small className="pointer-events-auto">
                        Upload your files
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent sideOffset={4} className="pointer-events-auto border-0 p-0 shadow-none">
                      <FileUploadMenu
                        existingFiles={existingFiles}
                        onEmbedMedia={() => setShowEmbedModal(true)}
                        onUploadFile={uploadFileInput}
                        onSelectExistingFiles={() => {
                          setSelectingExistingFiles({ selected: [], query: "", isLoading: true });
                          void fetchLatestExistingFiles();
                        }}
                        onUploadFromDropbox={uploadFromDropbox}
                      />
                    </PopoverContent>
                  </Popover>
                  <span>or start typing.</span>
                </p>
              </div>
            ) : null}
            <EditorContent className="rich-text grid h-full flex-1" editor={editor} data-gumroad-ignore />
          </div>
        </PageListLayout>
      </div>
      {confirmingDeletePage !== null ? (
        <Modal
          open
          onClose={() => setConfirmingDeletePage(null)}
          title="Delete page?"
          footer={
            <>
              <Button onClick={() => setConfirmingDeletePage(null)}>No, cancel</Button>
              <Button
                color="danger"
                onClick={() => {
                  if (!editor) return;
                  updatePages(pages.filter((page) => page !== confirmingDeletePage));
                  setConfirmingDeletePage(null);
                }}
              >
                Yes, delete
              </Button>
            </>
          }
        >
          Are you sure you want to delete the page "{titleWithFallback(confirmingDeletePage.title)}"? Existing customers
          will lose access to this content. This action cannot be undone.
        </Modal>
      ) : null}
      {editor ? (
        <>
          <Modal open={showInsertPostModal} onClose={() => setShowInsertPostModal(false)} title="Insert Twitter post">
            <EmbedMediaForm
              type="twitter"
              onClose={() => setShowInsertPostModal(false)}
              onEmbedReceived={(data) => {
                insertMediaEmbed(editor, data);
                setShowInsertPostModal(false);
              }}
            />
          </Modal>
          <Modal
            open={addingButton != null}
            onClose={() => setAddingButton(null)}
            title="Insert button"
            footer={
              <>
                <Button onClick={() => setAddingButton(null)}>Cancel</Button>
                <Button color="primary" onClick={onInsertButton}>
                  Insert
                </Button>
              </>
            }
          >
            <input
              type="text"
              placeholder="Enter text"
              autoFocus={addingButton != null}
              value={addingButton?.label ?? ""}
              onChange={(el) => setAddingButton({ label: el.target.value, url: addingButton?.url ?? "" })}
              onKeyDown={(el) => {
                if (el.key === "Enter") onInsertButton();
              }}
            />
            <input
              type="text"
              placeholder="Enter URL"
              value={addingButton?.url ?? ""}
              onChange={(el) => setAddingButton({ label: addingButton?.label ?? "", url: el.target.value })}
              onKeyDown={(el) => {
                if (el.key === "Enter") onInsertButton();
              }}
            />
          </Modal>
        </>
      ) : null}
      <UpsellSelectModal isOpen={showUpsellModal} onClose={() => setShowUpsellModal(false)} onInsert={onInsertUpsell} />
      {productId ? (
        <TestimonialSelectModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onInsert={onInsertReviews}
          productId={productId}
        />
      ) : null}
    </>
  );
};
