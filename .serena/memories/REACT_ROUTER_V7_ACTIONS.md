# Migración a React Router v7 Actions - Fase 2

## Resumen

Implementación completa de React Router v7 Actions para manejo de mutaciones de datos (POST, PUT, DELETE) en la aplicación de gestión de andamios.

## Estado de Implementación: ✅ COMPLETADO

**Última actualización**: 5 de enero de 2026

### Fases Completadas

#### ✅ Fase 2A: Creación de Actions (100%)
Todas las actions creadas y configuradas en el router.

#### ✅ Fase 2B: Migración de Componentes a React Router Forms (100%)
- ClientsPage migrado (usa FormV2 con intents)
- UsersPage migrado (usa FormV2 con intents) 
- ProjectsPage migrado (usa FormV2 con intents)
- CreateScaffoldPage migrado (usa Form nativo con FormData)

**Todas las páginas usan ahora el patrón React Router v7 con Form + Actions.**

### ✅ Router Actions Creadas

Todas las actions fueron agregadas al archivo `/home/proyectos/reportes/frontend/src/router/index.tsx`:

#### 1. **clientsPageAction** (línea ~152)
- **Intents**: `create`, `update`, `delete`, `reactivate`
- **Endpoints**: 
  - POST `/clients` - Crear cliente
  - PUT `/clients/:id` - Actualizar cliente
  - DELETE `/clients/:id` - Eliminar/desactivar cliente
  - POST `/clients/:id/reactivate` - Reactivar cliente
- **Características especiales**: 
  - Diferencia entre eliminación física y desactivación
  - Retorna `warning: true` cuando cliente es desactivado

#### 2. **usersPageAction** (línea ~219)
- **Intents**: `create`, `update`, `delete`
- **Endpoints**:
  - POST `/users` - Crear usuario
  - PUT `/users/:id` - Actualizar usuario
  - DELETE `/users/:id` - Eliminar usuario
- **Características especiales**:
  - Manejo condicional de contraseña (solo incluir si se proporciona)

#### 3. **projectsPageAction** (línea ~274)
- **Intents**: `create`, `update`, `delete`, `assign`
- **Endpoints**:
  - POST `/projects` - Crear proyecto
  - PUT `/projects/:id` - Actualizar proyecto
  - DELETE `/projects/:id` - Eliminar proyecto
  - POST `/projects/:id/users` - Asignar usuarios
- **Características especiales**:
  - Manejo de valores nulos para `assigned_supervisor_id` y `assigned_client_id`
  - Parseo de JSON para `userIds` en asignación

#### 4. **createScaffoldPageAction** (línea ~336)
- **Intent**: Crear andamio con archivos adjuntos
- **Endpoint**: POST `/scaffolds/project/:projectId`
- **Características especiales**:
  - Manejo de `FormData` (multipart/form-data) para upload de archivos
  - No establece `Content-Type` (navegador lo hace automáticamente con boundary)
  - Redirect automático a `/supervisor/projects/:projectId/scaffolds` después de crear

### ✅ Router Configurado

Las siguientes rutas tienen actions configuradas:

```typescript
// ADMIN ROUTES
{
  path: 'clients',
  element: <ClientsPage />,
  loader: clientsPageLoader,
  action: clientsPageAction,
},
{
  path: 'projects',
  element: <ProjectsPage />,
  loader: projectsPageLoader,
  action: projectsPageAction,
},
{
  path: 'users',
  element: <UsersPage />,
  loader: usersPageLoader,
  action: usersPageAction,
},
{
  path: 'project/:projectId/create-scaffold',
  element: <CreateScaffoldPage />,
  loader: createScaffoldPageLoader,
  action: createScaffoldPageAction,
},

// SUPERVISOR ROUTES
{
  path: 'project/:projectId/create-scaffold',
  element: <CreateScaffoldPage />,
  loader: createScaffoldPageLoader,
  action: createScaffoldPageAction,
},
```

### ✅ Helper `fetchAPI` Mejorado

Se actualizó el helper `fetchAPI` para soportar todos los métodos HTTP:

```typescript
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Response('No autorizado', { status: 401 });
    }
    if (response.status === 404) {
      throw new Response('No encontrado', { status: 404 });
    }
    throw new Response('Error del servidor', { status: 500 });
  }

  return response.json();
}
```

## Patrón de Action

### Estructura General

```typescript
async function somePageAction({ request, params }: any) {
  const user = getUserFromToken();
  if (!user) throw redirect('/login');

  const formData = await request.formData();
  const intent = formData.get('intent'); // Discriminador de acción

  try {
    switch (intent) {
      case 'create': {
        const data = {
          field1: formData.get('field1'),
          field2: formData.get('field2'),
        };
        await fetchAPI('/endpoint', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return { success: true, message: 'Mensaje de éxito' };
      }
      
      case 'update': {
        const id = formData.get('id');
        const data = { /* ... */ };
        await fetchAPI(`/endpoint/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        return { success: true, message: 'Mensaje de éxito' };
      }
      
      case 'delete': {
        const id = formData.get('id');
        await fetchAPI(`/endpoint/${id}`, {
          method: 'DELETE',
        });
        return { success: true, message: 'Mensaje de éxito' };
      }
      
      default:
        throw new Response('Acción no válida', { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in action:', error);
    return { 
      success: false, 
      message: error?.message || 'Error al procesar la solicitud' 
    };
  }
}
```

### Características Clave

1. **Validación de autenticación**: Todas las actions verifican el token
2. **Intent-based routing**: Uso del campo `intent` para múltiples operaciones
3. **Error handling robusto**: Try-catch con mensajes informativos
4. **Respuestas estructuradas**: `{ success, message, warning? }`
5. **Revalidación automática**: React Router revalida todos los loaders después de la action

## Integración en Componentes

### Patrón Actual (Hooks personalizados)

Los componentes actuales usan:
- `usePost`, `usePut`, `useDelete` de `hooks/useMutate`
- Modales con formularios separados
- Manejo manual de estado y refetch
- Toast notifications para feedback

### Patrón Objetivo (React Router v7)

Para migrar un componente:

```typescript
import { Form, useActionData, useNavigation } from 'react-router-dom';

