import React from 'react';

export const NoteSkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4" aria-label="Loading shared notes">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white border border-[#6554A4]/12 rounded-2xl p-5 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#E9DFFF]" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-36 bg-[#E9DFFF]/80 rounded" />
              <div className="h-2.5 w-24 bg-[#FAF9FE] rounded" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3.5 w-full bg-[#E9DFFF]/50 rounded" />
            <div className="h-3.5 w-4/5 bg-[#E9DFFF]/50 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const PageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAF9FE] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 animate-pulse">
        <div className="h-10 w-48 mx-auto bg-[#E9DFFF] rounded-xl" />
        <div className="h-64 w-full bg-white border border-[#6554A4]/12 rounded-2xl" />
      </div>
    </div>
  );
};
