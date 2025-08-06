'use client';

interface ProgressBarProps {
  totalSteps: number;
  currentStep: number;
  isRunning: boolean;
}

export default function ProgressBar({
  totalSteps,
  currentStep,
  isRunning
}: ProgressBarProps) {
  const progress = (currentStep + 1) / totalSteps * 100;

  return (
    <div className="w-full mb-8 px-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-[var(--text-secondary)]">
          {isRunning ? (
            <>Processing Agent {currentStep + 1} of {totalSteps}</>
          ) : (
            <>Workflow Progress</>
          )}
        </span>
        <span className="text-sm text-[var(--text-secondary)]">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="h-1 bg-[var(--surface-2)] rounded-full overflow-hidden">
        <div 
          className="h-full bg-[var(--primary)] transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
} 