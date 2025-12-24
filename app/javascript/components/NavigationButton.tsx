import { Link } from "@inertiajs/react";
import * as React from "react";

import { classNames } from "$app/utils/classNames";

import { buttonVariants, NavigationButtonProps, useValidateClassName } from "$app/components/Button";

/*
    This component is for inertia specific navigation button,
    since the other NavigationButton is used in a lot of ssr pages  and we can't import inertia Link there
*/
export const NavigationButtonInertia = React.forwardRef<HTMLAnchorElement, NavigationButtonProps>(
  ({ className, color, outline, small, disabled, children, style, onClick, ...props }, ref) => {
    useValidateClassName(className);

    const variant = outline ? "outline" : color === "danger" ? "destructive" : "default";
    const size = small ? "sm" : "default";

    const combinedStyle: React.CSSProperties = {
      ...(style || {}),
      ...(disabled ? { pointerEvents: "none", cursor: "not-allowed", opacity: 0.3 } : {}),
    };

    return (
      <Link
        className={classNames(
          buttonVariants({ variant, size, color: color && !outline ? color : undefined }),
          className,
          "no-underline",
        )}
        ref={ref}
        {...props}
        {...(onClick ? { onClick } : {})}
        {...(disabled ? { inert: "" } : {})}
        style={combinedStyle}
      >
        {children}
      </Link>
    );
  },
);
NavigationButtonInertia.displayName = "NavigationButtonInertia";
