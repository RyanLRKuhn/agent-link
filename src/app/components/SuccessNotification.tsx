interface SuccessNotificationProps {
  message: string;
  onClose: () => void;
}

export default function SuccessNotification({
  message,
  onClose
}: SuccessNotificationProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-success/10 text-success rounded-lg shadow-lg p-4 pr-12 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 hover:bg-success/10 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {message}
        </div>
      </div>
    </div>
  );
} 