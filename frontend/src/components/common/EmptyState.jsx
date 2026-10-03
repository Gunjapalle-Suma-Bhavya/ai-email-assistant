import React from 'react';
import Button from './Button';

export default function EmptyState({ icon: Icon, title, description, actionText, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-[2px] border border-dashed border-[#DCD5C9] bg-[#FCFAF7] max-w-lg mx-auto my-8">
      {Icon && (
        <div className="w-12 h-12 rounded-[2px] bg-[#ECE7DE] border border-[#DCD5C9] flex items-center justify-center text-[#1E3A5F] mb-3">
          <Icon className="w-6 h-6 stroke-[1.5]" />
        </div>
      )}
      <h4 className="text-base font-serif-title font-medium text-[#1E1E1C]">{title}</h4>
      <p className="text-xs font-serif-body text-[#6B665F] mt-1.5 max-w-sm leading-relaxed">{description}</p>
      {actionText && onAction && (
        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
}
