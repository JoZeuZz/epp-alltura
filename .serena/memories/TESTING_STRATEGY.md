# Estrategia de Testing


**Estado:** Suite de tests implementada (110+ tests, 60%+ coverage global)  
**Framework:** Jest v30+  
**Patrón:** AAA (Arrange-Act-Assert)

---

## RESUMEN EJECUTIVO

Suite completa de testing para servicios críticos del backend con enfoque en autenticación, lógica de negocio de scaffolds, validaciones de soft delete y generadores de reportes. Implementación progresiva priorizando alta cobertura (65-85%) en módulos críticos.

---

## ARQUITECTURA DE TESTING

### Framework y Configuración

**Jest v30+** con las siguientes características:
- **Test Environment:** Node.js
- **Coverage Thresholds:** 60% global mínimo (branches, functions, lines, statements)
- **Reporters:** text, lcov, html
- **Clear Mocks:** Automático entre tests (clearMocks: true)
- **Detect Open Handles:** Habilitado para detectar conexiones pendientes
- **Force Exit:** Habilitado para CI/CD

### Estructura de Archivos

```
/backend/src/tests
├── services/
│   ├── auth.service.test.js          # 16 tests - Authentication
│   ├── scaffolds.service.test.js     # 22 tests - Business logic
│   ├── projects.service.test.js      # 18 tests - Soft delete
│   └── clients.service.test.js       # 16 tests - Soft delete
└── lib/
    ├── pdfGenerator.test.js          # 18 tests - Reports
    └── excelGenerator.test.js        # 20 tests - Exports
```

**Total: 6 archivos, 110+ tests**

**Nota de auditoría (código actual):** además existen tests fuera de `/backend/src/tests`:
- `/backend/src/routes/auth.test.js`
- `/backend/src/index.test.js`
- `/backend/src/lib/excelGenerator.test.js`

---

## TESTS IMPLEMENTADOS

### 1. AuthService (16 tests - 85% coverage estimado)

**Archivo:** `/backend/src/tests/services/auth.service.test.js`

**Métodos Testeados:**
1. `registerUser()` - Registro de usuarios
   - Creación exitosa con hash bcrypt
   - Validación email duplicado
   - Validación client_id requerido para role='client'
   - Manejo de errores DB

2. `loginUser()` - Inicio de sesión
   - Login exitoso con JWT generado
   - Usuario no encontrado (404)
   - Contraseña incorrecta (401)
   - Generación de refresh token en Redis

3. `refreshAccessToken()` - Renovación de tokens
   - Renovación exitosa con refresh token válido
   - Refresh token inválido/expirado (401)

4. `logoutUser()` - Cierre de sesión
   - Logout exitoso con blacklist en Redis
   - Revocación de refresh token

5. `changePassword()` - Cambio de contraseña
   - Cambio exitoso con hash bcrypt
   - Contraseña actual incorrecta (401)
   - Revocación de todos los tokens

**Técnicas de Mocking:**
```javascript
jest.mock('../../models/user');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../lib/logger');
```

**Coverage Crítico:**
- ✅ Validación de credenciales
- ✅ Hash de passwords con bcrypt
- ✅ Generación de JWT (access + refresh)
- ✅ Blacklist de tokens en Redis
- ✅ Error handling completo

---

### 2. ScaffoldService (22 tests - 80% coverage estimado)

**Archivo:** `/backend/src/tests/services/scaffolds.service.test.js`

**Métodos Testeados:**
1. `calculateCubicMeters()` - Cálculos de volumen
   - Cálculo correcto (width × length × height)
   - Conversión de strings a números
   - Valores decimales precisos

2. `determineAssemblyState()` - Determinación de estados
   - 0% → 'disassembled'
   - 1-99% → 'in_progress'
   - 100% → 'assembled'

3. `validateActiveProject()` - Validación proyecto activo
   - Proyecto activo válido
   - Proyecto no encontrado (404)
   - Proyecto desactivado (400)
   - Cliente del proyecto desactivado (400)

4. `validateUserPermissions()` - Permisos RBAC
   - Admin puede editar cualquier scaffold
   - Supervisor solo puede editar sus propios scaffolds (403)

