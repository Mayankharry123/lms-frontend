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

export function useTableCellTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const show = useCallback((anchor: HTMLElement, fullText: string) => {
    clearHideTimer();
    const rect = anchor.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const preferTop = rect.top > 140;
    const left = Math.max(12, Math.min(window.innerWidth - 12, centerX));
    const top = preferTop
      ? Math.max(12, rect.top - 8)
      : Math.min(window.innerHeight - 12, rect.bottom + 8);

    setTooltip({
      content: fullText,
      left,
      top,
      placement: preferTop ? 'top' : 'bottom',
    });
  }, []);

  const hide = useCallback(() => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => setTooltip(null), 100);
  }, []);

  const keepOpen = useCallback(() => {
    clearHideTimer();
  }, []);

  const TooltipLayer =
    tooltip &&
    createPortal(
      <div
        role="tooltip"
        onMouseEnter={keepOpen}
        onMouseLeave={hide}
        style={{ left: tooltip.left, top: tooltip.top }}
        className={`fixed z-[9998] -translate-x-1/2 ${
          tooltip.placement === 'top' ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="max-w-[min(48ch,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white p-3 text-sm leading-relaxed text-gray-800 shadow-lg break-words">
          {tooltip.content}
        </div>
      </div>,
      document.body,
    );

  return { show, hide, TooltipLayer };
}
