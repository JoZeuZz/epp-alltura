/**
 * Configuración de Swagger/OpenAPI 3.0
 * 
 * Genera documentación interactiva de la API en /api-docs
 * Utiliza swagger-jsdoc para extraer definiciones desde JSDoc en las rutas
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Alltura - API de Gestión de Andamios',
      version: '2.1.0',
      description: `
        API REST para el sistema de gestión de andamios persistentes Alltura.
        
        ## Características principales:
        - **Autenticación JWT** con refresh tokens
        - **RBAC** (Control de acceso basado en roles): Admin, Supervisor, Client
        - **Soft Delete** en proyectos y clientes
        - **Historial inmutable** de cambios en andamios
        - **Validación robusta** con Joi + Validator.js
        - **Uploads** de imágenes a Google Cloud Storage
        
        ## Estados de Andamios:
        - **card_status**: green | red
        - **assembly_status**: assembled | disassembled | in_progress
        - **progress_percentage**: 0-100
        
        ## Roles:
        - **admin**: Acceso completo, puede eliminar/reactivar proyectos y clientes
        - **supervisor**: CRUD de andamios propios, proyectos asignados
        - **client**: Solo lectura, proyectos asignados
      `,
      contact: {
        name: 'Alltura Support',
        email: 'support@alltura.com',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: 'https://api.alltura.com',
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Autenticación y autorización (JWT)',
      },
      {
        name: 'Scaffolds',
        description: 'Gestión de andamios (CRUD, estados, historial)',
      },
      {
        name: 'Projects',
        description: 'Gestión de proyectos (CRUD, soft delete, reportes)',
      },
      {
        name: 'Clients',
        description: 'Gestión de empresas mandantes (CRUD, soft delete)',
      },
      {
        name: 'Users',
        description: 'Gestión de usuarios (CRUD, perfiles)',
      },
      {
        name: 'Dashboard',
        description: 'Métricas y estadísticas (admin)',
      },
      {
        name: 'Supervisor Dashboard',
        description: 'Dashboard específico para supervisores',
      },
      {
        name: 'Notifications',
        description: 'Push notifications (Web Push API)',
      },
      {
        name: 'Health',
        description: 'Health checks (Kubernetes probes)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Autenticación mediante JWT. Incluir el token en el header: `Authorization: Bearer <token>`',
        },
      },
      schemas: {
        // ============================================
        // SCHEMAS DE MODELOS DE DATOS
        // ============================================
        
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            first_name: { type: 'string', example: 'Juan' },
            last_name: { type: 'string', example: 'Pérez' },
            email: { type: 'string', format: 'email', example: 'juan.perez@alltura.com' },
            role: { type: 'string', enum: ['admin', 'supervisor', 'client'], example: 'supervisor' },
            rut: { type: 'string', example: '12345678-9', nullable: true },
            phone_number: { type: 'string', example: '+56912345678', nullable: true },
            profile_picture_url: { type: 'string', format: 'uri', nullable: true },
            client_id: { type: 'integer', nullable: true, description: 'ID de la empresa cliente (solo para role=client)' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        
        Client: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Constructora ABC' },
            email: { type: 'string', format: 'email', example: 'contacto@abc.com', nullable: true },
            phone: { type: 'string', example: '+56912345678', nullable: true },
            address: { type: 'string', example: 'Av. Principal 123, Santiago', nullable: true },
            specialty: { type: 'string', example: 'Construcción de edificios', nullable: true },
            active: { type: 'boolean', example: true, description: 'Soft delete flag' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        
        Project: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            client_id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Edificio Torre Central' },
            status: { type: 'string', enum: ['active', 'completed'], example: 'active' },
            active: { type: 'boolean', example: true, description: 'Soft delete flag' },
            assigned_client_id: { type: 'integer', nullable: true, description: 'Usuario cliente asignado' },
            assigned_supervisor_id: { type: 'integer', nullable: true, description: 'Supervisor asignado' },
            created_at: { type: 'string', format: 'date-time' },
            client_active: { type: 'boolean', example: true, description: 'Estado del cliente asociado' },
          },
        },
        
        Scaffold: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            project_id: { type: 'integer', example: 1 },
            user_id: { type: 'integer', example: 1 },
            created_by: { type: 'integer', example: 1 },
            scaffold_number: { type: 'string', example: 'AND-001' },
            area: { type: 'string', example: 'Zona A' },
            tag: { type: 'string', example: 'TAG-123' },
            width: { type: 'number', format: 'float', example: 2.5 },
            length: { type: 'number', format: 'float', example: 3.0 },
            height: { type: 'number', format: 'float', example: 2.0 },
            cubic_meters: { type: 'number', format: 'float', example: 15.0, description: 'Calculado: width × length × height' },
            progress_percentage: { type: 'integer', minimum: 0, maximum: 100, example: 100 },
            card_status: { type: 'string', enum: ['green', 'red'], example: 'green' },
            assembly_status: { 
              type: 'string', 
              enum: ['assembled', 'disassembled', 'in_progress'], 
              example: 'assembled',
              description: '0% → disassembled, 1-99% → in_progress, 100% → assembled'
            },
            assembly_image_url: { type: 'string', format: 'uri', example: 'https://storage.googleapis.com/...' },
            assembly_notes: { type: 'string', nullable: true },
            assembly_created_at: { type: 'string', format: 'date-time' },
            location: { type: 'string', nullable: true },
            observations: { type: 'string', nullable: true },
            disassembly_image_url: { type: 'string', format: 'uri', nullable: true },
            disassembly_notes: { type: 'string', nullable: true },
            disassembled_at: { type: 'string', format: 'date-time', nullable: true },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        
        ScaffoldHistory: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            scaffold_id: { type: 'integer', nullable: true, description: 'NULL si el andamio fue eliminado' },
            user_id: { type: 'integer', example: 1 },
            change_type: { 
              type: 'string', 
              enum: ['create', 'update', 'card_status', 'assembly_status', 'progress', 'dimensions', 'disassemble', 'delete'],
              example: 'update'
            },
            previous_data: { type: 'object', nullable: true, description: 'Datos anteriores (JSONB)' },
            new_data: { type: 'object', nullable: true, description: 'Datos nuevos (JSONB)' },
            description: { type: 'string', example: 'Actualización de dimensiones' },
            scaffold_number: { type: 'string', example: 'AND-001', description: 'Denormalizado para historial inmutable' },
            project_name: { type: 'string', example: 'Edificio Torre Central', description: 'Denormalizado' },
            area: { type: 'string', example: 'Zona A', description: 'Denormalizado' },
            tag: { type: 'string', example: 'TAG-123', description: 'Denormalizado' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        
        // ============================================
        // SCHEMAS DE RESPUESTAS
        // ============================================
        
        AuthResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', description: 'JWT access token (15 minutos)' },
            refreshToken: { type: 'string', description: 'JWT refresh token (7 días)' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operación exitosa' },
          },
        },
        
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error en la validación' },
            message: { type: 'string', example: 'Los datos proporcionados son inválidos' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Email no válido' },
                },
              },
              description: 'Errores de validación por campo',
            },
          },
        },
        
        ValidationError: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Validation Error' },
            message: { type: 'string', example: 'Errores de validación' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'width' },
                  message: { type: 'string', example: 'Debe ser un número positivo' },
                },
              },
            },
          },
        },
        
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { type: 'object' } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                total: { type: 'integer', example: 150 },
                totalPages: { type: 'integer', example: 8 },
              },
            },
          },
        },
      },
      
      responses: {
        UnauthorizedError: {
          description: 'No autorizado - Token JWT inválido o expirado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Token no válido o expirado' },
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Prohibido - No tiene permisos suficientes',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Acceso denegado. Se requiere rol de administrador.' },
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'Recurso no encontrado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'Not Found' },
                  message: { type: 'string', example: 'El recurso solicitado no existe' },
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Error de validación',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationError' },
            },
          },
        },
        ServerError: {
          description: 'Error interno del servidor',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'Internal Server Error' },
                  message: { type: 'string', example: 'Ha ocurrido un error inesperado' },
                },
              },
            },
          },
        },
      },
      
      parameters: {
        IdParam: {
          name: 'id',
          in: 'path',
          required: true,
          description: 'ID del recurso',
          schema: { type: 'integer', minimum: 1 },
        },
        ProjectIdParam: {
          name: 'projectId',
          in: 'path',
          required: true,
          description: 'ID del proyecto',
          schema: { type: 'integer', minimum: 1 },
        },
        UserIdParam: {
          name: 'userId',
          in: 'path',
          required: true,
          description: 'ID del usuario',
          schema: { type: 'integer', minimum: 1 },
        },
      },
    },
    
    // Seguridad global: todos los endpoints requieren autenticación JWT por defecto
    // Los endpoints específicos pueden sobrescribir esto con security: []
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  
  // Archivos donde buscar anotaciones JSDoc/OpenAPI
  apis: [
    './src/routes/*.js',
    './src/routes/*.routes.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
