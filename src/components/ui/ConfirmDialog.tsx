import React from 'react';
import { Trash2, Users, AlertCircle } from 'lucide-react';

type DialogType = 'delete' | 'assign' | 'warning';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  type?: DialogType;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  loading = false,
  type = 'delete',
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const getIconConfig = (dialogType: DialogType) => {
    switch (dialogType) {
      case 'assign':
        return {
          icon: Users,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-100',
          iconColor: 'text-blue-600',
          buttonColor: '!bg-blue-600 hover:!bg-blue-700',
          loadingText: 'Assigning...',
        };
      case 'warning':
        return {
          icon: AlertCircle,
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-100',
          iconColor: 'text-[#f26222]',
          buttonColor: '!bg-[#f26222] hover:!bg-[#d9551b]',
          loadingText: 'Processing...',
        };
      case 'delete':
      default:
        return {
          icon: Trash2,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-100',
          iconColor: 'text-red-600',
          buttonColor: '!bg-red-600 hover:!bg-red-700',
          loadingText: 'Deleting...',
        };
    }
  };

  const config = getIconConfig(type);
  const IconComponent = config.icon;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20 transition-opacity duration-200" />

      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
          if (!loading && e.target === e.currentTarget) onCancel();
        }}
      >
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all">
          <div className="px-8 py-7">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="flex-shrink-0">
                <div className={`w-14 h-14 ${config.bgColor} rounded-full flex items-center justify-center border-2 ${config.borderColor} shadow-sm`}>
                  <IconComponent className={`w-7 h-7 ${config.iconColor}`} />
                </div>
              </div>

              <div className="flex-1 w-full">
                <h3 className="text-xl font-bold text-gray-900 leading-snug text-balance">{title}</h3>
                {message && (
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600 text-balance">{message}</p>
                )}

                <div className="mt-6 flex items-center justify-center gap-3 w-full">
                  <button
                    disabled={loading}
                    onClick={onCancel}
                    className="cancel-btn flex-1 inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {cancelLabel}
                  </button>

                  <button
                    disabled={loading}
                    onClick={onConfirm}
                    className={`flex-1 inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white ${config.buttonColor} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg`}
                  >
                    {loading ? config.loadingText : confirmLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmDialog;
