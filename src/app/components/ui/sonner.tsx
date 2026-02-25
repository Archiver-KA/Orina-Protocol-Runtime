"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          "--normal-bg": "#141417",
          "--normal-text": "#fafafa",
          "--normal-border": "#27272a",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };