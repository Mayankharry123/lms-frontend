import React, { useState } from 'react';
import { Search } from 'lucide-react';

type Props = {
  onSearch: (q: string) => void;
  placeholder?: string;
  className?: string;
  delay?: number;
  filterSlot?: React.ReactNode;
};

const SearchBar: React.FC<Props> = ({
  onSearch,
  placeholder = 'Search…',
  className = '',
  delay = 300,
  filterSlot,
}) => {
  const [value, setValue] = useState('');
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | undefined>();

  const handleChange = (v: string) => {
    setValue(v);
    if (timeoutId) clearTimeout(timeoutId);

    if (delay === 0) {
      onSearch(v.trim());
    } else {
      const newTimeoutId = setTimeout(() => onSearch(v.trim()), delay);
      setTimeoutId(newTimeoutId);
    }
  };

  const inputEl = (
    <div className="relative min-w-0 flex-1">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-secondary)]">
        <Search className="h-4 w-4" aria-hidden />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={
          filterSlot
            ? 'app-search-input !rounded-none !rounded-r-lg !border-0 !shadow-none focus:!border-0 focus:!shadow-none'
            : 'app-search-input'
        }
      />
    </div>
  );

  if (filterSlot) {
    return (
      <div className={`app-search-bar ${className}`}>
        <div className="flex shrink-0 items-stretch border-r border-[var(--border-subtle)]">{filterSlot}</div>
        {inputEl}
      </div>
    );
  }

  return <div className={`relative flex items-center ${className}`}>{inputEl}</div>;
};

export default SearchBar;
