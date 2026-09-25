import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { truncateTableCellText, truncateTableCellWords } from './tableCellDisplay';

type Placement = 'top' | 'bottom';

type TooltipState = {
  content: string;
  left: number;
  top: number;
  placement: Placement;
};

export const TableTextCell: React.FC<{
  text: string;
  maxWords?: number;
  onShow: (anchor: HTMLElement, fullText: string) => void;
  onHide: () => void;
}> = ({ text, maxWords, onShow, onHide }) => {
  const { display, full, hasMore } = maxWords
    ? truncateTableCellWords(text, maxWords)
    : truncateTableCellText(text);

  const canTooltip = maxWords ? Boolean(full && full !== '-') : hasMore;

  if (!full || full === '-') {
    return (
      <div className="lms-table-cell">
        <span className="lms-table-cell__text">{display || '-'}</span>
      </div>
    );
  }

  return (
    <div
      className={`lms-table-cell${canTooltip ? ' cursor-help' : ''}`}
      onMouseEnter={(e) => {
        if (canTooltip) onShow(e.currentTarget, full);
      }}
      onMouseLeave={onHide}
    >
      <span className="lms-table-cell__text">{display}</span>
    </div>
  );
};
