import { API_BASE_URL } from '../constants';

/** Trigger download of a binary file (e.g. Excel export from API). */
export function downloadBlobFile(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Parse filename from Content-Disposition header when present. */
export function parseContentDispositionFilename(
  header: string | null | undefined
): string | null {
  if (!header) return null;

  const utf8Match = header.match(/filename\*=UTF-8''([^;\n]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }

  const quotedMatch = header.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) return quotedMatch[1].trim();

  const plainMatch = header.match(/filename=([^;\n]+)/i);
  if (plainMatch?.[1]) return plainMatch[1].trim().replace(/^"|"$/g, '');

  return null;
}

export function defaultDatedExportFilename(prefix: string, contentType?: string): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const type = contentType?.toLowerCase() ?? '';

  if (type.includes('csv') || type.includes('text/plain')) {
    return `${prefix}_${y}-${m}-${d}.csv`;
  }
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('ms-excel')) {
    return `${prefix}_${y}-${m}-${d}.xlsx`;
  }

  return `${prefix}_${y}-${m}-${d}.csv`;
}

export function defaultDatedXlsxFilename(prefix: string): string {
  return defaultDatedExportFilename(prefix, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/** Last path segment, so `public/planners/backup-plans/file.xlsx` downloads as `file.xlsx`. */
export function fileBaseName(name: string): string {
  const cleaned = name.split('?')[0].split('#')[0];
  try {
    return decodeURIComponent(cleaned.split('/').filter(Boolean).pop() || 'download');
  } catch {
    return cleaned.split('/').filter(Boolean).pop() || 'download';
  }
}

/**
 * In dev, files hosted on the API origin are fetched through the Vite `/exports`
 * proxy so the download stays same-origin. A direct cross-origin link ignores
 * the download name and often does not save the file.
 */
export function sameOriginFileUrl(fileUrl: string): string {
  if (!import.meta.env.DEV || typeof window === 'undefined') return fileUrl;

  try {
    const file = new URL(fileUrl, window.location.origin);
    const api = new URL(API_BASE_URL);
    if (file.origin === window.location.origin || file.origin !== api.origin) return fileUrl;
    if (file.pathname.startsWith('/storage/')) {
      return `${file.pathname}${file.search}`;
    }
    return `/exports${file.pathname}${file.search}`;
  } catch {
    return fileUrl;
  }
}

/** Fetch a remote file URL and trigger browser download. */
export async function downloadFileFromUrl(fileUrl: string, filename: string): Promise<void> {
  const safeName = fileBaseName(filename);
  const url = sameOriginFileUrl(fileUrl);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file (${response.status})`);
    }
    const blob = await response.blob();
    if (!blob.size) {
      throw new Error('Downloaded file is empty');
    }
    downloadBlobFile(safeName, blob);
  } catch (error) {
    if (url.startsWith('/')) throw error;

    const anchor = document.createElement('a');
    anchor.href = fileUrl;
    anchor.download = safeName;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
}
