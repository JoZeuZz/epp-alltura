import React from 'react';

/**
 * Tipos de input disponibles
 */
export type InputType = 'text' | 'email' | 'tel' | 'number' | 'password' | 'url' | 'date' | 'time';

/**
 * Props del componente FormInput
 */
export interface FormInputProps {
  /** ID del input (importante para accesibilidad) */
  id: string;
  /** Nombre del campo para el formulario */
  name: string;
  /** Texto de la etiqueta */
  label: string;
  /** Tipo de input */
  type?: InputType;
  /** Valor por defecto (para React Router Form) */
  defaultValue?: string | number;
  /** Placeholder */
  placeholder?: string;
  /** Campo requerido */
  required?: boolean;
  /** Campo deshabilitado */
  disabled?: boolean;
  /** Mensaje de error */
  error?: string;
  /** Texto de ayuda */
  helpText?: string;
  /** Clases adicionales para el contenedor */
  className?: string;
  /** Min value para inputs numéricos */
  min?: number;
  /** Max value para inputs numéricos */
  max?: number;
  /** Step para inputs numéricos */
  step?: number;
  /** Pattern para validación */
  pattern?: string;
  /** Autocompletar */
  autoComplete?: string;
}

/**
 * Componente FormInput responsive
 * 
 * Input de formulario estandarizado con:
 * - Touch targets mínimos (44px)
 * - Tipografía responsive
 * - Estados de error y ayuda
 * - Accesibilidad completa
 * 
 * @example
 * ```tsx
 * <FormInput
 *   id="email"
 *   name="email"
 *   label="Correo Electrónico"
 *   type="email"
 *   required
 *   defaultValue={user?.email}
 *   helpText="Usaremos este correo para comunicarnos contigo"
 * />
 * ```
 */
export const FormInput: React.FC<FormInputProps> = ({
  id,
  name,
  label,
  type = 'text',
  defaultValue,
  placeholder,
  required = false,
  disabled = false,
  error,
  helpText,
  className = '',
  min,
  max,
  step,
  pattern,
  autoComplete,
}) => {
  return (
    <div className={`mb-4 md:mb-6 ${className}`}>
      <label 
        htmlFor={id} 
        className="block label-base text-gray-700 mb-2"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="requerido">*</span>}
      </label>
      
      <input
        type={type}
        id={id}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        pattern={pattern}
        autoComplete={autoComplete}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error ? `${id}-error` : helpText ? `${id}-help` : undefined
        }
        className={`
          shadow-sm border rounded-lg w-full py-2.5 px-3 body-base text-gray-700 
          leading-tight min-h-touch
          focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue
          disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
          ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
          transition-colors
        `}
      />
      
      {error && (
        <p id={`${id}-error`} className="mt-1 body-small text-red-600" role="alert">
          {error}
        </p>
      )}
      
      {!error && helpText && (
        <p id={`${id}-help`} className="mt-1 body-small text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
};

/**
 * Props del componente FormTextarea
 */
export interface FormTextareaProps {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helpText?: string;
  className?: string;
  rows?: number;
}

/**
 * Componente FormTextarea responsive
 */
export const FormTextarea: React.FC<FormTextareaProps> = ({
  id,
  name,
  label,
  defaultValue,
  placeholder,
  required = false,
  disabled = false,
  error,
  helpText,
  className = '',
  rows = 3,
}) => {
  return (
    <div className={`mb-4 md:mb-6 ${className}`}>
      <label 
        htmlFor={id} 
        className="block label-base text-gray-700 mb-2"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="requerido">*</span>}
      </label>
      
      <textarea
        id={id}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error ? `${id}-error` : helpText ? `${id}-help` : undefined
        }
        className={`
          shadow-sm border rounded-lg w-full py-2.5 px-3 body-base text-gray-700 
          leading-relaxed resize-y
          focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue
          disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
          ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
          transition-colors
        `}
      />
      
      {error && (
        <p id={`${id}-error`} className="mt-1 body-small text-red-600" role="alert">
          {error}
        </p>
      )}
      
      {!error && helpText && (
        <p id={`${id}-help`} className="mt-1 body-small text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
};

/**
 * Props del componente FormSelect
 */
export interface FormSelectProps {
  id: string;
  name: string;
  label: string;
  options: Array<{ value: string | number; label: string }>;
  defaultValue?: string | number;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helpText?: string;
  className?: string;
  placeholder?: string;
}

/**
 * Componente FormSelect responsive
 */
export const FormSelect: React.FC<FormSelectProps> = ({
  id,
  name,
  label,
  options,
  defaultValue,
  required = false,
  disabled = false,
  error,
  helpText,
  className = '',
  placeholder,
}) => {
  return (
    <div className={`mb-4 md:mb-6 ${className}`}>
      <label 
        htmlFor={id} 
        className="block label-base text-gray-700 mb-2"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="requerido">*</span>}
      </label>
      
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error ? `${id}-error` : helpText ? `${id}-help` : undefined
        }
        className={`
          shadow-sm border rounded-lg w-full py-2.5 px-3 body-base text-gray-700 
          leading-tight min-h-touch
          focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue
          disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
          ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
          transition-colors
        `}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p id={`${id}-error`} className="mt-1 body-small text-red-600" role="alert">
          {error}
        </p>
      )}
      
      {!error && helpText && (
        <p id={`${id}-help`} className="mt-1 body-small text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
};

/**
 * Componente FormButtons para botones de formulario
 */
export interface FormButtonsProps {
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitVariant?: 'primary' | 'danger' | 'success';
}

export const FormButtons: React.FC<FormButtonsProps> = ({
  submitText = 'Guardar',
  cancelText = 'Cancelar',
  onCancel,
  isSubmitting = false,
  submitVariant = 'primary',
}) => {
  const getSubmitClasses = () => {
    const base = 'min-h-touch px-6 py-2.5 rounded-lg label-base font-semibold text-white shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all';
    
    switch (submitVariant) {
      case 'danger':
        return `${base} bg-red-600 hover:bg-red-700 focus:ring-red-500`;
      case 'success':
        return `${base} bg-green-600 hover:bg-green-700 focus:ring-green-500`;
      default:
        return `${base} bg-primary-blue hover:bg-blue-700 focus:ring-primary-blue`;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end mt-6">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="min-h-touch px-6 py-2.5 rounded-lg label-base font-semibold text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {cancelText}
        </button>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className={getSubmitClasses()}
      >
        {isSubmitting ? 'Guardando...' : submitText}
      </button>
    </div>
  );
};
