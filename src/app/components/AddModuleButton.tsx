'use client';

interface AddModuleButtonProps {
  onClick: () => void;
  className?: string;
}

export default function AddModuleButton({ onClick, className = '' }: AddModuleButtonProps) {
  return (
    <div className={`relative group ${className}`}>
      <button
        onClick={onClick}
        className="relative w-10 h-10 rounded-xl bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface-1)] 
          border border-[var(--border)] shadow-lg transition-all duration-300
          hover:scale-105 hover:shadow-xl hover:border-[var(--primary)]
          focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface-0)]
          group-hover:shadow-[var(--glow)]"
        aria-label="Add module"
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent via-transparent to-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg 
            className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors duration-300" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 4v16m8-8H4" 
            />
          </svg>
        </div>
      </button>

      {/* Tooltip */}
      <div className="absolute left-1/2 -translate-x-1/2 px-2 py-1 bg-[var(--surface-3)] rounded-md border border-[var(--border)]
        text-xs text-[var(--text-secondary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200
        shadow-lg backdrop-blur-sm
        top-full mt-2"
      >
        Add module
      </div>
    </div>
  );
} 