import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import Badge from './Badge';
import AssignButton from './AssignButton';
import ConfirmDialog from './ConfirmDialog';

const DROPDOWN_WIDTH = 176;
const DROPDOWN_EST_HEIGHT = 220;

interface StatusDropdownProps {
  value: string;
  options: string[];
  onChange: (newValue: string) => void;
  onConfirm?: (newValue: string) => Promise<void>;
  /** Badge keeps the Brief Pipeline pill. Link matches Assign User. */
  appearance?: 'badge' | 'link';
}

const StatusDropdown: React.FC<StatusDropdownProps> = ({ value, options, onChange, onConfirm, appearance = 'badge' }) => {
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
      onChange(selectedOption);
      if (onConfirm) {
        await onConfirm(selectedOption);
      }
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
    <div ref={ref} className={appearance === 'link' ? 'relative w-full min-w-0' : 'relative inline-block'}>
      {appearance === 'link' ? (
        <AssignButton value={value} onClick={handleToggle} isActive={open} />
      ) : (
        <span onClick={handleToggle} className="inline-block cursor-pointer text-blue-600 hover:text-blue-700 underline transition-colors">
          <Badge status={value}>{value}</Badge>
        </span>
      )}

      {open && (
        <div
          className={`absolute left-0 z-[200] rounded-xl border border-gray-200 bg-white shadow-lg ${
            openAbove ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{ width: `${DROPDOWN_WIDTH}px` }}
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
                onClick={() => handleOptionSelect(opt)}
              >
                {opt}
              </li>
            ))}
          </ul>
          <style>{`
            ul::-webkit-scrollbar {
              width: 6px;
            }
            ul::-webkit-scrollbar-thumb {
              background: #e5e7eb;
              border-radius: 4px;
            }
            ul::-webkit-scrollbar-track {
              background: #fff;
            }
          `}</style>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        title="Change Status"
        message={`Change status to ${selectedOption ? `"${selectedOption}"` : 'this status'}?`}
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

export default StatusDropdown;
