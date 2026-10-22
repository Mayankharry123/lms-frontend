import React from 'react';
import { motion } from 'framer-motion';
import Breadcrumb from './Breadcrumb';
import { IoIosArrowBack } from 'react-icons/io';

type Props = {
  title?: string;
  item: Record<string, any> | null;
  onClose: () => void;
  excludeFields?: string[];
};

const MasterView: React.FC<Props> = ({ title, item, onClose, excludeFields = [] }) => {
  if (!item) return null;

  // produce key/value pairs excluding internal fields if needed
  const entries = Object.entries(item).filter(([k]) => k !== 'id' && !excludeFields.includes(k)).sort(([a], [b]) => a.localeCompare(b));

  // Split entries into two columns for better layout
  const half = Math.ceil(entries.length / 2);
  const leftEntries = entries.slice(0, half);
  const rightEntries = entries.slice(half);

  const renderField = ([k, v]: [string, any]) => {
    // convert camelCase / snake_case / kebab-case to Title Case
    const spaced = k.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ');
    const title = spaced
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    // special casing
    const label =
      title.toLowerCase() === 'datetime' || title.toLowerCase() === 'date time'
        ? 'Date & Time'
        : title.toLowerCase() === 'gst numbers' || title.toLowerCase() === 'gstnumbers'
        ? 'GST Numbers'
        : title.toLowerCase() === 'gst no' || title.toLowerCase() === 'gst number'
        ? 'GST No.'
        : title;

    // Handle different value types
    let displayValue: string;
    let isImage = false;
    if (v == null || v === '') {
      displayValue = '-';
    } else if (typeof v === 'object') {
      if (Array.isArray(v)) {
        displayValue = v.map(item => typeof item === 'object' && item !== null && 'name' in item ? item.name : String(item)).join(', ');
      } else if ('name' in v) {
        displayValue = v.name;
      } else {
        displayValue = '[Object]'; // Placeholder for complex objects
      }
    } else {
      displayValue = String(v);
      // Check if it's an image URL
      isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(displayValue) && (displayValue.startsWith('http') || displayValue.startsWith('/'));
    }

    return (
      <div key={k} className='flex gap-2 flex-wrap sm:flex-nowrap border p-4 rounded-lg border-gray-200 pb-3 bg-gray-100 break-all'>
        <div className="text-sm  font-semibold text-black min-w-[100px]">{label} : </div>
        <div className="text-sm text-gray-600">
          {isImage ? (
            <img src={displayValue} alt={label} className="max-w-full h-auto rounded border border-gray-200" />
          ) : (
            displayValue
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex flex-col">
          <Breadcrumb />
        </div>
        <button onClick={onClose} className="flex items-center space-x-2 btn-primary text-white px-3 py-1 rounded-lg">
          <IoIosArrowBack className="w-5 h-5" />
          <span className="text-sm">Go Back</span>
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.18 }}
        className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
      >
        {title && (
          <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          </div>
        )}

        <div className="p-4 sm:p-5 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-4">
              {leftEntries.map(renderField)}
            </div>
            <div className="space-y-4">
              {rightEntries.map(renderField)}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default MasterView;
