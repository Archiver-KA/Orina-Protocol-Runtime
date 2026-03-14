import { useState, RefObject } from "react";

interface CopyHtmlButtonProps {
  targetRef: RefObject<HTMLDivElement | null>;
  isDark: boolean;
}

export function CopyHtmlButton({ targetRef, isDark }: CopyHtmlButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  const handleCopy = async () => {
    if (!targetRef.current) return;
    const html = targetRef.current.outerHTML;

    // Method 1: Modern Clipboard API (requires HTTPS / focus)
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(html);
        setState("copied");
        setTimeout(() => setState("idle"), 2000);
        return;
      } catch {
        // fall through to legacy method
      }
    }

    // Method 2: Legacy execCommand fallback (works in iframes / HTTP)
    try {
      const ta = document.createElement("textarea");
      ta.value = html;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      setState(ok ? "copied" : "error");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  };

  const accent = "#2CC295";
  const border = state === "copied" ? "#00DF81" : state === "error" ? "#ef4444" : (isDark ? "#095554" : "#27AB8C");
  const bg     = state === "copied" ? (isDark ? "#08453A" : "#e6fdf4") : state === "error" ? (isDark ? "#3b0f0f" : "#fde8e8") : (isDark ? "#022221" : "#f8fafc");
  const color  = state === "copied" ? "#00DF81" : state === "error" ? "#ef4444" : (isDark ? "#9297BB" : "#64748B");

  return (
    <button
      onClick={handleCopy}
      title="Copy diagram HTML"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 9px",
        border: `1px solid ${border}`,
        borderRadius: "4px",
        background: bg,
        cursor: "pointer",
        transition: "border-color 0.2s, color 0.2s",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "9px",
        letterSpacing: "0.5px",
        color,
        whiteSpace: "nowrap",
      }}
    >
      {state === "copied" ? (
        <>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1.5 5.5L4 8L9.5 2.5" stroke="#00DF81" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied!
        </>
      ) : state === "error" ? (
        <>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M2 2l7 7M9 2L2 9" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Failed
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <rect x="3.5" y="1" width="6.5" height="7.5" rx="1" stroke={color} strokeWidth="1.1" />
            <path d="M1 3.5h1.5M1 3.5V9.5a1 1 0 001 1H8" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
          </svg>
          Copy HTML
        </>
      )}
    </button>
  );
}