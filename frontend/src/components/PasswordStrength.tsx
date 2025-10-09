import React from 'react';

interface PasswordStrengthProps {
  password?: string;
}

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4 text-green-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4 text-gray-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PasswordRequirement: React.FC<{ isValid: boolean; text: string }> = ({ isValid, text }) => (
  <li className={`flex items-center text-sm ${isValid ? 'text-green-600' : 'text-gray-500'}`}>
    {isValid ? <CheckIcon /> : <XIcon />}
    <span className="ml-2">{text}</span>
  </li>
);

const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password = '' }) => {
  const hasMinLength = password.length >= 8;
  // Puedes añadir más validaciones aquí
  // const hasNumber = /\d/.test(password);
  // const hasUpperCase = /[A-Z]/.test(password);

  return (
    <ul className="mt-2 space-y-1">
      <PasswordRequirement isValid={hasMinLength} text="Al menos 8 caracteres" />
      {/* <PasswordRequirement isValid={hasNumber} text="Contiene al menos un número" /> */}
      {/* <PasswordRequirement isValid={hasUpperCase} text="Contiene al menos una mayúscula" /> */}
    </ul>
  );
};

export default PasswordStrength;