5. `createScaffold()` - Creación de andamios
   - Creación exitosa con imagen GCS
   - Validación proyecto activo
   - Cálculo automático m³
   - Registro en historial inmutable
   - Error si falta imagen (400)

6. `updateScaffold()` - Actualización de andamios
   - Actualización exitosa con validaciones
   - Validación permisos usuario
   - Validación proyecto activo
   - Sincronización de estados
   - Registro en historial

7. `updateAssemblyStatus()` - Cambio de estado
   - Cambio exitoso con validaciones
   - Validación de progreso no retrocede
   - Actualización de estado assembly_status

8. `disassembleScaffold()` - Desarmado
   - Desarmado exitoso con imagen y notas
   - Validación proyecto activo
   - Error si falta imagen (400)
   - Registro en historial tipo 'disassemble'

9. `deleteScaffold()` - Eliminación
   - Eliminación exitosa con registro previo
   - Historial preservado con datos denormalizados
   - Eliminación de imágenes GCS

**Técnicas de Mocking:**
```javascript
jest.mock('../../models/scaffold');
jest.mock('../../models/project');
jest.mock('../../models/scaffoldHistory');
jest.mock('../../lib/googleCloud');
jest.mock('../../lib/logger');
```

**Coverage Crítico:**
- ✅ Lógica de estados dual (card_status + assembly_status)
- ✅ Validaciones de proyecto activo
- ✅ RBAC para supervisores
- ✅ Cálculos de m³
- ✅ Integración con GCS (uploads)
- ✅ Historial inmutable
- ✅ Soft delete indirecto

---

### 3. ProjectService (18 tests - 75% coverage estimado)

**Archivo:** `/backend/src/tests/services/projects.service.test.js`

**Métodos Testeados:**
1. `deleteOrDeactivateProject()` - Soft delete condicional
   - Proyecto SIN andamios → DELETE físico
   - Proyecto CON andamios → Desactivar (active = FALSE)
   - Proyecto no encontrado (404)
   - Validación de count de scaffolds

2. `reactivateProject()` - Reactivación
   - Reactivación exitosa (active = TRUE)
   - Proyecto no encontrado (404)
   - Proyecto ya activo (sin cambios)

3. `createProject()` - Creación
   - Creación exitosa con validaciones
   - Validación client_id válido

4. `updateProject()` - Actualización
   - Actualización exitosa
   - Inmutabilidad: solo actualiza si proyecto existe
   - Validación client_id al cambiar

5. `getProjectById()` - Consulta
   - Obtención exitosa
   - Proyecto no encontrado retorna null
   - Query incluye client_active

**Técnicas de Mocking:**
```javascript
jest.mock('../../models/project');
jest.mock('../../models/client');
jest.mock('../../lib/logger');
```

**Coverage Crítico:**
- ✅ Soft delete condicional (lógica de negocio)
- ✅ Reactivación de proyectos
- ✅ Validación de dependencias (scaffolds)
- ✅ Inmutabilidad de proyectos desactivados
- ✅ Query JOIN con clients

---

### 4. ClientService (16 tests - 80% coverage estimado)

**Archivo:** `/backend/src/tests/services/clients.service.test.js`

**Métodos Testeados:**
1. `deleteOrDeactivateClient()` - Soft delete condicional
   - Cliente SIN proyectos → DELETE físico
   - Cliente CON proyectos → Desactivar (active = FALSE)
   - Cliente no encontrado (404)
   - Validación de count de projects

2. `reactivateClient()` - Reactivación
   - Reactivación exitosa (active = TRUE)
   - Cascada: reactivar proyectos del cliente
   - Cliente no encontrado (404)

3. `validateUniqueName()` - Validación nombre único
   - Nombre disponible (válido)
   - Nombre duplicado con error descriptivo (400)

4. `createClient()` - Creación
   - Creación exitosa con validaciones
   - Validación nombre único antes de crear

5. `updateClient()` - Actualización
   - Actualización exitosa
   - Validación nombre único (excluyendo mismo cliente)

6. `getActiveClients()` - Filtrado
   - Solo retorna clientes con active = TRUE
   - Excluye clientes desactivados

**Técnicas de Mocking:**
```javascript
jest.mock('../../models/client');
jest.mock('../../lib/logger');
```

