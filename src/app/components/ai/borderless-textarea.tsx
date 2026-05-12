import React, { forwardRef, useCallback, useEffect, useLayoutEffect, useRef } from 'react';

interface BorderlessTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoResize?: boolean;
  baseAutoHeight?: number;
  maxAutoHeight?: number;
  onHeightChange?: (height: number) => void;
}

export function getBorderlessTextareaOverrideCss(): string {
  return `
    html body textarea.ai-borderless-textarea-core,
    html body textarea.ai-borderless-textarea-core:focus,
    html body textarea.ai-borderless-textarea-core:active,
    html body textarea.ai-borderless-textarea-core:focus-visible,
    html body textarea.ai-borderless-textarea-core:focus-within,
    html body [data-theme="light"] textarea.ai-borderless-textarea-core:focus,
    html body [data-theme="dark"] textarea.ai-borderless-textarea-core:focus,
    html body .studio-modal-theme textarea.ai-borderless-textarea-core:focus {
      border: 0px solid transparent !important;
      border-color: transparent !important;
      box-shadow: none !important;
      outline: none !important;
      background-color: transparent !important;
      --tw-ring-color: transparent !important;
      --tw-ring-shadow: 0 0 transparent !important;
      --tw-ring-offset-shadow: 0 0 transparent !important;
      -webkit-appearance: none !important;
      -webkit-box-shadow: none !important;
    }
  `;
}

export const BorderlessTextarea = forwardRef<HTMLTextAreaElement, BorderlessTextareaProps>(
  ({ className = '', style, id = 'ai-chat-input-core', autoResize = false, baseAutoHeight, maxAutoHeight, onInput, onHeightChange, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const resolvedMaxAutoHeight = maxAutoHeight ?? ((baseAutoHeight ?? 0) > 0 ? (baseAutoHeight ?? 0) * 3 : 120);

    const assignRef = useCallback((node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;

      if (typeof ref === 'function') {
        ref(node);
        return;
      }

      if (ref) {
        ref.current = node;
      }
    }, [ref]);

    const resizeTextarea = useCallback(() => {
      if (!autoResize || !textareaRef.current) return;

      const node = textareaRef.current;
      const nextHeight = Math.min(Math.max(node.scrollHeight, baseAutoHeight ?? 0), resolvedMaxAutoHeight);
      node.style.height = 'auto';
      node.style.height = `${nextHeight}px`;
      node.style.overflowY = node.scrollHeight > resolvedMaxAutoHeight ? 'auto' : 'hidden';
      onHeightChange?.(nextHeight);
    }, [autoResize, baseAutoHeight, onHeightChange, resolvedMaxAutoHeight]);

    useEffect(() => {
      if (typeof document !== 'undefined') {
        const styleId = 'force-ai-borderless-override-style';
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = styleId;
          document.head.appendChild(styleEl);
        }
        styleEl.textContent = getBorderlessTextareaOverrideCss();
      }
    }, []);

    useLayoutEffect(() => {
      resizeTextarea();
    }, [resizeTextarea, props.value]);

    return (
      <div className="relative min-w-0 flex-1 self-end">
        <textarea
          id={id}
          ref={assignRef}
          className={`ai-borderless-textarea-core w-full !border-0 !border-transparent !ring-0 !outline-none !shadow-none focus:!border-0 focus:!border-transparent focus:!ring-0 focus:!outline-none focus:!shadow-none [overflow-wrap:anywhere] ${className}`}
          style={{
            ...style,
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            WebkitAppearance: 'none'
          }}
          onInput={(event) => {
            resizeTextarea();
            onInput?.(event);
          }}
          {...props}
        />
      </div>
    );
  }
);

BorderlessTextarea.displayName = 'BorderlessTextarea';
