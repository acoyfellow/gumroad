import * as React from "react";

import { Button } from "$app/components/Button";

import { Popover } from "$app/components/Popover";

type Props = { iosAppUrl: string; androidAppUrl: string };

export const OpenInAppButton = ({ iosAppUrl, androidAppUrl }: Props) => (
  <Popover
    trigger={
      <Button asChild>
        <span>Open in app</span>
      </Button>
    }
  >
    <div
      className="mx-auto"
      style={{
        display: "grid",
        textAlign: "center",
        gap: "var(--spacer-4)",
        width: "18rem",
      }}
    >
      <h3>Gumroad Library</h3>
      <div>Download from the App Store</div>
      <div
        style={{
          display: "grid",
          gap: "var(--spacer-4)",
          gridAutoFlow: "column",
          justifyContent: "space-between",
        }}
      >
        <Button asChild>
          <a className="button-apple" href={iosAppUrl} target="_blank" rel="noreferrer">
            App Store
          </a>
        </Button>
        <Button asChild>
          <a className="button-android" href={androidAppUrl} target="_blank" rel="noreferrer">
            Play Store
          </a>
        </Button>
      </div>
    </div>
  </Popover>
);