**Coverage Crítico:**
- ✅ Soft delete condicional
- ✅ Reactivación con cascada a proyectos
- ✅ Validación nombre único (constraint)
- ✅ Filtrado de activos
- ✅ Error handling específico

---

### 5. pdfGenerator (18 tests - 70% coverage estimado)

**Archivo:** `/backend/src/tests/lib/pdfGenerator.test.js`

**Función Testeada:** `generateScaffoldsPDF()`

**Casos de Prueba:**
1. Generación PDF básica
   - PDF generado con proyecto y andamios
   - Validación de parámetros requeridos

2. Estadísticas y métricas
   - Cálculo de m³ totales
   - Conteo por estado (assembled, in_progress, disassembled)
   - Porcentajes correctos

3. Paginación
   - Múltiples páginas con muchos andamios
   - Encabezados/pies de página en todas las páginas

4. Casos edge
   - Proyecto sin andamios (PDF vacío válido)
   - Datos faltantes (sin descripción, sin notas)

5. Error handling
   - Error si falta proyecto (400)
   - Error si falta array scaffolds (400)
   - Manejo de errores de PDFKit

**Técnicas de Mocking:**
```javascript
jest.mock('pdfkit');
jest.mock('../../lib/logger');
```

**Coverage Crítico:**
- ✅ Generación de PDF con PDFKit
- ✅ Estadísticas agregadas
- ✅ Paginación automática
- ✅ Formateo de datos (fechas, números)
- ✅ Error handling

---

### 6. excelGenerator (20 tests - 75% coverage estimado)

**Archivo:** `/backend/src/tests/lib/excelGenerator.test.js`

**Función Testeada:** `generateReportExcel()`

**Casos de Prueba:**
1. Generación Excel básica
   - Workbook creado con proyecto y andamios
   - Validación de parámetros requeridos

2. Worksheets y estructura
   - Worksheet "Andamios" creado
   - Columnas correctas (Nº, Área, Tag, Estado, etc.)
   - Encabezados en primera fila

3. Mapeo de datos
   - Estado 'assembled' → "Armado"
   - Estado 'in_progress' → "En Proceso"
   - Estado 'disassembled' → "Desarmado"
   - Card status 'green' → "Verde", 'red' → "Rojo"

4. Formato de celdas
   - Números con decimales (m³)
   - Porcentajes (0-100%)
   - Fechas en formato local

5. Casos edge
   - Proyecto sin andamios (Excel vacío válido)
   - Valores null/undefined

6. Error handling
   - Error si falta proyecto (400)
   - Error si falta array scaffolds (400)
   - Manejo de errores de ExcelJS

**Técnicas de Mocking:**
```javascript
jest.mock('exceljs');
jest.mock('../../lib/logger');
```

**Coverage Crítico:**
- ✅ Generación de workbook con ExcelJS
- ✅ Mapeo de estados a español
- ✅ Formato de columnas
- ✅ Estadísticas agregadas
- ✅ Error handling

---

## PATRONES DE TESTING

### Patrón AAA (Arrange-Act-Assert)

**Estructura Consistente:**
```javascript
describe('ServiceName.methodName()', () => {
  it('debería comportamiento esperado', async () => {
    // ARRANGE: Configurar mocks y datos
    const mockData = { ... };
    Model.method.mockResolvedValue(mockData);
    
    // ACT: Ejecutar método
    const result = await ServiceName.methodName(params);
    
    // ASSERT: Verificar resultado
    expect(result).toEqual(expectedResult);
    expect(Model.method).toHaveBeenCalledWith(expectedParams);
  });
});
```

### Configuración beforeEach

**Limpieza Automática:**
```javascript
beforeEach(() => {
  jest.clearAllMocks(); // Limpiar historial de llamadas
});
```

### Validación de Llamadas

**Verificación Exhaustiva:**
```javascript
// Verificar que se llamó
expect(Model.create).toHaveBeenCalled();

// Verificar parámetros exactos
expect(Model.create).toHaveBeenCalledWith({
  field1: 'value1',
  field2: 'value2'
});

// Verificar número de llamadas
expect(Logger.info).toHaveBeenCalledTimes(1);
```

