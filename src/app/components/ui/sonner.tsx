"use client";

import type { CSSProperties } from "react";
import { AlertTriangle, CheckCircle, Info, Loader2, X, XCircle } from "lucide-react";
import { Toaster as Sonner, ToasterProps } from "sonner";
import { useTheme } from "@/app/contexts/ThemeContext";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      closeButton
      icons={{
        success: <CheckCircle size={20} className="text-[#2CC295]" />,
        error: <XCircle size={20} className="text-[#ef4444]" />,
        warning: <AlertTriangle size={20} className="text-[#f59e0b]" />,
        info: <Info size={20} className="text-[#2CC295]" />,
        loading: <Loader2 size={20} className="animate-spin text-[#2CC295]" />,
        close: <X size={16} />,
      }}
      toastOptions={{
        duration: 5000,
        unstyled: true,
        classNames: {
          toast:
            "group pointer-events-auto flex w-full max-w-md items-start gap-4 rounded-[18px] border border-[var(--t-border-subtle)] border-l-4 bg-[color:var(--color-sidebar-shell)] p-4 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.3),0_10px_10px_-5px_rgba(0,0,0,0.2)] backdrop-blur-[16px]",
          content: "flex-1 min-w-0",
          title: "text-sm font-semibold text-ui-strong",
          description: "mt-1 text-xs leading-relaxed text-ui-muted",
          icon: "mt-1 shrink-0",
          closeButton:
            "mt-0.5 shrink-0 text-ui-muted transition-colors hover:text-ui-strong focus:outline-none",
          success: "border-l-[#2CC295]",
          error: "border-l-[#ef4444]",
          warning: "border-l-[#f59e0b]",
          info: "border-l-[#2CC295]",
          loading: "border-l-[#2CC295]",
          default: "border-l-[#2CC295]",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
