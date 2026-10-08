import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import CallStatusButton from './CallStatusButton';
import ConfirmDialog from './ConfirmDialog';

const DROPDOWN_MIN_WIDTH = 180;
const DROPDOWN_EST_HEIGHT = 220;

interface CallStatusDropdownProps {
  value: string;
  options: string[];
  onChange: (newStatus: string) => void;
  onConfirm?: (newStatus: string) => Promise<void>;
  /** Return true to handle the option outside this dropdown, without changing status. */
  onIntercept?: (option: string) => boolean;
}

const CallStatusDropdown: React.FC<CallStatusDropdownProps> = ({ value, options, onChange, onConfirm, onIntercept }) => {
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const computePlacement = () => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setOpenAbove(spaceBelow < DROPDOWN_EST_HEIGHT && spaceAbove > spaceBelow);
  };

  useLayoutEffect(() => {
    if (!open) return;
    computePlacement();
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleReposition = () => computePlacement();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open]);

  const handleToggle = () => {
    if (open) {
      setOpen(false);
      return;
    }

    computePlacement();
    setOpen(true);
  };

  const handleOptionSelect = (opt: string) => {
    if (onIntercept?.(opt)) {
      setOpen(false);
      return;
    }
    if (onConfirm) {
      setSelectedOption(opt);
      setConfirmDialogOpen(true);
      setOpen(false);
    } else {
      onChange(opt);
      setOpen(false);
    }
  };

  const handleConfirmChange = async () => {
    if (!selectedOption) return;
    setConfirmLoading(true);
    try {
      if (onConfirm) {
        await onConfirm(selectedOption);
      }
      onChange(selectedOption);
      setConfirmDialogOpen(false);
      setSelectedOption(null);
    } catch (err) {
      console.error('Failed to confirm change:', err);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCancelChange = () => {
    setConfirmDialogOpen(false);
    setSelectedOption(null);
  };

  return (
    <div ref={ref} className="relative inline-block w-full">
      <CallStatusButton
        value={value}
        onClick={handleToggle}
        isActive={open}
      />

      {open && (
        <div
          className={`absolute left-0 z-[200] w-max max-w-[min(100vw-1rem,240px)] rounded-xl border border-gray-200 bg-white shadow-lg ${
            openAbove ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{ minWidth: `${DROPDOWN_MIN_WIDTH}px` }}
        >
          <ul
            tabIndex={-1}
            role="listbox"
            className="max-h-56 overflow-y-auto focus:outline-none"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb #fff' }}
          >
            {options.map((opt) => (
              <li
                key={opt}
                role="option"
                aria-selected={opt === value}
                className={`px-4 py-2 cursor-pointer transition-all hover:bg-blue-50/60 ${
                  opt === value ? 'bg-blue-50/80 text-blue-700 font-semibold' : 'text-gray-700'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionSelect(opt);
                }}
              >
                {opt}
              </li>
            ))}
          </ul>
          <style>{`
            ul::-webkit-scrollbar { width: 6px; }
            ul::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
            ul::-webkit-scrollbar-track { background: #fff; }
          `}</style>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        title="Change Call Status"
        message={`Change call status to ${selectedOption ? `"${selectedOption}"` : 'this status'}?`}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        loading={confirmLoading}
        type="assign"
        onConfirm={handleConfirmChange}
        onCancel={handleCancelChange}
      />
    </div>
  );
};

export default CallStatusDropdown;
