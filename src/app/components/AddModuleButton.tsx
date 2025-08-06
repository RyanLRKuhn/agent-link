'use client';

interface AddModuleButtonProps {
  className?: string;
  onClick: () => void;
}

export default function AddModuleButton({ className = '', onClick }: AddModuleButtonProps) {
  return (
    <div className={`group relative ${className}`}>
      <button
        onClick={onClick}
        className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        aria-label="Add module"
      >
        <svg
          className="w-5 h-5 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>
      
      {/* Tooltip */}
      <div className="absolute left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-gray-200 text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
        <div className="whitespace-nowrap">Add module</div>
      </div>
    </div>
  );
} 