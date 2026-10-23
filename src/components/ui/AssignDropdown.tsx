import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Check, Search, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AssignButton from './AssignButton';
import ConfirmDialog from './ConfirmDialog';

const DROPDOWN_MIN_WIDTH = 220;
const DROPDOWN_MAX_WIDTH = 300;
const DROPDOWN_EST_HEIGHT = 280;

interface AssignDropdownProps {
  value: string;
  options: string[];
  onChange: (newValue: string) => void;
  onConfirm?: (newValue: string) => Promise<void>;
  context?: 'brief' | 'lead' | 'user';
}

interface DropdownPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  openAbove: boolean;
}

const AssignDropdown: React.FC<AssignDropdownProps> = ({
  value,
  options,
  onChange,
  onConfirm,
  context = 'brief',
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const computePosition = useCallback((): DropdownPosition | null => {
    const el = triggerRef.current;
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const openAbove = spaceBelow < DROPDOWN_EST_HEIGHT && spaceAbove > spaceBelow;

    // Calculate width: between min and max width, at least trigger width
    const targetWidth = Math.min(
      Math.max(rect.width, DROPDOWN_MIN_WIDTH),
      DROPDOWN_MAX_WIDTH
    );

    // Keep horizontally within the viewport (minimum 12px margin)
    let left = Math.round(rect.left);
    if (left + targetWidth > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - targetWidth - 12);
    }
    if (left < 12) {
      left = 12;
    }

    if (openAbove) {
      return {
        bottom: Math.round(viewportHeight - rect.top + 6),
        left,
        width: targetWidth,
        openAbove: true,
      };
    }

    return {
      top: Math.round(rect.bottom + 6),
      left,
      width: targetWidth,
      openAbove: false,
    };
  }, []);

  const updatePosition = useCallback(() => {
    if (!open) return;
    const pos = computePosition();
    if (pos) {
      setPosition(pos);
    }
  }, [open, computePosition]);

  // Handle position recalculation on open, scroll and resize
  useEffect(() => {
    if (!open) {
      setPosition(null);
      setSearchQuery('');
      return;
    }

    // Initial position calculation
    const initialPos = computePosition();
    setPosition(initialPos);

    // Focus search input if search is present
    const focusTimer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open, computePosition, updatePosition]);

  // Click outside and escape key handling
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleToggle = () => {
    if (open) {
      setOpen(false);
    } else {
      const pos = computePosition();
      setPosition(pos);
      setOpen(true);
    }
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

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, searchQuery]);

  const contextLabel = context === 'lead' ? 'Sales User' : context === 'user' ? 'User' : 'User';
  const confirmSubject = context === 'lead' ? 'lead' : context === 'user' ? 'user' : 'brief';

  return (
    <div ref={triggerRef} className="relative inline-block max-w-full">
      <AssignButton
        value={value}
        onClick={handleToggle}
        isActive={open}
      />

      {/* Portal dropdown to document.body so it is never clipped by table overflow */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && position && (
              <motion.div
                ref={menuRef}
                initial={{
                  opacity: 0,
                  scale: 0.95,
                  y: position.openAbove ? 6 : -6,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                  y: position.openAbove ? 6 : -6,
                }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  ...(position.top != null ? { top: `${position.top}px` } : {}),
                  ...(position.bottom != null ? { bottom: `${position.bottom}px` } : {}),
                  left: `${position.left}px`,
                  width: `${position.width}px`,
                  zIndex: 9999,
                }}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-slate-300/40 focus:outline-none"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50/80 px-3.5 py-2">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                      Assign {contextLabel}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    {options.length} {options.length === 1 ? 'user' : 'users'}
                  </span>
                </div>

                {/* Search Filter (shown if options > 5) */}
                {options.length > 5 && (
                  <div className="border-b border-gray-100 p-2">
                    <div className="relative flex items-center">
                      <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Filter users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 w-full rounded-md border border-gray-200 bg-gray-50/60 pl-8 pr-2.5 text-xs text-gray-800 placeholder-gray-400 outline-none transition-colors focus:border-gray-400 focus:bg-white focus:ring-1 focus:ring-gray-200"
                      />
                    </div>
                  </div>
                )}

                {/* Options List */}
                <ul
                  tabIndex={-1}
                  role="listbox"
                  aria-label="Assign User Options"
                  className="max-h-56 overflow-y-auto py-1 text-xs focus:outline-none"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb #fff' }}
                >
                  {filteredOptions.length === 0 ? (
                    <li className="px-4 py-3 text-center text-xs text-gray-400">
                      No matching user found
                    </li>
                  ) : (
                    filteredOptions.map((opt) => {
                      const isSelected = opt.trim().toLowerCase() === (value || '').trim().toLowerCase();
                      return (
                        <li
                          key={opt}
                          role="option"
                          aria-selected={isSelected}
                          className={`flex cursor-pointer items-center justify-between px-3.5 py-2 text-xs font-medium transition-colors ${
                            isSelected
                              ? 'bg-gray-100 text-gray-900 font-semibold'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOptionSelect(opt);
                          }}
                        >
                          <span className="truncate">{opt}</span>
                          {isSelected && (
                            <Check className="ml-2 h-3.5 w-3.5 shrink-0 text-gray-700" aria-hidden="true" />
                          )}
                        </li>
                      );
                    })
                  )}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        title={`Assign ${contextLabel}`}
        message={`Assign this ${confirmSubject} to ${selectedOption ? `"${selectedOption}"` : 'this user'}?`}
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

