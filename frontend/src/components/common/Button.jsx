import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-mono font-medium transition-all duration-150 rounded-[2px] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed select-none tracking-wider text-xs uppercase';

  const variants = {
    primary: 'bg-[#1E3A5F] hover:bg-[#152943] text-[#FCFAF7] border border-[#1E3A5F] active:opacity-90',
    oxford: 'bg-[#1E3A5F] hover:bg-[#152943] text-[#FCFAF7] border border-[#1E3A5F]',
    oxblood: 'bg-[#6A2E2A] hover:bg-[#542421] text-[#FCFAF7] border border-[#6A2E2A] active:opacity-90',
    secondary: 'bg-[#FCFAF7] hover:bg-[#ECE7DE] text-[#1E1E1C] border border-[#DCD5C9]',
    outline: 'bg-transparent hover:bg-[#ECE7DE] text-[#1E1E1C] border border-[#DCD5C9]',
    ghost: 'bg-transparent hover:bg-[#ECE7DE] text-[#6B665F] hover:text-[#1E1E1C]',
    gold: 'bg-[#FDF8EC] hover:bg-[#F6EED8] text-[#4A3E18] border border-[#E0CE9A]',
    danger: 'bg-[#6A2E2A] hover:bg-[#542421] text-[#FCFAF7] border border-[#6A2E2A]',
    success: 'bg-[#1E3A5F] hover:bg-[#152943] text-[#FCFAF7] border border-[#1E3A5F]',
    unboxed: 'bg-transparent hover:underline text-[#1E3A5F] border-none p-0 normal-case font-serif tracking-normal text-sm',
  };

  const sizes = {
    sm: 'text-[11px] px-2.5 py-1 gap-1.5',
    md: 'text-xs px-3.5 py-1.5 gap-2',
    lg: 'text-sm px-4.5 py-2 gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : (
        Icon && <Icon className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>{children}</span>
    </button>
  );
}
