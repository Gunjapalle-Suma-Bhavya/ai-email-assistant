import React from 'react';

export default function Badge({ variant = 'default', children, className = '' }) {
  const variants = {
    respond: 'bg-[#FCF2F1] text-[#6A2E2A] border-[#E8C5C2]',
    notify: 'bg-[#FDF6E8] text-[#8F5B1A] border-[#F2DEB5]',
    ignore: 'bg-[#ECE7DE] text-[#6B665F] border-[#DCD5C9]',
    unread: 'bg-[#EBF2FA] text-[#1E3A5F] border-[#BACFE6]',
    drafted: 'bg-[#FDF8EC] text-[#4A3E18] border-[#E0CE9A]',
    sent: 'bg-[#EEF5F1] text-[#255C3A] border-[#C2DEC8]',
    confirmed: 'bg-[#EEF5F1] text-[#255C3A] border-[#C2DEC8]',
    pending: 'bg-[#FDF6E8] text-[#8F5B1A] border-[#F2DEB5]',
    default: 'bg-[#FCFAF7] text-[#1E1E1C] border-[#DCD5C9]',
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-medium border tracking-[0.06em] uppercase ${
        variants[variant] || variants.default
      } ${className}`}
    >
      {children}
    </span>
  );
}