### Manejo de Errores

**Testing de Error Paths:**
```javascript
it('debería lanzar error si proyecto no encontrado', async () => {
  // ARRANGE
  Project.getById.mockResolvedValue(null);
  
  // ACT & ASSERT
  await expect(
    ScaffoldService.validateActiveProject(999)
  ).rejects.toThrow('Proyecto no encontrado');
  
  await expect(
    ScaffoldService.validateActiveProject(999)
  ).rejects.toMatchObject({
    statusCode: 404
  });
});
```

---

## CONFIGURACIÓN JEST

### jest.config.js

```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/db/**',
    '!src/scripts/**',
    '!src/tests/**'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  clearMocks: true,
  detectOpenHandles: true,
  forceExit: true
};
```

**Características:**
- **coverageDirectory:** Reportes en carpeta /coverage
- **collectCoverageFrom:** Excluye index.js, DB, scripts, tests
- **coverageThreshold:** 60% mínimo global
- **coverageReporters:** Terminal + HTML + LCOV (CI/CD)
- **clearMocks:** Auto-limpiar entre tests
- **detectOpenHandles:** Detectar conexiones abiertas
- **forceExit:** Forzar salida (CI/CD)

---

## SCRIPTS NPM

### package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:verbose": "jest --verbose",
    "test:services": "jest src/tests/services",
    "test:lib": "jest src/tests/lib"
  }
}
```

**Uso:**
- `npm test` - Ejecutar todos los tests (single run)
- `npm run test:watch` - Modo watch (desarrollo)
- `npm run test:coverage` - Tests + reporte coverage
- `npm run test:verbose` - Output detallado con describe/it
- `npm run test:services` - Solo tests de services
- `npm run test:lib` - Solo tests de libs

---

## ESTRATEGIA DE COVERAGE

### Prioridades de Cobertura

**Tier 1 - Crítico (75-85% target):**
- AuthService (seguridad)
- ScaffoldService (lógica de negocio)
- ProjectService (soft delete)
- ClientService (soft delete)

**Tier 2 - Alto (65-75% target):**
- pdfGenerator (reportes)
- excelGenerator (exportes)

**Tier 3 - Medio (50-65% target):**
- DashboardService (estadísticas)
- NotificationService (push)

**Tier 4 - Bajo (<50% target):**
- UserService (CRUD simple)
- SupervisorDashboardService (queries simples)

### Coverage Actual

**Global:** 60%+ (threshold configurado)

**Por Módulo (Estimado):**
- AuthService: ~85%
- ScaffoldService: ~80%
- ClientService: ~80%
- ProjectService: ~75%
- excelGenerator: ~75%
- pdfGenerator: ~70%

**Áreas sin coverage:**
- Controllers (orquestación HTTP, no lógica)
- Routes (configuración, no lógica)
- Models (queries SQL, tests de integración pendientes)
- Middleware (auth, RBAC - tests E2E pendientes)

---

## CASOS DE PRUEBA CRÍTICOS

### 1. Soft Delete Condicional

**Escenario:** Cliente/Proyecto con dependencias
```javascript
it('debería desactivar proyecto si tiene andamios', async () => {
  // ARRANGE
  Project.getById.mockResolvedValue({ id: 1, active: true });
  Project.getScaffoldCount.mockResolvedValue(5); // Tiene andamios
  Project.deactivate.mockResolvedValue({ id: 1, active: false });
  
  // ACT
  const result = await ProjectService.deleteOrDeactivateProject(1);
  
  // ASSERT
  expect(result.deactivated).toBe(true);
  expect(Project.deactivate).toHaveBeenCalledWith(1);
  expect(Project.delete).not.toHaveBeenCalled(); // No eliminar físico
});
```

### 2. Validación Proyecto Activo

**Escenario:** Intentar crear scaffold en proyecto desactivado
```javascript
it('debería lanzar error si proyecto desactivado', async () => {
  // ARRANGE
  Project.getById.mockResolvedValue({ 
    id: 1, 
    active: false,
    client_active: true 
  });
  
  // ACT & ASSERT
  await expect(
    ScaffoldService.validateActiveProject(1)
  ).rejects.toThrow('No se pueden realizar operaciones');
  
  await expect(
    ScaffoldService.validateActiveProject(1)
  ).rejects.toMatchObject({ statusCode: 400 });
});
```

### 3. Historial Inmutable

**Escenario:** Eliminación de scaffold preserva historial
```javascript
it('debería registrar en historial antes de eliminar', async () => {
  // ARRANGE
  Scaffold.getById.mockResolvedValue(mockScaffold);
  Project.getById.mockResolvedValue(mockProject);
  ScaffoldHistory.create.mockResolvedValue({ id: 1 });
  
  // ACT
  await ScaffoldService.deleteScaffold(1, mockUser);
  
  // ASSERT
  expect(ScaffoldHistory.create).toHaveBeenCalledWith(
    expect.objectContaining({
      change_type: 'delete',
      scaffold_number: mockScaffold.scaffold_number,
      project_name: mockProject.name
    })
  );
  expect(Scaffold.delete).toHaveBeenCalledAfter(ScaffoldHistory.create);
});
```

### 4. RBAC - Permisos Supervisor

**Escenario:** Supervisor intenta editar scaffold ajeno
```javascript
it('debería lanzar error 403 si supervisor edita scaffold ajeno', async () => {
  // ARRANGE
  const supervisor = { id: 1, role: 'supervisor' };
  const scaffold = { id: 1, created_by: 2 }; // Creado por otro
  
  // ACT & ASSERT
  await expect(
    ScaffoldService.validateUserPermissions(supervisor, scaffold)
  ).rejects.toThrow('No tienes permisos');
  
  await expect(
    ScaffoldService.validateUserPermissions(supervisor, scaffold)
  ).rejects.toMatchObject({ statusCode: 403 });
});
```

### 5. Estados de Andamios

**Escenario:** Determinación automática de estado
```javascript
it('debería retornar "assembled" cuando progress_percentage es 100', () => {
  // ACT
  const result = ScaffoldService.determineAssemblyState(100);
  
  // ASSERT
  expect(result).toEqual({
    assembly_status: 'assembled',
    card_status: 'red' // Siempre rojo por defecto
  });
});
```

---

## MOCKING STRATEGIES

### Mocking de Models

**Patrón Consistente:**
```javascript
jest.mock('../../models/scaffold');
const Scaffold = require('../../models/scaffold');

