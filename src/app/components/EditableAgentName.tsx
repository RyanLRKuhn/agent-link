import { useState, useEffect, useRef } from 'react';

interface EditableAgentNameProps {
  value: string;
  onChange: (value: string) => void;
  index: number;
}

export default function EditableAgentName({
  value,
  onChange,
  index
}: EditableAgentNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local state when prop changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    const newValue = editValue.trim();
    if (newValue && newValue !== value) {
      onChange(newValue);
    } else {
      setEditValue(value); // Reset to original if empty
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setEditValue(value); // Reset to original
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 text-sm bg-surface-2 rounded-md
          border border-primary focus:border-primary focus:ring-1 focus:ring-primary
          placeholder-text-tertiary"
        placeholder={`Agent ${index + 1}`}
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="flex items-center gap-2 group/name hover:text-primary transition-colors"
    >
      <span className="font-medium">{value}</span>
      <svg 
        className="w-3.5 h-3.5 opacity-0 group-hover/name:opacity-100 transition-opacity"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    </button>
  );
} 