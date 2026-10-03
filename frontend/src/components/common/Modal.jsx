import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, description, children, maxWidth = 'max-w-xl' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1E1E1C]/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full ${maxWidth} bg-[#FCFAF7] border border-[#DCD5C9] rounded-[2px] p-6 z-10 transition-all transform scale-100 animate-in fade-in zoom-in-95 duration-150 text-[#1E1E1C]`}
      >
        <div className="flex items-start justify-between pb-3.5 border-b border-[#DCD5C9]">
          <div>
            <h3 className="text-lg font-serif-title font-semibold text-[#1E1E1C]">{title}</h3>
            {description && <p className="text-xs text-[#6B665F] font-serif-body mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-[#6B665F] hover:text-[#1E1E1C] p-1 rounded-[2px] hover:bg-[#ECE7DE] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
