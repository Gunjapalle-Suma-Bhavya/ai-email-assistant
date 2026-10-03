import React from 'react';

export default function LoadingSkeleton({ type = 'email-list', count = 5 }) {
  if (type === 'email-list') {
    return (
      <div className="space-y-1">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] animate-pulse space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 bg-[#ECE7DE] rounded-[2px] w-1/3" />
              <div className="h-3 bg-[#ECE7DE] rounded-[2px] w-14" />
            </div>
            <div className="h-4 bg-[#ECE7DE] rounded-[2px] w-2/3" />
            <div className="h-3 bg-[#ECE7DE]/70 rounded-[2px] w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'stats') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] animate-pulse space-y-2.5"
          >
            <div className="h-3 bg-[#ECE7DE] rounded-[2px] w-1/2" />
            <div className="h-6 bg-[#ECE7DE] rounded-[2px] w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] animate-pulse space-y-4">
      <div className="h-5 bg-[#ECE7DE] rounded-[2px] w-1/2" />
      <div className="h-3.5 bg-[#ECE7DE] rounded-[2px] w-3/4" />
      <div className="h-24 bg-[#ECE7DE]/60 rounded-[2px] w-full" />
    </div>
  );
}
