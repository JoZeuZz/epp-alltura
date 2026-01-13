# Sistema de Validación Inline - Enero 12, 2026

## Resumen
Sistema completo de validación con errores de campo mostrados inline (debajo de inputs) en lugar de solo notificaciones toast. Mejora significativa de UX.

## Arquitectura

### Backend: Estructura de Errores
```javascript
// Joi validation middleware (routes/*.routes.js)
const validateBody = (schema) => {
  return async (req, res, next) => {
    try {
      req.body = await schema.validateAsync(req.body, { convert: true });
      next();
    } catch (err) {
      if (err.isJoi) {
        const errors = err.details.map(detail => ({
          field: detail.path[0],
          message: detail.message
        }));
        return res.status(400).json({ 
          error: 'Validation failed', 
          message: errors[0].message,
          errors 
        });
      }
      next(err);
    }
  };
};
```

**Formato de respuesta 400:**
```json
{
  "error": "Validation failed",
  "message": "El nombre solo puede contener letras y espacios",
  "errors": [
    { "field": "first_name", "message": "El nombre solo puede contener letras..." },
    { "field": "email", "message": "El email no es válido" }
  ]
}
```

### Frontend: Extracción de Errores

#### 1. fetchAPI Enhancement (router/index.tsx)
```typescript
const fetchAPI = async (url, options) => {
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.message) as any;
    // Adjuntar array de validación al objeto error
    error.validationErrors = data.errors || [];
    throw error;
  }
  
  return data;
};
```

#### 2. Actions: Convertir a fieldErrors (router/index.tsx)
```typescript
export async function usersPageAction({ request }: ActionFunctionArgs) {
  try {
    // ... llamada a fetchAPI
  } catch (error: any) {
    const fieldErrors: Record<string, string> = {};
    
    // Extraer validationErrors y mapear a objeto
    if (error.validationErrors && Array.isArray(error.validationErrors)) {
      error.validationErrors.forEach((err: any) => {
        fieldErrors[err.field] = err.message;
      });
    }
    
    // Solo loggear errores inesperados (no validación)
    const isValidationError = error.validationErrors?.length > 0;
    if (!isValidationError) {
      console.error('Error in users action:', error);
    }
    
    return { 
      success: false, 
      message: error.message, 
      fieldErrors 
    };
  }
}
```

#### 3. Componentes: Mostrar Errores Inline

**UserForm.tsx, ProjectForm.tsx, ClientForm.tsx:**
```tsx
import { useActionData } from 'react-router-dom';

export default function UserForm({ user, clients, onCancel }) {
  const actionData = useActionData();
  const errors = actionData?.fieldErrors || {};
  
  return (
    <form>
      {/* Campo con validación */}
      <div>
        <label>Nombre *</label>
        <input
          name="first_name"
          defaultValue={user?.first_name}
          className={`base-classes ${
            errors.first_name ? 'border-red-500 focus:border-red-500' : 'focus:border-primary-blue'
          }`}
        />
        {errors.first_name && (
          <p className="text-red-500 text-xs italic mt-1">{errors.first_name}</p>
        )}
      </div>
    </form>
  );
}
```

#### 4. Páginas: Toast Condicional

**UsersPage.tsx, ProjectsPage.tsx, ClientsPage.tsx:**
```tsx
import { useActionData } from 'react-router-dom';

const actionData = useActionData() as { 
  success?: boolean; 
  message?: string; 
  fieldErrors?: Record<string, string>;
};

useEffect(() => {
  if (actionData && !actionData.success) {
    // Solo mostrar toast si NO hay errores de campo (errores inesperados)
    const hasFieldErrors = actionData.fieldErrors && 
                          Object.keys(actionData.fieldErrors).length > 0;
    
    if (!hasFieldErrors) {
      toast.error(actionData.message || 'Ocurrió un error');
    }
  }
}, [actionData]);
```

## Validaciones Implementadas

