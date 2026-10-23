import React, { useEffect } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  targetObject?: string;
  consequence: string;
  isDestructive?: boolean;
  confirmLabel: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  targetObject,
  consequence,
  isDestructive = false,
  confirmLabel,
  cancelLabel = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 dark:bg-black/65 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="bg-white dark:bg-[#1B1E25] rounded-2xl max-w-md w-full shadow-xl border border-[#D9DEE7] dark:border-[#343A46] p-6 relative flex flex-col gap-4">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#5B6472] hover:bg-gray-100 hover:text-[#1F2937] dark:text-[#B5BDCA] dark:hover:bg-[#2A303B] dark:hover:text-[#F1F3F8] transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              isDestructive
                ? 'bg-[#FEF0EF] text-[#B42318] dark:bg-red-950/50 dark:text-red-400'
                : 'bg-[#EFF8FF] text-[#175CD3] dark:bg-blue-950/50 dark:text-blue-400'
            }`}
          >
            {isDestructive ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 id="confirm-dialog-title" className="text-base font-semibold text-[#1F2937] dark:text-[#F3F4F6]">
              {title}
            </h3>
            {targetObject && (
              <p className="text-xs font-medium text-[#3156D3] bg-[#E8EEFF] dark:text-[#8EB0FF] dark:bg-[#3B66F5]/15 px-2 py-0.5 rounded mt-1 inline-block">
                {targetObject}
              </p>
            )}
            <p className="text-sm text-[#5B6472] dark:text-[#B5BDCA] mt-2 leading-relaxed">{consequence}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D9DEE7] dark:border-[#343A46] mt-2">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
