import { useCallback, useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  text: string;
  variant: 'error' | 'success' | 'warning';
}

const VARIANT_CLASSES = {
  error: 'bg-red-600 text-white',
  success: 'bg-emerald-600 text-white',
  warning: 'bg-yellow-500 text-yellow-900',
} as const;

interface ToastProps {
  message: ToastMessage;
  onDismiss: (id: string) => void;
  duration?: number;
}

function ToastItem({ message, onDismiss, duration = 3000 }: ToastProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(message.id), 200);
    }, duration);
    return () => clearTimeout(timer);
  }, [message.id, duration, onDismiss]);

  return (
    <div
      role="alert"
      className={`rounded-md px-4 py-2 text-sm font-medium shadow-lg ${VARIANT_CLASSES[message.variant]} ${
        exiting ? 'animate-slide-out-top' : 'animate-slide-in-top'
      }`}
    >
      {message.text}
    </div>
  );
}

interface ToastContainerProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ messages, onDismiss }: ToastContainerProps) {
  if (messages.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-4">
      {messages.map((msg) => (
        <div key={msg.id} className="pointer-events-auto">
          <ToastItem message={msg} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

/** Hook to manage toast messages. Returns [messages, addToast, dismissToast]. */
export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, variant: ToastMessage['variant'] = 'error') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setMessages((prev) => [...prev, { id, text, variant }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { messages, addToast, dismissToast };
}
