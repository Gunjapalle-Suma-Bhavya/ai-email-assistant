import React, { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-[11px] font-mono font-medium text-[#6B665F] tracking-wider uppercase">
          {label}
        </label>
      )}
      <div className="relative rounded-[2px]">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B665F]">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
        <input
          ref={ref}
          className={`w-full bg-[#FCFAF7] border text-[#1E1E1C] placeholder-[#8C867C] text-sm rounded-[2px] transition-colors focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] py-2 ${
            Icon ? 'pl-8 pr-3' : 'px-3'
          } ${
            error
              ? 'border-[#6A2E2A] text-[#6A2E2A]'
              : 'border-[#DCD5C9] hover:border-[#BDB5A7]'
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-[11px] text-[#6A2E2A] font-mono">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-[#6B665F] font-mono">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
