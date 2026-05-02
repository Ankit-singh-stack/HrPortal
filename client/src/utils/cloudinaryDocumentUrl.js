/**
 * Cloudinary PDFs stored under /image/upload/ can trigger ERR_INVALID_RESPONSE in some browsers.
 * - New uploads: server uses resource_type raw → /raw/upload/ (works reliably).
 * - Legacy PDFs: try fl_inline in the delivery URL.
 */
export function toDocumentViewUrl(url) {
  if (!url || typeof url !== 'string') return url;
  
  // Use encodeURI to handle spaces in filenames correctly
  let finalUrl = encodeURI(url);
  
  // For image/upload resources (which includes PDFs now), add f_auto to ensure best delivery
  if (finalUrl.includes('/image/upload/') && !finalUrl.includes('/f_auto/')) {
    finalUrl = finalUrl.replace('/image/upload/', '/image/upload/f_auto/');
  }
  
  return finalUrl;
}
