import * as React from "react";

import { assertDefined } from "$app/utils/assert";
import { classNames } from "$app/utils/classNames";

import { Icon } from "$app/components/Icons";
import { useUserAgentInfo } from "$app/components/UserAgent";
import { WithTooltip } from "$app/components/WithTooltip";

export const StatsItem = ({
  title,
  description,
  value,
  ...props
}: { title: React.ReactNode; description?: string; value?: string | number } & Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
>) => {
  const { locale } = useUserAgentInfo();
  const [adjustedFontSize, setAdjustedFontSize] = React.useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const valueString = (typeof value === "number" ? value.toLocaleString(locale) : value) ?? "-";

  React.useEffect(() => {
    const calculateFontSize = () => {
      if (!containerRef.current) return;
      const style = window.getComputedStyle(containerRef.current);
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      void document.fonts.ready.then(() => {
        const canvas = document.createElement("canvas");
        const context = assertDefined(canvas.getContext("2d"), "Canvas 2d context missing");
        context.font = `${style.fontSize} ${style.fontFamily}`;
        const valueWidth = context.measureText(valueString).width;
        const fontSize = parseFloat(style.fontSize);
        setAdjustedFontSize(valueWidth > containerWidth ? (containerWidth * fontSize) / valueWidth : fontSize);
      });
    };
    calculateFontSize();
    window.addEventListener("resize", calculateFontSize);
    return () => window.removeEventListener("resize", calculateFontSize);
  }, [value]);

  return (
    <section
      {...props}
      className={classNames(
        "grid content-between gap-2 rounded border border-solid border-border bg-background p-5 text-lg",
        props.className,
      )}
    >
      <h2 className="flex gap-3 text-base leading-snug">
        {title}
        {description ? (
          <WithTooltip tip={description} position="top">
            <Icon name="info-circle" />
          </WithTooltip>
        ) : null}
      </h2>
      <div ref={containerRef} className="overflow-hidden" style={{ overflowWrap: "initial" }}>
        <span style={adjustedFontSize ? { fontSize: adjustedFontSize } : undefined}>{valueString}</span>
      </div>
    </section>
  );
};

export const Stats = ({ children, ...props }: { children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} className={classNames("grid auto-cols-fr gap-4 sm:grid-cols-2 md:grid-flow-col", props.className)}>
    {children}
  </div>
);
