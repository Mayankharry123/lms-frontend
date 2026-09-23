import React from 'react';
import { truncateTableCellText } from './tableCellDisplay';

export const TableTextCell: React.FC<{
  text: string;
  onShow: (anchor: HTMLElement, fullText: string) => void;
  onHide: () => void;
}> = ({ text, onShow, onHide }) => {
  const { display, full, hasMore } = truncateTableCellText(text);

  if (!full || full === '-') {
    return (
      <div className="lms-table-cell">
        <span className="lms-table-cell__text">{display || '-'}</span>
      </div>
    );
  }

  return (
    <div
      className={`lms-table-cell${hasMore ? ' cursor-help' : ''}`}
      onMouseEnter={(e) => {
        if (hasMore) onShow(e.currentTarget, full);
      }}
      onMouseLeave={onHide}
    >
      <span className="lms-table-cell__text">{display}</span>
    </div>
  );
};
