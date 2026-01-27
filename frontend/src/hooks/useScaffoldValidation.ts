import { useState, useCallback } from 'react';
import { IMAGE_MAX_BYTES, IMAGE_MAX_LABEL } from '../config/imageLimits';

/**
 * Hook para manejar validaciones de formularios de andamios
 * Implementa las reglas de negocio del sistema
 */
export const useScaffoldValidation = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Valida dimensiones (ancho, largo, altura)
   */
  const validateDimensions = useCallback((
    width: number,
    length: number,
    height: number
  ): boolean => {
    const newErrors: Record<string, string> = {};

    if (width <= 0 || width > 100) {
      newErrors.width = 'El ancho debe estar entre 0 y 100 metros';
    }
    if (length <= 0 || length > 100) {
      newErrors.length = 'El largo debe estar entre 0 y 100 metros';
    }
    if (height <= 0 || height > 100) {
      newErrors.height = 'La altura debe estar entre 0 y 100 metros';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  /**
   * Valida que el progreso sea 100% si el estado es "armado"
   */
  const validateProgressForAssembled = useCallback((
    assemblyStatus: string,
    progress: number
  ): boolean => {
    if (assemblyStatus === 'assembled' && progress !== 100) {
      setErrors({
        progress_percentage: 'El progreso debe ser 100% para andamios armados',
      });
      return false;
    }
    return true;
  }, []);

  /**
   * Valida que un andamio con tarjeta verde no pueda estar desarmado
   */
  const validateGreenCardNotDisassembled = useCallback((
    cardStatus: string,
    assemblyStatus: string
  ): boolean => {
    if (cardStatus === 'green' && assemblyStatus === 'disassembled') {
      setErrors({
        card_status: 'Un andamio desarmado no puede tener tarjeta verde',
      });
      return false;
    }
    return true;
  }, []);

  /**
   * Valida formato de imagen
   */
  const validateImageFormat = useCallback((file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    
    if (!validTypes.includes(file.type)) {
      setErrors({
        image: 'Solo se permiten imágenes JPG, PNG o WEBP',
      });
      return false;
    }
    return true;
  }, []);

  /**
   * Valida tamaño de imagen (máximo configurado)
   */
  const validateImageSize = useCallback((file: File): boolean => {
    if (file.size > IMAGE_MAX_BYTES) {
      setErrors({
        image: `La imagen no puede superar los ${IMAGE_MAX_LABEL}`,
      });
      return false;
    }
    return true;
  }, []);

  /**
   * Valida que la imagen de desarmado esté presente al cambiar a desarmado
   */
  const validateDisassemblyImage = useCallback((
    assemblyStatus: string,
    disassemblyImage: File | null
  ): boolean => {
    if (assemblyStatus === 'disassembled' && !disassemblyImage) {
      setErrors({
        disassembly_image: 'La imagen de desarmado es obligatoria',
      });
      return false;
    }
    return true;
  }, []);

  /**
   * Limpia un error específico
   */
  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  /**
   * Limpia todos los errores
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Valida todo el formulario de andamio
   */
  const validateScaffoldForm = useCallback((data: {
    width: number;
    length: number;
    height: number;
    progress_percentage: number;
    assembly_status: string;
    card_status: string;
    initial_image?: File | null;
    disassembly_image?: File | null;
  }): boolean => {
    const validationResults: boolean[] = [];

    // Validar dimensiones
    validationResults.push(
      validateDimensions(data.width, data.length, data.height)
    );

    // Validar progreso para armados
    validationResults.push(
      validateProgressForAssembled(data.assembly_status, data.progress_percentage)
    );

    // Validar tarjeta verde no desarmado
    validationResults.push(
      validateGreenCardNotDisassembled(data.card_status, data.assembly_status)
    );

    // Validar imagen inicial (solo en creación)
    if (data.initial_image === null) {
      setErrors((prev) => ({
        ...prev,
        initial_image: 'La imagen inicial es obligatoria',
      }));
      validationResults.push(false);
    } else if (data.initial_image) {
      validationResults.push(validateImageFormat(data.initial_image));
      validationResults.push(validateImageSize(data.initial_image));
    }

    // Validar imagen de desarmado si aplica
    if (data.assembly_status === 'disassembled') {
      validationResults.push(
        validateDisassemblyImage(data.assembly_status, data.disassembly_image || null)
      );
      if (data.disassembly_image) {
        validationResults.push(validateImageFormat(data.disassembly_image));
        validationResults.push(validateImageSize(data.disassembly_image));
      }
    }

    return validationResults.every((result) => result);
  }, [
    validateDimensions,
    validateProgressForAssembled,
    validateGreenCardNotDisassembled,
    validateImageFormat,
    validateImageSize,
    validateDisassemblyImage,
  ]);

  return {
    errors,
    validateDimensions,
    validateProgressForAssembled,
    validateGreenCardNotDisassembled,
    validateImageFormat,
    validateImageSize,
    validateDisassemblyImage,
    validateScaffoldForm,
    clearError,
    clearErrors,
  };
};

export default useScaffoldValidation;
