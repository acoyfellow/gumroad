import { router } from "@inertiajs/react";
import * as React from "react";

import { useDebouncedCallback } from "$app/components/useDebouncedCallback";
import { useOnChange } from "$app/components/useOnChange";

type ReceiptPreviewProps = {
  receipt_preview_html: string;
  custom_receipt_text: string | null;
  custom_view_content_button_text: string | null;
};

export const ReceiptPreview = ({
  receipt_preview_html,
  custom_receipt_text,
  custom_view_content_button_text,
}: ReceiptPreviewProps) => {
  const reloadPreview = useDebouncedCallback(() => {
    router.reload({
      data: {
        custom_receipt_text,
        custom_view_content_button_text,
      },
      only: ["receipt_preview_html"],
      preserveUrl: true,
    });
  }, 300);

  useOnChange(reloadPreview, [custom_receipt_text, custom_view_content_button_text]);

  return <div className="dark:[&_.wordmark_img]:invert" dangerouslySetInnerHTML={{ __html: receipt_preview_html }} />;
};
