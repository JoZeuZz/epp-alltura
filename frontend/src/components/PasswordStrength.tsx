import React from 'react';

interface PasswordStrengthProps {
  password?: string;
}

const CheckIcon = React.memo(() => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4 text-green-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
));
CheckIcon.displayName = 'CheckIcon';

const XIcon = React.memo(() => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4 text-gray-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
));
XIcon.displayName = 'XIcon';

const PasswordRequirement: React.FC<{ isValid: boolean; text: string }> = React.memo(({ isValid, text }) => (
  <li className={`flex items-center text-sm ${isValid ? 'text-green-600' : 'text-gray-500'}`}>
    {isValid ? <CheckIcon /> : <XIcon />}
    <span className="ml-2">{text}</span>
  </li>
));
PasswordRequirement.displayName = 'PasswordRequirement';

const PasswordStrength: React.FC<PasswordStrengthProps> = React.memo(({ password = '' }) => {
  const hasMinLength = password.length >= 12;

  return (
    <ul className="mt-2 space-y-1">
      <PasswordRequirement isValid={hasMinLength} text="Al menos 12 caracteres" />
    </ul>
  );
});
PasswordStrength.displayName = 'PasswordStrength';

export default PasswordStrength;
