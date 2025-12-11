import cx from "classnames";
import * as React from "react";

export const Logo = ({ className, ...props }: React.JSX.IntrinsicElements["span"]) => (
  <span
    className={cx(
      "inline-block min-h-[max(1lh,1em)] shrink-0 bg-current [mask-size:contain] [mask-position:center] [mask-repeat:no-repeat]",
      "w-[calc(157/22*1em)] mask-[url(~images/logo.svg)]",
      className,
    )}
    {...props}
  />
);