// Mock de métodos específicos
Scaffold.getById.mockResolvedValue(mockData);
Scaffold.create.mockResolvedValue(newMockData);
Scaffold.update.mockResolvedValue(updatedMockData);
```

### Mocking de Librerías Externas

**Google Cloud Storage:**
```javascript
jest.mock('../../lib/googleCloud');
const { uploadFile, deleteFile } = require('../../lib/googleCloud');

uploadFile.mockResolvedValue('https://storage.googleapis.com/file.jpg');
deleteFile.mockResolvedValue(undefined);
```

**bcrypt (passwords):**
```javascript
jest.mock('bcrypt');
const bcrypt = require('bcrypt');

bcrypt.hash.mockResolvedValue('hashed_password');
bcrypt.compare.mockResolvedValue(true); // Password correcto
```

**jsonwebtoken (JWT):**
```javascript
jest.mock('jsonwebtoken');
const jwt = require('jsonwebtoken');

jwt.sign.mockReturnValue('mock_access_token');
jwt.verify.mockReturnValue({ userId: 1, role: 'admin' });
```

### Mocking de Logger

**Winston Logger:**
```javascript
jest.mock('../../lib/logger');
const logger = require('../../lib/logger');

// No es necesario mockear métodos específicos
// Solo validar que se llamó
expect(logger.info).toHaveBeenCalledWith('Mensaje esperado');
expect(logger.error).toHaveBeenCalledTimes(1);
```

---

## DOCUMENTACIÓN

### TESTING_GUIDE.md

**Ubicación:** `/backend/docs/TESTING_GUIDE.md`  
**Contenido:** 600+ líneas

**Secciones:**
1. Introducción y objetivos
2. Arquitectura de testing
3. Tests implementados (detalle de cada archivo)
4. Cómo ejecutar tests
5. Estrategia de coverage
6. Patrones y mejores prácticas
7. Casos de prueba críticos
8. Troubleshooting
9. Próximos pasos

**Público:** Desarrolladores, nuevos miembros del equipo

---

## MEJORES PRÁCTICAS

### 1. Naming Conventions

**Archivos de Test:**
```
nombreArchivo.test.js  (no .spec.js)
```

**Describe Blocks:**
```javascript
describe('ServiceName.methodName()', () => {
  // Tests aquí
});
```

**Test Names:**
```javascript
it('debería [comportamiento esperado] cuando [condición]', async () => {
  // Test aquí
});
```

### 2. Organización de Tests

**Un describe por método:**
```javascript
describe('ScaffoldService', () => {
  describe('createScaffold()', () => {
    it('debería crear scaffold exitosamente', async () => {});
    it('debería lanzar error si falta imagen', async () => {});
    it('debería validar proyecto activo', async () => {});
  });
  
  describe('updateScaffold()', () => {
    it('debería actualizar scaffold exitosamente', async () => {});
    // ...
  });
});
```

### 3. Mock Data Reutilizable

**Definir fixtures:**
```javascript
const mockUser = {
  id: 1,
  first_name: 'Test',
  last_name: 'User',
  email: 'test@test.com',
  role: 'admin'
};

