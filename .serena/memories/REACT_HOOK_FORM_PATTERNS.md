# Patrones de Formularios - React Hook Form + Zod

**Estado:** Actual

## Stack Tecnológico
```json
{
  "react-hook-form": "^7.x",
  "zod": "^3.x", 
  "@hookform/resolvers": "^3.x"
}
```

## Cuándo Usar Cada Patrón

### React Hook Form + Zod
✅ **Usar para:**
- Formularios standalone sin navegación
- Páginas de perfil/edición de usuario
- Login/registro
- Formularios modales
- Cuando necesitas validación compleja en cliente

**Ejemplo:** LoginPage, ProfilePage, UserFormPage, ClientFormPage

### React Router Form
✅ **Usar para:**
- Formularios que redirigen después de submit
- Páginas con actions y loaders
- Cuando el formulario es parte del flujo de navegación
- Upload de archivos con FormData

**Ejemplo:** CreateScaffoldPage, ProjectForm, componentes con actions

## Schema Patterns

### 1. Schema Básico
```typescript
const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  email: z.string().email('Email inválido'),
  phone: z.string().max(20).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;
```

### 2. Schema con Password
```typescript
const schema = z.object({
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener mayúscula')
    .regex(/[a-z]/, 'Debe contener minúscula')
    .regex(/[0-9]/, 'Debe contener número'),
});
```

### 3. Schema con Confirmación
```typescript
const schema = z.object({
  password: z.string().min(8).optional().or(z.literal('')),
  confirmPassword: z.string().optional(),
}).refine((data) => !data.password || data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});
```

### 4. Schema con Enums
```typescript
const schema = z.object({
  role: z.enum(['admin', 'supervisor', 'client'], {
    errorMap: () => ({ message: 'Rol inválido' })
  }),
});
```

### 5. Schema con FileList
```typescript
const fileListSchema = z.custom<FileList>(
  (val) => val instanceof FileList,
  { message: 'Debe seleccionar archivos' }
).refine((files) => files.length > 0, {
  message: 'Debe seleccionar al menos un archivo',
}).refine((files) => {
  return Array.from(files).every(file => file.size <= 10 * 1024 * 1024);
}, {
  message: 'Cada archivo debe ser menor a 10MB',
}).refine((files) => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  return Array.from(files).every(file => validTypes.includes(file.type));
}, {
  message: 'Solo se permiten imágenes JPG, PNG o WEBP',
});
```

### 6. Schema con Validación de Rango
```typescript
const schema = z.object({
  height: z.coerce.number()
    .min(0, 'Debe ser mayor a 0')
    .max(100, 'No puede superar 100 metros'),
  width: z.coerce.number().min(0).max(100),
  length: z.coerce.number().min(0).max(100),
});
```

## Uso de useForm

### Setup Básico
```typescript
const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
  reset,
  watch,
  setValue,
} = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: {
    name: '',
    email: '',
  },
});
```

### Register en Inputs
```typescript
<input 
  type="text" 
  {...register('name')}
  className={errors.name ? 'border-red-500' : ''}
/>
<ErrorMessage message={errors.name?.message} />
```

### Submit Handler
```typescript
const onSubmit = async (data: FormData) => {
  try {
    await mutation.mutateAsync(data);
    toast.success('Guardado con éxito');
    navigate('/success');
  } catch (error: unknown) {
    handleApiError(error);
    const apiError = error as ApiError;
    if (!apiError?.response?.data?.fieldErrors) {
      toast.error('Error al guardar');
    }
  }
};

<form onSubmit={handleSubmit(onSubmit)}>
```

### Watch para Campos Computados
```typescript
const { watch } = useForm();
const height = watch('height');
const width = watch('width');
const length = watch('length');

const cubicMeters = useMemo(() => {
  return (height * width * length).toFixed(2);
}, [height, width, length]);
```

### Reset con Datos
```typescript
useEffect(() => {
  if (user) {
    reset({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
    });
  }
}, [user, reset]);
```

### Limpiar Solo Algunos Campos
```typescript
reset((prev) => ({ ...prev, password: '', confirmPassword: '' }));
```

## Manejo de Errores

### ErrorMessage Component
```typescript
// components/ErrorMessage.tsx
const ErrorMessage = React.memo(({ message, className = '' }) => {
  if (!message) return null;
  return (
    <p className={`text-red-600 text-sm mt-1 ${className}`}>
      {message}
    </p>
  );
});
```

### useFormErrors Hook (Simplificado)
```typescript
export const useFormErrors = () => {
  const [generalError, setGeneralError] = useState<string>('');

  const handleApiError = useCallback((error: unknown) => {
    const apiError = error as ApiError;
    const errorData = apiError.response?.data;
    
    if (!errorData) {
      setGeneralError('Error de conexión');
      return;
    }
    
    setGeneralError(errorData.message || 'Ocurrió un error');
  }, []);

  const clearErrors = useCallback(() => {
    setGeneralError('');
  }, []);

  return { generalError, handleApiError, clearErrors };
};
```

### Mostrar Error General
```typescript
const { generalError, handleApiError, clearErrors } = useFormErrors();

{generalError && (
  <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
    <p className="text-red-800 font-medium">{generalError}</p>
  </div>
)}
```

## Patrones Avanzados

### Validación Condicional
```typescript
const schema = z.object({
  isCompany: z.boolean(),
  companyName: z.string().optional(),
}).refine((data) => {
  if (data.isCompany) {
    return data.companyName && data.companyName.length > 0;
  }
  return true;
}, {
  message: 'Nombre de empresa requerido',
  path: ['companyName'],
});
```

### Arrays de Objetos
```typescript
const schema = z.object({
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().min(1),
  })).min(1, 'Debe tener al menos un item'),
});
```

### Transformaciones
```typescript
const schema = z.object({
  price: z.string().transform((val) => parseFloat(val)),
  date: z.string().transform((str) => new Date(str)),
});
```

## Anti-Patterns a Evitar

### ❌ NO Usar
```typescript
// NO usar useState para valores de formulario
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');

// NO manejar onChange manualmente
onChange={(e) => setEmail(e.target.value)}
```

### ✅ SÍ Usar
```typescript
// SÍ usar register
{...register('email')}
{...register('password')}

// O setValue si es dinámico
setValue('email', newEmail);
```

### ❌ NO Validar Manualmente
```typescript
// NO hacer validaciones manuales
if (!email.includes('@')) {
  setError('Email inválido');
}
```

### ✅ SÍ Usar Zod
```typescript
// SÍ usar schema de Zod
email: z.string().email('Email inválido'),
```

## Migración de useState a RHF

### Antes
```typescript
const [formData, setFormData] = useState({
  name: '',
  email: '',
});

const handleChange = (e) => {
  setFormData(prev => ({
    ...prev,
    [e.target.name]: e.target.value
  }));
};

<input 
  name="name"
  value={formData.name}
  onChange={handleChange}
/>
```

### Después
```typescript
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: '', email: '' },
});

<input {...register('name')} />
<ErrorMessage message={errors.name?.message} />
```

## Checklist de Migración

- [ ] Instalar dependencias (react-hook-form, zod, @hookform/resolvers)
- [ ] Crear schema de Zod con todas las validaciones
- [ ] Reemplazar useState con useForm
- [ ] Cambiar inputs a {...register('field')}
- [ ] Actualizar onSubmit a handleSubmit(onSubmit)
- [ ] Usar errors del formState en vez de estado local
- [ ] Agregar ErrorMessage components
- [ ] Eliminar handleChange manual
- [ ] Reemplazar disabled con isSubmitting
- [ ] Probar todos los casos de validación


