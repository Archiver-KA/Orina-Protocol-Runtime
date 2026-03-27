import React, { forwardRef, useEffect } from 'react';

interface BorderlessTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const BorderlessTextarea = forwardRef<HTMLTextAreaElement, BorderlessTextareaProps>(
  ({ className = '', style, id = 'ai-chat-input-core', ...props }, ref) => {
    
    useEffect(() => {
      // Create a style element in the document head ONLY ONCE to completely bypass React re-renders.
      // This guarantees the CSS is present and active even if hot-reloading fails to parse global CSS.
      if (typeof document !== 'undefined') {
        const styleId = 'force-ai-borderless-override-style';
        if (!document.getElementById(styleId)) {
          const styleEl = document.createElement('style');
          styleEl.id = styleId;
          styleEl.innerHTML = `
            /* Overwhelming specificity to instantly crush theme.css regardless of source order */
            html body textarea#${id}.ai-borderless-textarea-core,
            html body textarea#${id}.ai-borderless-textarea-core:focus,
            html body textarea#${id}.ai-borderless-textarea-core:active,
            html body textarea#${id}.ai-borderless-textarea-core:focus-visible,
            html body textarea#${id}.ai-borderless-textarea-core:focus-within,
            html body [data-theme="light"] textarea#${id}.ai-borderless-textarea-core:focus,
            html body [data-theme="dark"] textarea#${id}.ai-borderless-textarea-core:focus,
            html body .studio-modal-theme textarea#${id}.ai-borderless-textarea-core:focus {
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
          document.head.appendChild(styleEl);
        }
      }
    }, [id]);

    return (
      <div className="relative flex-1 flex flex-col justify-center">
        <textarea
          id={id}
          ref={ref}
          className={`ai-borderless-textarea-core w-full !border-0 !border-transparent !ring-0 !outline-none !shadow-none focus:!border-0 focus:!border-transparent focus:!ring-0 focus:!outline-none focus:!shadow-none ${className}`}
          style={{ 
            ...style, 
            border: 'none', 
            outline: 'none', 
            boxShadow: 'none',
            WebkitAppearance: 'none'
          }}
          {...props}
        />
      </div>
    );
  }
);

BorderlessTextarea.displayName = 'BorderlessTextarea';
