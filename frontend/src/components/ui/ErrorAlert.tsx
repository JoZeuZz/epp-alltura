import React from 'react';

interface ErrorAlertProps {
  message: string;
  className?: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, className = '' }) => {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={`flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 ${className}`}
    >
      <svg
        className="mt-0.5 h-4 w-4 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
};

export default ErrorAlert;
