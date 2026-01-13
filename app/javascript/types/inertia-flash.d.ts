import type { ContentsUpdatedAlertPayload } from "$app/components/ProductEdit/state";
import type { AlertPayload } from "$app/components/server-components/Alert";

type ClientSideAlertPayloads = ContentsUpdatedAlertPayload;

export type FlashData = AlertPayload | ClientSideAlertPayloads | null;

declare module "@inertiajs/core" {
  export interface InertiaConfig {
    flashDataType: FlashData;
  }
}
