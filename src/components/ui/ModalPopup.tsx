/**
 * Dialog shell only (backdrop, header, children). Text fields live in `children`;
 * use the shared {@link ./Input} component in the parent form, not a raw input element here.
 */
import React, { useEffect, useId } from 'react';
import { IoMdClose } from 'react-icons/io';

export type ModalPopupProps = {
  show: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  /** Appended to dialog panel (e.g. `max-w-3xl` for wide forms). */
  panelClassName?: string;
  /** Appended to body under header (e.g. `max-h-[80vh] overflow-y-auto`). */
  bodyClassName?: string;
  /** Appended to backdrop (default `z-[100]`). */
  overlayClassName?: string;
  /** Appended to the full-screen dialog frame (default `z-[101]`). */
  frameClassName?: string;
};

/** Simple centered dialog: backdrop + Escape close, header with optional title and ×. */
const ModalPopup: React.FC<ModalPopupProps> = ({
  show,
  onClose,
  title,
  children,
  panelClassName = '',
  bodyClassName = '',
  overlayClassName = '',
  frameClassName = '',
}) => {
  const titleId = useId();

  useEffect(() => {
    if (!show) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', onKey);
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] bg-black/40 ${overlayClassName}`.trim()}
        aria-hidden
        onClick={onClose}
      />  
      <div
        className={`fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none ${frameClassName}`.trim()}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          // className={`pointer-events-auto flex w-full flex-col rounded-xl border border-gray-200 bg-white shadow-lg ${panelClassName?.trim() ? panelClassName.trim() : 'max-w-md'}`}
          className={`pointer-events-auto flex w-full max-w-md flex-col rounded-xl border border-gray-200 bg-white shadow-lg ${panelClassName}`.trim()}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
            {title ? (
              <h2 id={titleId} className="min-w-0 flex-1 text-lg font-semibold text-gray-900">
                {title}
              </h2>
            ) : (
              <span className="flex-1" />
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              aria-label="Close"
            >
              <IoMdClose className="w-5 h-5" />
            </button>
          </header>
          {children != null && children !== false ? (
            <div className={`px-4 py-4 ${bodyClassName}`.trim()}>{children}</div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default ModalPopup;
