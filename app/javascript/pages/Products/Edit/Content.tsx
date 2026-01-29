import { useForm, usePage } from "@inertiajs/react";
import * as React from "react";
import { generateJSON } from "@tiptap/core";
import { DOMSerializer } from "@tiptap/pm/model";
import { EditorContent } from "@tiptap/react";
import { ReactSortable } from "react-sortablejs";

import { Layout } from "$app/components/ProductEdit/Layout";
import { ProductPreview } from "$app/components/ProductEdit/ProductPreview";
import { ExistingFileEntry, FileEntry, Variant } from "$app/components/ProductEdit/state";
import {
  baseEditorOptions,
  getInsertAtFromSelection,
  RichTextEditorToolbar,
  useRichTextEditor,
} from "$app/components/RichTextEditor";
import { EvaporateUploaderProvider, useEvaporateUploader } from "$app/components/EvaporateUploader";
import { S3UploadConfigProvider, useS3UploadConfig } from "$app/components/S3UploadConfig";
import { useConfigureEvaporate } from "$app/components/useConfigureEvaporate";
import { useRefToLatest } from "$app/components/useRefToLatest";
import { Button } from "$app/components/Button";
import { Icon } from "$app/components/Icons";
import { Tabs, Tab } from "$app/components/ui/Tabs";
import { showAlert } from "$app/components/server-components/Alert";
import GuidGenerator from "$app/utils/guid_generator";
import FileUtils from "$app/utils/file";
import { getMimeType } from "$app/utils/mimetypes";
import { assertDefined } from "$app/utils/assert";
import { getDownloadUrl } from "$app/components/ProductEdit/ContentTab/FileEmbed";

import { FileEmbed, FileEmbedConfig } from "$app/components/ProductEdit/ContentTab/FileEmbed";
import { FileEmbedGroup } from "$app/components/ProductEdit/ContentTab/FileEmbedGroup";
import { Page, PageTab } from "$app/components/ProductEdit/ContentTab/PageTab";
import { extensions } from "$app/components/ProductEdit/ContentTab/index";
import { type Product} from "$app/components/ProductEdit/state";

type ContentPageProps = {
  product: Product;
  id: string;
  unique_permalink: string;
  existing_files: ExistingFileEntry[];
  aws_access_key_id: string;
  s3_url: string;
  user_id: string;
};

