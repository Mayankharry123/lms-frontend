import React, { useEffect, useState } from 'react';
import { Copy, Check, X, ShieldCheck } from 'lucide-react';

interface GstNumbersModalProps {
  isOpen: boolean;
  gstNumbers: string[];
  brandName?: string;
  onClose: () => void;
}

const GstNumbersModal: React.FC<GstNumbersModalProps> = ({
  isOpen,
  gstNumbers,
  brandName,
  onClose,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = (gst: string, idx: number) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(gst);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-[90%] max-w-md max-h-[85vh] z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gst-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 text-[#007b83] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="gst-modal-title" className="text-lg font-bold text-gray-900 leading-tight">
                GST Numbers
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {brandName ? `${brandName} • ` : ''}
                {gstNumbers.length} {gstNumbers.length === 1 ? 'registered GST' : 'registered GSTs'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 max-h-[360px]">
          {gstNumbers.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No GST numbers available.
            </div>
          ) : (
            <div className="space-y-2.5">
              {gstNumbers.map((gst, idx) => {
                const isCopied = copiedIndex === idx;
                return (
                  <div
                    key={`${gst}-${idx}`}
                    className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100/80 border border-gray-200/80 rounded-xl transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-600 flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-mono text-sm font-semibold tracking-wider text-gray-800 select-all truncate">
                        {gst}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(gst, idx)}
                      className={`flex-shrink-0 ml-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isCopied
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 shadow-xs'
                      }`}
                      title="Copy GST Number"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};

export default GstNumbersModal;
