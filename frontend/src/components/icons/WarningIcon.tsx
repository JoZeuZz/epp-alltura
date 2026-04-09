interface WarningIconProps {
  className?: string;
}

export default function WarningIcon({ className = "w-6 h-6" }: WarningIconProps) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path 
        d="M12 2L2 20h20L12 2z" 
        fill="currentColor" 
        fillOpacity="0.2"
      />
      <path 
        d="M12 2L2 20h20L12 2z" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
      <path 
        d="M12 9v4M12 17h.01" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}
