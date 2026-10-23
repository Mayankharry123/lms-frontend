import React from 'react';
import { ChevronDown } from 'lucide-react';

interface AssignButtonProps {
  value: string;
  onClick?: () => void;
  isActive?: boolean;
}

const AssignButton: React.FC<AssignButtonProps> = ({ value, onClick, isActive }) => {
  const displayValue = value && value !== 'N/A' && value.trim() !== '' ? value : 'Assign User';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group inline-flex items-center gap-1.5 max-w-full cursor-pointer
        font-medium text-sm text-blue-600 hover:text-blue-700
        underline decoration-blue-300 hover:decoration-blue-600 underline-offset-2
        transition-colors duration-200 text-left select-none focus:outline-none focus:ring-2 focus:ring-blue-100 rounded px-1 py-0.5
        ${isActive ? 'text-blue-800 decoration-blue-800 bg-blue-50/60' : ''}
      `}
      title={`Assigned User: ${displayValue}`}
      aria-haspopup="listbox"
      aria-expanded={isActive}
    >
      <span className="truncate">{displayValue}</span>
      <ChevronDown
        className={`w-3.5 h-3.5 shrink-0 text-blue-500 transition-transform duration-200 ${
          isActive ? 'rotate-180 text-blue-700' : 'group-hover:translate-y-0.5'
        }`}
        aria-hidden="true"
      />
    </button>
  );
};

export default AssignButton;

