import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import AssignButton from './AssignButton';
import ConfirmDialog from './ConfirmDialog';

const DROPDOWN_MIN_WIDTH = 180;
const DROPDOWN_EST_HEIGHT = 220;

interface AssignDropdownProps {
  value: string;
  options: string[];
  onChange: (newValue: string) => void;
  onConfirm?: (newValue: string) => Promise<void>;
  context?: 'brief' | 'lead';
}

const AssignDropdown: React.FC<AssignDropdownProps> = ({
  value,
  options,
  onChange,
  onConfirm,
  context = 'brief',
}) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const computePlacement = () => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openAbove = spaceBelow < DROPDOWN_EST_HEIGHT && spaceAbove > spaceBelow;
    const width = Math.max(rect.width, DROPDOWN_MIN_WIDTH);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));

    setMenuStyle({
      position: 'fixed',
      left,
      width,
      zIndex: 1000,
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + 4, top: 'auto' }
        : { top: rect.bottom + 4, bottom: 'auto' }),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    computePlacement();
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
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
    <div ref={ref} className="relative w-full min-w-0">
      <AssignButton
        value={value}
        onClick={handleToggle}
        isActive={open}
      />
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
          style={menuStyle}
        >
          <ul
            tabIndex={-1}
            role="listbox"
            className="max-h-56 overflow-y-auto focus:outline-none"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#e5e7eb #fff',
            }}
          >
            {options.map((opt) => (
              <li
                key={opt}
                role="option"
                aria-selected={opt === value}
                className={`cursor-pointer px-4 py-2 transition-all hover:bg-blue-50/60 ${
                  opt === value ? 'bg-blue-50/80 font-semibold text-blue-700' : 'text-gray-700'
                }`}
                onClick={() => handleOptionSelect(opt)}
              >
                {opt}
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        title={`Assign ${context === 'lead' ? 'Lead' : 'Brief'}`}
        message={`Assign this ${context === 'lead' ? 'lead' : 'brief'} to ${selectedOption ? `"${selectedOption}"` : 'this user'}?`}
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

export default AssignDropdown;
