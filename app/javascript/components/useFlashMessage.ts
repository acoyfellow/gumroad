import { router, usePage } from "@inertiajs/react";
import * as React from "react";
import { createIs, is } from "ts-safe-cast";

import type { ClientSideAlertPayloads, FlashData } from "$app/types/inertia-flash";
import { sanitizeHtml } from "$app/utils/sanitize";

import type { ContentsUpdatedAlertPayload } from "$app/components/ProductEdit/state";
import { showAlert, type AlertPayload } from "$app/components/server-components/Alert";

export function useFlashMessage(flash?: FlashData): void {
  React.useEffect(() => {
    if (!is<AlertPayload>(flash)) return;
    showAlert(
      flash.html ? sanitizeHtml(flash.message) : flash.message,
      flash.status === "danger" ? "error" : flash.status,
      { html: flash.html ?? false },
    );
    router.replaceProp("flash", null);
  }, [flash]);
}

type StatusToPayload<S extends ClientSideAlertPayloads["status"]> = Extract<ClientSideAlertPayloads, { status: S }>;

const TYPE_GUARDED_PAYLOADS: {
  [K in ClientSideAlertPayloads["status"]]: ReturnType<typeof createIs<StatusToPayload<K>>>;
} = {
  frontend_alert_contents_updated: createIs<ContentsUpdatedAlertPayload>(),
};

export const useClientFlashMesage = <S extends ClientSideAlertPayloads["status"]>(
  status: S,
): {
  flashData: StatusToPayload<S> | null;
  clear: () => void;
} => {
  const { flash } = usePage<{ flash: FlashData }>().props;
  const [flashData, setFlashData] = React.useState<StatusToPayload<S> | null>(null);
  const isClientSideAlertData = TYPE_GUARDED_PAYLOADS[status];

  React.useEffect(() => {
    if (isClientSideAlertData(flash)) {
      setFlashData(flash);
      router.replaceProp("flash", null);
    }
  }, [flash, status, isClientSideAlertData]);

  return {
    flashData,
    clear: () => {
      setFlashData(null);
    },
  };
};
