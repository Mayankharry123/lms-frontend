import React, { useEffect, useMemo, useState } from 'react';

type RemoteSource = { kind: 'remote'; url: string; name?: string; submissionDate?: string };
type FileSource = { kind: 'file'; file: File; submissionDate?: string };
type Source = RemoteSource | FileSource;

const getExt = (name: string | undefined) => (name || '').split('.').pop()?.toLowerCase() || '';

const isImage = (ext: string) => ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext);
const isPdf = (ext: string) => ext === 'pdf';
const isText = (ext: string) => ['txt', 'log', 'md', 'csv'].includes(ext);
const isOffice = (ext: string) => ['ppt', 'pptx', 'pptm', 'pps', 'ppsx', 'xls', 'xlsx', 'doc', 'docx', 'odp', 'ods'].includes(ext);

const FilePreviewModal: React.FC<{
  isOpen: boolean;
  source?: Source | null;
  onClose: () => void;
  className?: string;
  overlayClassName?: string;
  panelClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  closeButtonClassName?: string;
}> = ({
  isOpen,
  source,
  onClose,
  className,
  overlayClassName,
  panelClassName,
  headerClassName,
  bodyClassName,
  closeButtonClassName,
}) => {
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const name = useMemo(() => {
    if (!source) return undefined;
    return source.kind === 'file' ? source.file.name : source.name || source.url.split('/').pop();
  }, [source]);

  const ext = useMemo(() => getExt(name), [name]);

  useEffect(() => {
    if (!source) return;
    if (source.kind === 'file') {
      const url = URL.createObjectURL(source.file);
      setLocalUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setLocalUrl(null);
      };
    }
    return undefined;
  }, [source]);

  const rawSrc = source ? (source.kind === 'file' ? localUrl : source.url) : null;
  const src = useMemo(() => {
    if (!rawSrc) return '';
    if (source?.kind === 'file') return rawSrc;
    try {
      return encodeURI(decodeURI(rawSrc));
    } catch {
      return rawSrc;
    }
  }, [rawSrc, source?.kind]);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  if (!isOpen || !source) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${className || ''}`.trim()}>
      <div
        className={`absolute inset-0 bg-black/50 ${overlayClassName || ''}`.trim()}
        onClick={onClose}
      />
      <div
        className={`relative bg-white w-[90%] md:w-3/4 lg:w-2/3 max-h-[90%] overflow-auto rounded shadow-lg ${panelClassName || ''}`.trim()}
      >
        <div className={`flex items-center justify-between p-4 border-b ${headerClassName || ''}`.trim()}>
          <div className="flex flex-col pr-4">
            <div className="text-sm font-semibold text-gray-800 break-all">{name || 'File Preview'}</div>
            {source.submissionDate && (
              <div className="text-xs text-gray-500 mt-0.5">
                <span className="font-medium text-gray-600">Submission Date:</span> {source.submissionDate}
              </div>
            )}
          </div>
          <button
            type="button"
            className={`bg-secondary flex-shrink-0 ${closeButtonClassName || ''}`.trim()}
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className={`p-4 ${bodyClassName || ''}`.trim()}>
          {src && isImage(ext) && !imageError && (
            <img
              src={src}
              alt={name || 'image'}
              className="mx-auto max-h-[70vh] object-contain rounded"
              onError={() => setImageError(true)}
            />
          )}

          {src && isImage(ext) && imageError && (
            <div className="text-center py-12">
              <div className="text-sm text-red-500 mb-3">Unable to preview image directly.</div>
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                download={name}
                className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Open or Download Image
              </a>
            </div>
          )}

          {src && isPdf(ext) && (
            <iframe title={name || 'pdf-preview'} src={src} className="w-full h-[70vh]" />
          )}

          {src && isText(ext) && (
            <div className="overflow-auto max-h-[70vh] bg-gray-50 p-3 rounded text-xs">
              <RemoteTextViewer src={src} isRemote={source.kind === 'remote'} />
            </div>
          )}

          {src && isOffice(ext) && (
            source.kind === 'remote' ? (
              <iframe
                title={name || 'office-preview'}
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(src)}`}
                className="w-full h-[70vh]"
              />
            ) : (
              <div className="text-center py-12">
                <div className="mb-4 text-gray-600">Preview not available for local Office files. Please download to view.</div>
                <a href={src ?? undefined} download={name} className="inline-block px-4 py-2 bg-blue-600 text-white rounded">Download</a>
              </div>
            )
          )}

          {!isImage(ext) && !isPdf(ext) && !isText(ext) && !isOffice(ext) && (
            <div className="text-center py-12">
              <div className="mb-4 text-gray-600">Preview not available for this file type.</div>
              {src ? (
                <a href={src} download={name} className="inline-block px-4 py-2 bg-blue-600 text-white rounded">Download</a>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RemoteTextViewer: React.FC<{ src?: string | null; isRemote: boolean }> = ({ src, isRemote }) => {
  const [text, setText] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    if (!src) {
      setText(null);
      return undefined;
    }
    setText(undefined); // loading
    fetch(src)
      .then((r) => r.text())
      .then((t) => { if (mounted) setText(t); })
      .catch(() => { if (mounted) setText(null); });
    return () => { mounted = false; };
  }, [src, isRemote]);

  if (text === undefined) return <div className="text-sm text-gray-500">Loading...</div>;
  if (text === null) return <div className="text-sm text-gray-500">Unable to load preview (CORS or network error).</div>;
  return <pre className="whitespace-pre-wrap text-xs">{text}</pre>;
};

export default FilePreviewModal;
