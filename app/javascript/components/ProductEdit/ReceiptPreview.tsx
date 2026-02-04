import * as React from "react";

import { request, assertResponseError } from "$app/utils/request";

import { useProductEditContext } from "$app/components/ProductEdit/state";
import { useDebouncedCallback } from "$app/components/useDebouncedCallback";
import { useOnChange } from "$app/components/useOnChange";
import { useRunOnce } from "$app/components/useRunOnce";

type ReceiptPreviewProps = {
  customReceiptText: string | null;
  customViewContentButtonText: string | null;
};

export const ReceiptPreview = ({ customReceiptText, customViewContentButtonText }: ReceiptPreviewProps) => {
  const { uniquePermalink } = useProductEditContext();
  const [receiptHtml, setReceiptHtml] = React.useState<string>("");

  const fetchReceiptPreview = React.useCallback(async () => {
    try {
      const url = Routes.internal_product_receipt_preview_path(uniquePermalink, {
        params: {
          custom_receipt_text: customReceiptText,
          custom_view_content_button_text: customViewContentButtonText,
        },
      });

      const response = await request({
        method: "GET",
        url,
        accept: "html",
      });

      const html = await response.text();
      setReceiptHtml(html);
    } catch (error) {
      assertResponseError(error);
      setReceiptHtml("Error loading receipt preview");
    }
  }, [uniquePermalink, customReceiptText, customViewContentButtonText]);

  const debouncedFetchReceiptPreview = useDebouncedCallback(() => void fetchReceiptPreview(), 300);

  useRunOnce(() => void fetchReceiptPreview());
  useOnChange(debouncedFetchReceiptPreview, [uniquePermalink, customReceiptText, customViewContentButtonText]);

  return <div className="dark:[&_.wordmark_img]:invert" dangerouslySetInnerHTML={{ __html: receiptHtml }} />;
};
