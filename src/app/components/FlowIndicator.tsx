'use client';

interface FlowIndicatorProps {
  isActive?: boolean;
}

export default function FlowIndicator({ isActive = false }: FlowIndicatorProps) {
  return (
    <div className="relative w-full h-16 flex items-center justify-center group">
      {/* Vertical line with gradient and shimmer */}
      <div className={`absolute left-1/2 w-px h-full -translate-x-1/2 ${
        isActive 
          ? 'bg-gradient-to-b from-blue-500/30 via-blue-500/50 to-blue-500/30 after:absolute after:inset-0 after:shimmer'
          : 'module-connection'
      }`} />

      {/* Connection point with glow effect */}
      <div className={`
        relative w-3 h-3 rounded-full transition-all duration-300
        ${isActive 
          ? 'bg-blue-500 ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/30' 
          : 'bg-[var(--surface-2)] border border-[var(--border)]'
        }
        group-hover:scale-110 group-hover:ring-2 group-hover:ring-blue-500/10
      `}>
        {/* Inner glow/pulse for active state */}
        {isActive && (
          <div className="absolute inset-0 rounded-full bg-blue-400 animate-pulse opacity-50" />
        )}
      </div>

      {/* Subtle gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-0)] via-transparent to-[var(--surface-0)] opacity-40" />
    </div>
  );
} 