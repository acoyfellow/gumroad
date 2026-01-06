import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as React from "react";
import { is } from "ts-safe-cast";

import { assert } from "$app/utils/assert";
import { classNames } from "$app/utils/classNames";

import { ButtonColor, buttonColors } from "$app/components/design";

export const brandNames = [
  "paypal",
  "discord",
  "stripe",
  "facebook",
  "twitter",
  "apple",
  "android",
  "kindle",
  "zoom",
  "google",
] as const;

export type BrandName = (typeof brandNames)[number];

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 cursor-pointer border border-border rounded bg-transparent font-inherit no-underline transition-transform hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[0.25rem_0.25rem_0_currentColor] active:translate-x-0 active:translate-y-0 active:shadow-none disabled:opacity-30 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none",
  {
    variants: {
      variant: {
        default: "",
        outline: "bg-transparent",
        secondary: "",
        destructive: "",
      },
      size: {
        default: "px-4 py-3 text-base leading-[1.4]",
        sm: "p-2 text-sm leading-[1.3]",
      },
      color: {
        primary: "bg-black text-white hover:bg-accent hover:text-accent-foreground",
        black: "bg-black text-white",
        accent: "bg-accent text-accent-foreground",
        filled: "bg-white text-black",
        success: "bg-success text-white",
        danger: "bg-danger text-white",
        warning: "bg-warning text-black",
        info: "bg-primary text-primary-foreground",
        paypal: "bg-[#00457c] text-white border-[#00457c]",
        discord: "bg-[#7289da] text-white border-[#7289da]",
        stripe: "bg-[#625bf6] text-white border-[#625bf6]",
        facebook: "bg-[#4267b2] text-white border-[#4267b2]",
        twitter: "bg-black text-white border-black",
        apple: "bg-black text-white border-black",
        android: "bg-[#142f40] text-white border-[#142f40]",
        kindle: "bg-[#f3a642] text-black border-[#f3a642]",
        zoom: "bg-[#4087fc] text-white border-[#4087fc]",
        google: "bg-[#5383ec] text-white border-[#5383ec]",
      },
    },
    compoundVariants: [
      {
        variant: "outline",
        color: "primary",
        className: "bg-transparent text-current hover:bg-black hover:text-white",
      },
      {
        variant: "outline",
        color: "danger",
        className: "bg-transparent text-current hover:bg-danger hover:text-white",
      },
      {
        variant: "outline",
        color: "success",
        className: "bg-transparent text-current hover:bg-success hover:text-white",
      },
      {
        variant: "outline",
        color: "warning",
        className: "bg-transparent text-current hover:bg-warning hover:text-black",
      },
      {
        variant: "outline",
        color: "info",
        className: "bg-transparent text-current hover:bg-primary hover:text-primary-foreground",
      },
      {
        variant: "outline",
        color: "black",
        className: "bg-transparent text-current hover:bg-black hover:text-white",
      },
      {
        variant: "outline",
        color: "accent",
        className: "bg-transparent text-current hover:bg-accent hover:text-accent-foreground",
      },
      {
        variant: "outline",
        color: "filled",
        className: "bg-transparent text-current hover:bg-white hover:text-black",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// Legacy props for backward compatibility
type ButtonVariation = {
  color?: ButtonColor | BrandName | undefined;
  outline?: boolean | undefined;
  small?: boolean | undefined;
};

export interface ButtonProps extends Omit<React.ComponentPropsWithoutRef<"button">, "color">, ButtonVariation {
  asChild?: boolean;
}

const useButtonCommon = ({
  className,
  color,
  outline,
  small,
}: ButtonVariation & { className?: string | undefined }) => {
  useValidateClassName(className);

  const variant = outline ? "outline" : color === "danger" ? "destructive" : "default";
  const size = small ? "sm" : "default";

  const effectiveColor = color;
  const effectiveBrand = brandNames.includes(effectiveColor as BrandName) ? (effectiveColor as BrandName) : undefined;

  const classes = classNames(
    buttonVariants({ variant, size, color: effectiveColor && !outline ? effectiveColor : undefined }),
    className,
  );

  const icon = effectiveBrand && <span className={`brand-icon brand-icon-${effectiveBrand}`} />;

  return { classes, icon };
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, color, outline, small, disabled, children, asChild = false, ...props }, ref) => {
    const { classes, icon } = useButtonCommon({ className, color, outline, small });
    const Comp = asChild ? Slot : "button";

    return (
      <Comp className={classes} ref={ref} disabled={disabled} type={asChild ? undefined : "button"} {...props}>
        {asChild ? (
          children
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export interface NavigationButtonProps extends Omit<React.ComponentPropsWithoutRef<"a">, "color">, ButtonVariation {
  disabled?: boolean | undefined;
}

export const NavigationButton = React.forwardRef<HTMLAnchorElement, NavigationButtonProps>(
  ({ className, color, outline, small, disabled, children, ...props }, ref) => {
    const { icon } = useButtonCommon({ className, color, outline, small });

    return (
      <Button asChild className={className} color={color} outline={outline} small={small} disabled={disabled}>
        <a
          ref={ref}
          inert={disabled}
          {...props}
          onClick={(evt) => {
            if (props.onClick == null) return;

            if (props.href == null || props.href === "#") evt.preventDefault();

            props.onClick(evt);

            evt.stopPropagation();
          }}
        >
          {icon}
          {children}
        </a>
      </Button>
    );
  },
);
NavigationButton.displayName = "NavigationButton";

// Logs warnings whenever `className` changes, instead of on every render
export const useValidateClassName = (className: string | undefined) => {
  if (process.env.NODE_ENV === "production") return;

  React.useEffect(() => validateClassName(className), [className]);
};

// Display warnings when trying to use color/variant/size as class name, suggesting a prop to use instead
const validateClassName = (className: string | undefined) => {
  if (process.env.NODE_ENV === "production") return;

  if (className == null) return;

  const classes = className.split(" ");

  classes.forEach((cls) => {
    assert(cls !== "button", `Button: Using '${cls}' as 'className' prop is unnecessary`);
    assert(!is<ButtonColor>(cls), `Button: Instead of using '${cls}' as a class, use the 'color="${cls}"' prop`);
    assert(
      !buttonColors.some((color) => cls === `outline-${color}`),
      `Button: Instead of using '${cls}' as a class, use the 'color="${cls.replace(
        "outline-",
        "",
      )}" and the 'outline' prop`,
    );
    assert(cls !== "small", `Button: Instead of using '${cls}' as a class, use the 'small' prop`);
  });
};
