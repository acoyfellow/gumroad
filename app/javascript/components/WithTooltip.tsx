import * as Tooltip from "@radix-ui/react-tooltip";
import * as React from "react";

export type Position = "top" | "left" | "bottom" | "right";

export const tooltipClasses = "w-40 z-30 max-w-max rounded-md bg-primary p-3 text-primary-foreground";

export const WithTooltip = ({
  tip,
  children,
  open,
  triggerProps,
  ...props
}: {
  tip: React.ReactNode | null;
  children: React.ReactNode;
  open?: boolean;
  triggerProps?: Tooltip.TooltipTriggerProps;
} & Tooltip.TooltipContentProps) => {
  if (tip == null) return children;

  return (
    <Tooltip.Root {...(open ? { open } : {})}>
      <Tooltip.Trigger asChild {...triggerProps}>
        <div>{children}</div>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content onPointerDownOutside={(e) => e.preventDefault()} {...props} className={tooltipClasses}>
          <Tooltip.Arrow className="fill-primary" />
          {tip}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