const mockProject = {
  id: 1,
  name: 'Proyecto Test',
  active: true,
  client_active: true
};
```

### 4. Validación Exhaustiva

**No solo verificar resultado:**
```javascript
// ❌ MAL (incompleto)
expect(result).toBeDefined();

// ✅ BIEN (exhaustivo)
expect(result).toEqual({
  id: 1,
  name: 'Test',
  active: true
});
expect(Model.create).toHaveBeenCalledWith(expectedParams);
expect(Logger.info).toHaveBeenCalledTimes(1);
```

### 5. Tests Independientes

**No compartir estado entre tests:**
```javascript
// ❌ MAL (estado compartido)
let sharedData;
beforeEach(() => {
  sharedData = { ... };
});

// ✅ BIEN (estado aislado)
it('debería...', () => {
  const localData = { ... }; // Solo para este test
  // ...
});
```

---

## PRÓXIMOS PASOS

### Corto Plazo (1-2 semanas)
1. ✅ Tests de UserService (8 métodos)
2. ✅ Tests de DashboardService (8 métodos)
3. ⏳ Tests de NotificationService (3 métodos)

### Medio Plazo (1-2 meses)
1. Tests de integración (DB real con Docker)
2. Tests E2E con Supertest (endpoints REST)
3. Aumentar coverage global a >70%

### Largo Plazo (3-6 meses)
1. Tests E2E frontend con Playwright/Cypress
2. Tests de performance con Artillery
3. Tests de seguridad con OWASP ZAP
4. Coverage >80% global

---

## TROUBLESHOOTING

### Problema: Tests colgados (no terminan)

**Causa:** Conexiones abiertas (DB, Redis)  
**Solución:**
```javascript
// jest.config.js
{
  detectOpenHandles: true,
  forceExit: true
}
```

### Problema: Mocks no limpian entre tests

**Causa:** No usar clearMocks  
**Solución:**
```javascript
// jest.config.js
{
  clearMocks: true
}

// O manualmente
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Problema: Coverage bajo en archivos

**Causa:** Archivos no ejecutados  
**Solución:**
```javascript
// jest.config.js
{
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',        // Excluir entry point
    '!src/tests/**'         // Excluir tests mismos
  ]
}
```

---

## CONCLUSIÓN

Suite de testing sólida con 110+ tests cubriendo servicios críticos. Arquitectura escalable con patrones consistentes (AAA, mocking exhaustivo, validación completa). Coverage global >60% con enfoque en lógica de negocio (65-85% en servicios críticos).

**Estado Actual:** Funcional, documentado, listo para CI/CD  
**Próximo Objetivo:** Coverage >70% global, tests de integración

---

**Referencias:**
- Jest Documentation: https://jestjs.io/docs/getting-started
- AAA Pattern: https://medium.com/@pjbgf/title-testing-code-ocd-and-the-aaa-pattern-df453975ab80
- TESTING_GUIDE.md: `/backend/docs/TESTING_GUIDE.md`

