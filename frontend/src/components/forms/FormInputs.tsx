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
        className="block label-base text-content-secondary mb-2"
      >
        {label}
        {required && <span className="text-danger ml-1" aria-label="requerido">*</span>}
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
          shadow-sm border rounded-lg w-full py-2.5 px-3 body-base text-content-secondary 
          leading-tight min-h-touch
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          disabled:bg-surface-overlay disabled:cursor-not-allowed disabled:text-content-muted
          ${error ? 'border-danger focus:ring-danger focus:border-danger' : 'border-edge-strong'}
          transition-colors
        `}
      />
      
      {error && (
        <p id={`${id}-error`} className="mt-1 body-small text-danger-text" role="alert">
          {error}
        </p>
      )}
      
      {!error && helpText && (
        <p id={`${id}-help`} className="mt-1 body-small text-content-muted">
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
        className="block label-base text-content-secondary mb-2"
      >
        {label}
        {required && <span className="text-danger ml-1" aria-label="requerido">*</span>}
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
          shadow-sm border rounded-lg w-full py-2.5 px-3 body-base text-content-secondary 
          leading-relaxed resize-y
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          disabled:bg-surface-overlay disabled:cursor-not-allowed disabled:text-content-muted
          ${error ? 'border-danger focus:ring-danger focus:border-danger' : 'border-edge-strong'}
          transition-colors
        `}
      />
      
      {error && (
        <p id={`${id}-error`} className="mt-1 body-small text-danger-text" role="alert">
          {error}
        </p>
      )}
      
      {!error && helpText && (
        <p id={`${id}-help`} className="mt-1 body-small text-content-muted">
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
        className="block label-base text-content-secondary mb-2"
      >
        {label}
        {required && <span className="text-danger ml-1" aria-label="requerido">*</span>}
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
          shadow-sm border rounded-lg w-full py-2.5 px-3 body-base text-content-secondary 
          leading-tight min-h-touch
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          disabled:bg-surface-overlay disabled:cursor-not-allowed disabled:text-content-muted
          ${error ? 'border-danger focus:ring-danger focus:border-danger' : 'border-edge-strong'}
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
        <p id={`${id}-error`} className="mt-1 body-small text-danger-text" role="alert">
          {error}
        </p>
      )}
      
      {!error && helpText && (
        <p id={`${id}-help`} className="mt-1 body-small text-content-muted">
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
    const base = 'min-h-touch px-6 py-2.5 rounded-lg label-base font-semibold text-white shadow-card hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all';
    
    switch (submitVariant) {
      case 'danger':
        return `${base} bg-red-600 hover:bg-red-700 focus:ring-danger`;
      case 'success':
        return `${base} bg-success hover:bg-success-text focus:ring-success`;
      default:
        return `${base} bg-primary hover:bg-primary-hover focus:ring-primary`;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end mt-6">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="min-h-touch px-6 py-2.5 rounded-lg label-base font-semibold text-content-secondary bg-surface border-2 border-edge-strong hover:bg-surface-muted hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
