/**
 * Robustly copies text to the clipboard, providing a fallback for environments 
 * where navigator.clipboard might be unavailable or restricted (like Discord Activities).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    // Try modern navigator.clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn('navigator.clipboard.writeText failed, trying fallback:', err);
        }
    }

    // Fallback to document.execCommand('copy')
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;

        // Ensure the textarea is off-screen but still part of the DOM
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        return successful;
    } catch (err) {
        console.error('Fallback copyToClipboard failed:', err);
        return false;
    }
}