function SomePage() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  
  const isSubmitting = navigation.state === 'submitting';
  
  // Mostrar toast cuando actionData cambia
  useEffect(() => {
    if (actionData?.success) {
      toast.success(actionData.message);
    } else if (actionData && !actionData.success) {
      toast.error(actionData.message);
    }
  }, [actionData]);
  
  return (
    <div>
      {/* Formulario de creación */}
      <Form method="post">
        <input type="hidden" name="intent" value="create" />
        <input name="field1" required />
        <input name="field2" />
        <button disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Crear'}
        </button>
      </Form>
      
      {/* Formulario de eliminación */}
      <Form method="post" onSubmit={(e) => {
        if (!confirm('¿Estás seguro?')) e.preventDefault();
      }}>
        <input type="hidden" name="intent" value="delete" />
        <input type="hidden" name="id" value={item.id} />
        <button type="submit">Eliminar</button>
      </Form>
    </div>
  );
}
```

## Estado Actual vs. Migración Completa

### ✅ Completado
- Actions creadas para todas las páginas CRUD
- Router configurado con actions
- Helper fetchAPI soporta todos los métodos
- Patrón documentado

### ✅ Completado en Fase 2B

**Componentes migrados a `<Form>` de React Router:**

1. **ClientsPage** - Usa FormV2 wrapper con intent-based routing
2. **UsersPage** - Usa FormV2 wrapper con intent-based routing  
3. **ProjectsPage** - Usa FormV2 wrapper con intent-based routing
4. **CreateScaffoldPage** - Usa Form nativo con FormData para file uploads

**Patrón FormV2 Wrapper:**
Los componentes ClientForm, UserForm y ProjectForm ahora reciben props `action` y `method` que pasan directamente a un wrapper `<Form>` de React Router. Esto mantiene compatibilidad con el código existente mientras usa el sistema de actions.

**Eliminaciones:**
- Ya NO se usan `usePost`, `usePut`, `useDelete` en páginas migradas
- Refetch manual eliminado (revalidación automática de React Router)
- Loading states simplificados con `useNavigation`

## Ventajas de la Migración

1. **Revalidación automática**: No más `refetch()` manual
2. **Estados de navegación**: `useNavigation` para loading states
3. **Menos boilerplate**: No hooks de mutación personalizados
4. **Progressive enhancement**: Formularios funcionan sin JS
5. **Mejor UX**: Estados de pending nativos del navegador
6. **Type safety**: ActionData tipado desde el router

## Próximos Pasos

### Fase 2B: Migración de Componentes (Pendiente)

1. **ClientsPage**: Convertir ClientForm a usar `<Form>` y `useActionData`
2. **UsersPage**: Migrar UserForm
3. **ProjectsPage**: Migrar ProjectForm y AssignSupervisorsForm
4. **CreateScaffoldPage**: Ya usa FormData, agregar useNavigation para loading

### Fase 3: Optimizaciones Avanzadas (Futuro)

1. **defer()**: Para streaming de datos grandes
2. **useFetcher**: Para mutaciones sin navegación (favoritos, toggles)
3. **Optimistic UI**: Actualizar UI antes de respuesta del servidor
4. **Code splitting**: Lazy load de routes

## Notas Técnicas

### FormData vs JSON

- **JSON** (`application/json`): Para la mayoría de las actions
  ```typescript
  body: JSON.stringify(data)
  ```

- **FormData** (`multipart/form-data`): Solo para uploads
  ```typescript
  body: formData // No establecer Content-Type
  ```

### Intent Pattern

Usar un solo action con intents es preferible a múltiples actions porque:
- Simplifica la configuración del router
- Centraliza la lógica de autenticación
- Facilita el manejo de errores consistente
- Mantiene todo el código relacionado junto

### Manejo de Errores

Las actions tienen tres niveles de error:
1. **throw new Response()**: Errores que muestran ErrorPage (401, 404, 500)
2. **return { success: false }**: Errores de validación/negocio (mostrar en UI)
3. **try/catch logging**: Para debugging

## Documentación React Router

Referencias útiles de Context7:
- Actions: https://github.com/remix-run/react-router/blob/main/docs/start/data/actions.md
- Form component: https://github.com/remix-run/react-router/blob/main/docs/api/components/Form.md
- useActionData: https://github.com/remix-run/react-router/blob/main/docs/api/hooks/useActionData.md
- useNavigation: https://github.com/remix-run/react-router/blob/main/docs/api/hooks/useNavigation.md