### Usuarios (users.routes.js)
- **first_name/last_name:** Solo letras y espacios, sin números
  - Pattern: `/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/`
  - Mensaje: "El nombre/apellido solo puede contener letras y espacios (no se permiten números)"
- **email:** Formato válido + @
- **password:** Min 12 caracteres
- **client_id:** Requerido si role='client', prohibido si role='admin'/'supervisor'

### Proyectos (projects.routes.js)
- **name:** String, max 255 caracteres
- **client_id:** Número entero positivo requerido

### Clientes (clients.routes.js)
- **name:** String requerido
- **email:** Formato válido opcional

### Andamios (scaffolds.routes.js)
- **project_id:** Número entero positivo requerido
- **height/width/length:** Números positivos, max 999.99
- **progress_percentage:** Entero 0-100 requerido
- **FormData handling:** `{ convert: true }` convierte strings a números automáticamente

## Flujo Completo

1. **Usuario envía formulario** → POST /api/users
2. **validateBody middleware** valida con Joi
3. **Error 400** con estructura `{ error, message, errors: [{field, message}] }`
4. **fetchAPI** captura error y adjunta `validationErrors` al objeto error
5. **Action** extrae `fieldErrors` del error.validationErrors
6. **Action retorna** `{ success: false, message, fieldErrors }`
7. **Componente** lee `actionData.fieldErrors` con `useActionData()`
8. **UI muestra:**
   - Bordes rojos en inputs con error
   - Mensaje de error debajo del input (texto rojo pequeño)
   - Toast NO se muestra (solo para errores no-validación)
9. **Console.error** solo se ejecuta para errores inesperados (500, network, etc.)

## Beneficios UX

✅ Usuario ve exactamente qué campo tiene error y por qué  
✅ No necesita buscar en toast notifications  
✅ Errores persistentes (no desaparecen en 3 segundos)  
✅ Múltiples errores visibles simultáneamente  
✅ Guía visual clara (bordes rojos + iconos)  
✅ Console limpio (solo errores reales)

## Archivos Modificados

### Backend
- `/backend/src/routes/users.routes.js` (validateBody, patrones nombres)
- `/backend/src/routes/scaffolds.routes.js` (validateBody con convert: true)

### Frontend
- `/frontend/src/router/index.tsx` (fetchAPI + 3 actions)
- `/frontend/src/components/UserForm.tsx`
- `/frontend/src/components/ProjectForm.tsx`
- `/frontend/src/components/ClientForm.tsx`
- `/frontend/src/pages/admin/UsersPage.tsx` (tipo actionData + toast condicional)
- `/frontend/src/pages/admin/ProjectsPage.tsx` (tipo actionData + toast condicional)
- `/frontend/src/pages/admin/ClientsPage.tsx` (tipo actionData + toast condicional)

## Casos de Uso Reales

### Caso 1: Nombre con números
- Input: `{ first_name: "Juan123" }`
- Backend: 400 con `errors: [{ field: "first_name", message: "El nombre solo puede contener letras..." }]`
- UI: Borde rojo en input + mensaje debajo
- Console: Sin log (es validación esperada)

### Caso 2: Múltiples errores
- Input: `{ first_name: "123", email: "invalid" }`
- UI: Ambos inputs con borde rojo + mensajes específicos
- Toast: NO aparece
- Console: Sin log

### Caso 3: Error inesperado (500)
- Backend: 500 "Database connection failed"
- UI: Toast de error genérico
- Console: `console.error('Error in users action:', error)`

## Mantenimiento

### Agregar validación a nuevo campo
1. Backend: Actualizar schema Joi en routes
2. Frontend: Agregar campo al FormData
3. Frontend: Agregar `{errors.campo && <p>...</p>}` debajo del input
4. Frontend: Agregar clase condicional `${errors.campo ? 'border-red-500' : ''}`

### Personalizar mensaje
```javascript
// Backend
field_name: Joi.string().pattern(/regex/)
  .messages({
    'string.pattern.base': 'Mensaje personalizado aquí'
  })
```
