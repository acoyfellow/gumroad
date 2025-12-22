import { usePage } from "@inertiajs/react";
import React from "react";

import { useExternalScripts } from "$app/hooks/useExternalScripts";

import { WidgetsPage, type WidgetsPageProps } from "$app/components/server-components/Developer/WidgetsPage";

function PublicWidgets() {
  const props = usePage<WidgetsPageProps>().props;

  useExternalScripts(["/js/gumroad.js", "/js/gumroad-embed.js"]);

  return <WidgetsPage {...props} />;
}

export default PublicWidgets;
