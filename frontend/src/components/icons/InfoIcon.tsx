interface InfoIconProps {
  className?: string;
}

export default function InfoIcon({ className = "w-6 h-6" }: InfoIconProps) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle 
        cx="12" 
        cy="12" 
        r="10" 
        fill="currentColor" 
        fillOpacity="0.2"
      />
      <circle 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="2"
        fill="none"
      />
      <path 
        d="M12 16v-4M12 8h.01" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}
