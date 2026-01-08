import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

import { classNames } from "$app/utils/classNames";

export const Popover = PopoverPrimitive.Root;

export const PopoverClose = PopoverPrimitive.Close;

export const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <PopoverPrimitive.Trigger
    ref={ref}
    className={classNames("outline-none focus-visible:outline-none", className)}
    {...props}
  />
));
PopoverTrigger.displayName = PopoverPrimitive.Trigger.displayName;

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    matchTriggerWidth?: boolean;
    arrowClassName?: string;
    usePortal?: boolean;
  }
>(
  (
    {
      children,
      className,
      arrowClassName,
      align = "start",
      collisionPadding = 16,
      matchTriggerWidth = false,
      usePortal = false,
      ...props
    },
    ref,
  ) => {
    const content = (
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        collisionPadding={collisionPadding}
        autoFocus={false}
        onOpenAutoFocus={(e: Event) => e.preventDefault()}
        className={classNames(
          "z-30 w-max max-w-[calc(100vw-2rem)] rounded-sm border border-border bg-background p-4 text-foreground shadow outline-none focus-visible:outline-none",
          { "w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)]": matchTriggerWidth },
          className,
        )}
        {...props}
      >
        {children}
        <PopoverPrimitive.Arrow
          width={16}
          height={8}
          className={classNames("fill-black dark:fill-foreground/35", arrowClassName)}
        />
      </PopoverPrimitive.Content>
    );

    return usePortal ? <PopoverPrimitive.Portal>{content}</PopoverPrimitive.Portal> : content;
  },
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;
