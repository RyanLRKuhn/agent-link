'use client';

interface FlowIndicatorProps {
  isActive?: boolean;
  fromAgent?: string;
  toAgent?: string;
  isTransitioning?: boolean;
}

export default function FlowIndicator({
  isActive = false,
  fromAgent,
  toAgent,
  isTransitioning = false
}: FlowIndicatorProps) {
  return (
    <div className="relative w-full h-16 flex items-center justify-center group">
      {/* Vertical connecting line */}
      <div 
        className={`
          absolute left-1/2 w-px h-full -translate-x-1/2 transition-all duration-300
          ${isActive 
            ? 'bg-gradient-to-b from-blue-500/30 via-blue-500/50 to-blue-500/30' 
            : 'module-connection'
          }
          ${isTransitioning ? 'after:absolute after:inset-0 after:animate-flow-pulse' : ''}
        `}
      >
        {/* Animated flow indicator */}
        {isTransitioning && (
          <div 
            className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/30 to-transparent 
              animate-flow-down overflow-hidden"
          />
        )}
      </div>

      {/* Connection point */}
      <div 
        className={`
          relative w-3 h-3 rounded-full transition-all duration-300
          ${isActive 
            ? 'bg-blue-500 ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/30' 
            : 'bg-[var(--surface-2)] border border-[var(--border)]'
          }
          group-hover:scale-110 group-hover:ring-2 group-hover:ring-blue-500/10
        `}
      >
        {/* Inner glow/pulse for active state */}
        {isActive && (
          <div className="absolute inset-0 rounded-full bg-blue-400 animate-pulse opacity-50" />
        )}
      </div>

      {/* Data flow tooltip */}
      {isTransitioning && (
        <div 
          className="absolute left-1/2 top-1/2 -translate-y-1/2 translate-x-8 ml-2
            px-2 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--border)]
            text-xs text-[var(--text-secondary)] whitespace-nowrap
            animate-fade-in z-10"
        >
          Sending to {toAgent}...
        </div>
      )}
    </div>
  );
} 