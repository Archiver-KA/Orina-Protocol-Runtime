/**
 * Safe Clipboard Utility
 * Handles clipboard operations with proper fallbacks for restricted contexts
 * This handles Permissions Policy restrictions and other clipboard access issues
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  // Quick check: if in iframe or clipboard not available, use fallback immediately
  const isInIframe = window.self !== window.top;
  
  if (isInIframe || !navigator.clipboard || !navigator.clipboard.writeText) {
    // Use fallback method directly
    return fallbackCopyToClipboard(text);
  }
  
  // Method 1: Try modern Clipboard API (silently, no error logging)
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Silently fall back - don't log as this is expected when Permissions Policy blocks it
    return fallbackCopyToClipboard(text);
  }
}

// Fallback copy method using textarea
function fallbackCopyToClipboard(text: string): boolean {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    
    // Make textarea invisible and position it off-screen
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '2em';
    textarea.style.height = '2em';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    
    document.body.appendChild(textarea);
    
    // Focus and select the text
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    
    // Execute copy command
    const successful = document.execCommand('copy');
    
    // Clean up
    document.body.removeChild(textarea);
    
    if (!successful) {
      console.warn('Clipboard copy failed - execCommand returned false');
    }
    
    return successful;
  } catch (error) {
    console.error('All clipboard methods failed:', error);
    return false;
  }
}

/**
 * Copy text with toast notification
 * Returns true if successful
 */
export async function copyWithToast(
  text: string,
  toast: any,
  successMessage: string = 'Copied to clipboard!',
  errorMessage: string = 'Failed to copy. Please copy manually.'
): Promise<boolean> {
  const success = await copyToClipboard(text);
  
  if (success) {
    toast.success(successMessage);
  } else {
    toast.error(errorMessage);
  }
  
  return success;
}