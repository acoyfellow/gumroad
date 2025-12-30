import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { classNames } from "$app/utils/classNames";

type StackProps = React.PropsWithChildren<{
  className?: string | undefined;
  asChild?: boolean;
  borderless?: boolean;
  main?: boolean;
}> &
  React.HTMLAttributes<HTMLElement>;

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, asChild, borderless = false, main, children, ...rest }, ref) => {
    const Component = asChild ? Slot : "div";
    const baseClasses = "grid bg-background border border-border rounded stack-component";

    const mainStackClasses = main
      ? "h-min my-4 mx-auto max-w-md w-[calc(100%-2*1rem)] [&>*]:flex-col [&>*]:items-stretch"
      : "";

    const borderlessClasses = borderless ? "border-none gap-4 [&>*]:p-0 [&>*]:border-none" : "";

    return (
      <Component
        ref={ref}
        className={classNames(baseClasses, mainStackClasses, borderlessClasses, className)}
        {...rest}
      >
        {children}
      </Component>
    );
  },
);

type StackItemProps = React.PropsWithChildren<{
  className?: string | undefined;
  asChild?: boolean;
  details?: boolean;
}> &
  React.HTMLAttributes<HTMLElement>;

export const StackItem = React.forwardRef<HTMLDivElement, StackItemProps>(
  ({ className, asChild, details, children, ...rest }, ref) => {
    const baseClasses =
      "flex flex-wrap items-center p-4 gap-4 justify-between not-first:border-t not-first:border-border";

    const detailsClasses = details ? "block" : "";
    const Component = asChild ? Slot : "div";

    return (
      <Component ref={ref} className={classNames(baseClasses, detailsClasses, className)} {...rest}>
        {children}
      </Component>
    );
  },
);

Stack.displayName = "Stack";
StackItem.displayName = "StackItem";
