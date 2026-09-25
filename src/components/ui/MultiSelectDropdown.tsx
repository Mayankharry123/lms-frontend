import React, { useEffect, useRef, useState } from 'react';
import './MultiSelectDropdown.css';

type Option = { value: string; label: string } | string;

type MultiSelectDropdownProps = {
  name?: string;
  value?: string[];
  placeholder?: string;
  options: Option[];
  onChange: (vals: string[]) => void;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  multi?: boolean; // whether multiple selection allowed
  maxVisibleOptions?: number; // how many options visible at once
  horizontalScroll?: boolean; // whether to scroll horizontally instead of wrapping
  labelMap?: Record<string, string>; // optional map for value -> label fallback
};

const normalize = (opt: Option): { value: string; label: string } =>
  typeof opt === 'string' ? { value: opt, label: opt } : opt;

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  name,
  value = [],
  placeholder = 'Search or select option',
  options,
  onChange,
  disabled = false,
  className = '',
  inputClassName = '',
  multi = true,
  maxVisibleOptions = 3,
  horizontalScroll = false,
  labelMap = {},
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  const normalized = options.map(normalize);
  const filtered = query ? normalized.filter(o => o.label.toLowerCase().includes(query.toLowerCase())) : normalized;

  // Defensive: ensure value is always an array
  const safeValue = Array.isArray(value) ? value : [];

  const sortedFiltered = React.useMemo(() => {
    if (!safeValue.length) return filtered;
    const selected: typeof filtered = [];
    const selectedSet = new Set<string>();

    safeValue.forEach((val) => {
      const match = filtered.find(
        (o) => String(o.value) === String(val) || o.label === String(val)
      );
      if (match && !selectedSet.has(String(match.value))) {
        selectedSet.add(String(match.value));
        selected.push(match);
      }
    });

    const unselected = filtered.filter((o) => !selectedSet.has(String(o.value)));
    return [...selected, ...unselected];
  }, [filtered, safeValue]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const toggleSelect = (val: string) => {
    if (multi) {
      if (safeValue.includes(val)) {
        // Deselect if already selected
        onChange(safeValue.filter(v => v !== val));
      } else {
        onChange([...safeValue, val]);
      }
      // Keep open for multi-select so user can pick multiple options quickly.
      setOpen(true);
    } else {
      onChange([val]);
      // Single-select should close after choosing one value.
      setOpen(false);
    }
  };

  const removeOne = (val: string) => {
    onChange(safeValue.filter(v => v !== val));
  };

  const optionHeight = 60; // px approx per option
  const maxHeight = Math.min(filtered.length, maxVisibleOptions) * optionHeight;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="w-full">
  <div className={`flex items-center overflow-y-hidden ${horizontalScroll ? 'flex-nowrap overflow-x-auto msd-scroll' : 'flex-wrap'} gap-2 w-full h-11 px-3 rounded-[10px] bg-white border border-[#DDE1E7] ${inputClassName} ${disabled ? 'opacity-60' : ''}`} onClick={() => { if (disabled) return; setOpen(true); }}>
          {/* tags */}
          {safeValue.length > 0 && (
            <div className={`flex items-center gap-2 ${horizontalScroll ? 'flex-1 flex-nowrap' : 'flex-wrap'}`}>
              {safeValue.map((v) => {
                // First try to find label in options, then fallback to labelMap
                const label = (normalized.find(n => String(n.value) === String(v))?.label) || labelMap[v] || v;
                return (
                  <span key={v} className="msd-tag inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs flex-shrink-0">
                    <span className="truncate max-w-[180px]">{label}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); removeOne(v); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); removeOne(v); } }}
                      aria-label={`Remove ${label}`}
                      className="ml-1 leading-none !text-gray-700 hover:text-gray-900 cursor-pointer select-none"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </span>
                );
              })}
            </div>
          )}

          {/* input for search */}
          <input
            name={name}
            value={open ? query : ''}
            onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
            onFocus={() => { if (!open) setOpen(true); }}
            placeholder={safeValue.length > 0 ? '' : placeholder}
            className="flex-1 min-w-[80px] h-10 text-sm bg-transparent placeholder-[#9CA3AF] focus:outline-none"
            disabled={disabled}
            autoComplete="off"
          />

          {/* dropdown arrow */}
          <div className="ml-2 mr-1 text-gray-400 pointer-events-none">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <input type="hidden" name={name ? name : undefined} value={safeValue.join(',')} />
      </div>

      <div
        role="listbox"
        aria-hidden={!open}
        className={`absolute z-50 left-0 text-xs right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-150 hide-scrollbar ${open ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        style={{ maxHeight: `${maxHeight}px`, overflowY: 'auto' }}
      >
        <div className="msd-scroll msd-dropdown hide-scrollbar">
          {sortedFiltered.length === 0 ? (
            <div className="px-4 py-2 text-gray-500">No matches found</div>
          ) : (
            sortedFiltered.map((opt) => {
              const o = normalize(opt);
              const active = safeValue.includes(String(o.value));
              return (
                <div
                  key={o.value}
                  role="option"
                  aria-selected={active}
                  tabIndex={0}
                  className={`px-4 py-2 cursor-pointer flex items-center justify-between ${active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'} hover:bg-blue-50`}
                  onMouseDown={(e) => { e.preventDefault(); toggleSelect(o.value); }}
                >
                  <div>{o.label}</div>
                  {active && (
                    <svg className="w-4 h-4 text-blue-600" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 10.5L8.3 12.8L14 7.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiSelectDropdown;