const ContentTabContent = ({
  form,
  selectedVariantId,
  updateProduct,
  existingFiles,
  save,
  filesById,
}: {
  form: any;
  selectedVariantId: string | null;
  updateProduct: (data: any) => void;
  existingFiles: ExistingFileEntry[];
  save: () => void;
  filesById: Map<string, FileEntry>;
}) => {
  const product = form.data;

  const selectedVariant = product.has_same_rich_content_for_all_variants
    ? null
    : product.variants.find((variant: Variant) => variant.id === selectedVariantId);
  const pages: (Page & { chosen?: boolean })[] = selectedVariant ? selectedVariant.rich_content : product.rich_content;

  const updatePages = (newPages: Page[]) => {
    if (selectedVariant) {
      const newVariants = product.variants.map((v: Variant) =>
        v.id === selectedVariantId ? { ...v, rich_content: newPages } : v,
      );
      updateProduct({ variants: newVariants });
    } else {
      updateProduct({
        has_same_rich_content_for_all_variants: true,
        rich_content: newPages,
      });
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

  const showPageList =
    pages.length > 1 || selectedPage?.title || renamingPageId != null || product.native_type === "commission";

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
          updateProduct({}); // Trigger re-render
        },
        onProgress: (progress) => {
          fileStatus.uploadStatus = { type: "uploading", progress };
          updateProduct({}); // Trigger re-render
        },
      });

      if (typeof status === "string") {
        showAlert(status, "error");
      }
      return fileEntry;
    });

    updateProduct({ files: [...product.files, ...fileEntries] });
    onSelectFiles(fileEntries.map((file) => file.id));
  };

  const fileEmbedGroupConfig = useRefToLatest({
    productId: product.id,
    variantId: selectedVariantId,
    prepareDownload: async () => save(),
    filesById,
  });

  const fileEmbedConfig = useRefToLatest<FileEmbedConfig>({ filesById });
  const uploadFilesRef = useRefToLatest(uploadFiles);

  const contentEditorExtensions = extensions(product.id, [
    FileEmbedGroup.configure({ getConfig: () => fileEmbedGroupConfig.current }),
    FileEmbed.configure({ getConfig: () => fileEmbedConfig.current }),
  ]);

  const editor = useRichTextEditor({
    ariaLabel: "Content editor",
    placeholder: "Enter the content you want to sell. Upload your files or start typing.",
    initialValue,
    editable: true,
    extensions: contentEditorExtensions,
    onInputNonImageFiles: (files) => uploadFilesRef.current(files),
  });

  const updateContentRef = useRefToLatest(() => {
    if (!editor) return;

    const fragment = DOMSerializer.fromSchema(editor.schema).serializeFragment(editor.state.doc.content);
    const newFiles: FileEntry[] = [];
    fragment.querySelectorAll("file-embed[url]").forEach((node) => {
      const id = node.getAttribute("id");
      const url = node.getAttribute("url");
      const file = existingFiles.find((f) => f.id === id || f.url === url);

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

    updateProduct({ files: [...product.files.filter((f: FileEntry) => !newFiles.includes(f)), ...newFiles] });

    const description = generateJSON(
      new XMLSerializer().serializeToString(fragment),
      baseEditorOptions(contentEditorExtensions).extensions,
    );

    if (selectedPage) updatePages(pages.map((page) => (page === selectedPage ? { ...page, description } : page)));
    else addPage(description);
  });

  const handleCreatePageClick = () => {
    const newPage = addPage();
    setRenamingPageId(newPage.id);
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

  return (
    <div className="flex h-full flex-col md:flex-row md:items-stretch">
      {showPageList && (
        <div className="flex w-full flex-col border-b md:w-64 md:border-r md:border-b-0">
          <div className="flex flex-1 flex-col overflow-y-auto p-4">
            <ReactSortable
              list={pages}
              setList={updatePages}
              handle=".drag-handle"
              animation={150}
              className="flex flex-col gap-2"
            >
              {pages.map((page) => (
                <PageTab
                  key={page.id}
                  page={page}
                  selected={selectedPageId === page.id}
                  dragging={false}
                  icon="file-text"
                  onClick={() => setSelectedPageId(page.id)}
                  renaming={renamingPageId === page.id}
                  setRenaming={(renaming) => {
                    if (!renaming) {
                      setRenamingPageId(null);
                    } else {
                      setRenamingPageId(page.id);
                    }
                  }}
                  onUpdate={(title: string) => {
                    updatePages(pages.map((p) => (p.id === page.id ? { ...p, title } : p)));
                    setRenamingPageId(null);
                  }}
                  onDelete={() => {}}
                />
              ))}
            </ReactSortable>
            <Button onClick={handleCreatePageClick} className="mt-2 w-full justify-center">
              <Icon name="plus" /> Add page
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-1 flex-col overflow-hidden">
        {editor ? <RichTextEditorToolbar editor={editor} className="border-b p-2" /> : null}
        <div className="flex-1 overflow-y-auto p-4">
          <EditorContent editor={editor} className="prose max-w-none" />
        </div>
      </div>
    </div>
  );
};

export default function ContentPage() {
  const props = usePage<ContentPageProps>().props;
  const { product, existing_files, aws_access_key_id, s3_url, user_id, id, unique_permalink } = props;

  const form = useForm({
    ...product,
    files: product.files || [],
  });

  const variants = product.variants || [];
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(
    variants.length > 0 && !product.has_same_rich_content_for_all_variants && variants[0] ? variants[0].id : null,
  );

  const filesById = React.useMemo(
    () => new Map(form.data.files.map((file) => [file.id, { ...file, url: getDownloadUrl(id, file) }])),
    [form.data.files, id],
  );

  const handleSave = () => {
    form.patch(`/products/edit/${unique_permalink}/content`, {
      preserveScroll: true,
    });
  };

  const { s3UploadConfig, evaporateUploader } = useConfigureEvaporate({ aws_access_key_id, s3_url, user_id });

  return (
    <S3UploadConfigProvider value={s3UploadConfig}>
      <EvaporateUploaderProvider value={evaporateUploader}>
        <Layout
          preview={
            <ProductPreview
              product={product}
              id={id}
              uniquePermalink={unique_permalink}
              currencyType="usd"
              ratings={null as any}
              seller_refund_policy_enabled={false}
              seller_refund_policy={{ title: "", fine_print: "" }}
            />
          }
          currentTab="content"
          onSave={handleSave}
          isSaving={form.processing}
        >
          <div className="flex h-full flex-col">
            {product.variants.length > 0 && (
              <Tabs className="px-4 pt-4">
                <Tab isSelected={selectedVariantId === null} onClick={() => setSelectedVariantId(null)}>
                  Shared content
                </Tab>
                {product.variants.map((variant) => (
                  <Tab
                    key={variant.id}
                    isSelected={selectedVariantId === variant.id}
                    onClick={() => setSelectedVariantId(variant.id)}
                  >
                    {variant.name}
                  </Tab>
                ))}
              </Tabs>
            )}
            <div className="flex-1 bg-white">
              <ContentTabContent
                form={form}
                selectedVariantId={selectedVariantId}
                updateProduct={(data) => {
                  Object.keys(data).forEach((key) => form.setData(key as any, (data as any)[key]));
                }}
                existingFiles={existing_files}
                save={handleSave}
                filesById={filesById}
              />
            </div>
          </div>
        </Layout>
      </EvaporateUploaderProvider>
    </S3UploadConfigProvider>
  );
}
