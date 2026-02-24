const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Alltura EPP/Herramientas API',
    version: '1.0.0',
    description:
      'API del MVP operativo de inventario, entregas, firmas, devoluciones, custodias y trazabilidad para EPP/Herramientas.',
  },
  servers: [
    {
      url: '/',
      description: 'Same-origin API',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Autenticación y sesiones' },
    { name: 'Catálogos', description: 'Ubicaciones, artículos, trabajadores y proveedores' },
    { name: 'Entregas', description: 'Gestión de entregas y confirmación' },
    { name: 'Firmas', description: 'Firma en dispositivo y por token/QR' },
    { name: 'Devoluciones', description: 'Borrador, confirmación y cierre de custodia' },
    { name: 'Compras', description: 'Ingreso de inventario por compra' },
    { name: 'Inventario', description: 'Stock y movimientos' },
    { name: 'Dashboard', description: 'Indicadores operativos EPP' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ApiSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operación completada' },
          data: { type: 'object', nullable: true },
          errors: {
            type: 'array',
            items: { type: 'object' },
            example: [],
          },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error de validación' },
          data: { type: 'object', nullable: true, example: null },
          errors: {
            type: 'array',
            items: { type: 'object' },
          },
          requestId: { type: 'string', example: 'req-123' },
        },
      },
    },
  },
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login exitoso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Renovar token',
        responses: {
          200: {
            description: 'Token renovado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/ubicaciones': {
      get: {
        tags: ['Catálogos'],
        summary: 'Listar ubicaciones',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Listado de ubicaciones',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/articulos': {
      get: {
        tags: ['Catálogos'],
        summary: 'Listar artículos',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Listado de artículos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Catálogos'],
        summary: 'Crear artículo',
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: 'Artículo creado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/articulos/{id}': {
      put: {
        tags: ['Catálogos'],
        summary: 'Actualizar artículo',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Artículo actualizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Catálogos'],
        summary: 'Desactivar artículo (eliminación lógica)',
        description: 'Mantiene compatibilidad histórica. Esta acción solo marca el artículo como inactivo.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Artículo desactivado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/articulos/{id}/permanent': {
      delete: {
        tags: ['Catálogos'],
        summary: 'Eliminar artículo permanentemente',
        description:
          'Solo disponible para admin. Elimina físicamente el artículo cuando no tiene trazabilidad asociada.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Artículo eliminado permanentemente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
          409: {
            description: 'Artículo bloqueado por trazabilidad',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    '/api/trabajadores': {
      get: {
        tags: ['Catálogos'],
        summary: 'Listar trabajadores',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Listado de trabajadores',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/proveedores': {
      get: {
        tags: ['Catálogos'],
        summary: 'Listar proveedores',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Listado de proveedores',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/entregas': {
      post: {
        tags: ['Entregas'],
        summary: 'Crear entrega en borrador',
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: 'Entrega creada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/entregas/{id}/confirm': {
      post: {
        tags: ['Entregas'],
        summary: 'Confirmar entrega firmada',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Entrega confirmada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/firmas/entregas/{entregaId}/token': {
      post: {
        tags: ['Firmas'],
        summary: 'Generar token de firma',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'entregaId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          201: {
            description: 'Token generado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/firmas/tokens/{token}/firmar': {
      post: {
        tags: ['Firmas'],
        summary: 'Firmar usando token QR/link',
        parameters: [
          {
            name: 'token',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['firma_imagen_url', 'texto_aceptacion'],
                properties: {
                  firma_imagen_url: { type: 'string', format: 'uri' },
                  texto_aceptacion: { type: 'string' },
                  texto_aceptacion_detalle: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        detalle_id: { type: 'string', format: 'uuid', nullable: true },
                        texto: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['firma_archivo', 'texto_aceptacion'],
                properties: {
                  firma_archivo: { type: 'string', format: 'binary' },
                  texto_aceptacion: { type: 'string' },
                  texto_aceptacion_detalle: {
                    type: 'string',
                    description: 'JSON string con arreglo de textos legales por detalle',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Firma registrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/firmas/entregas/{entregaId}/firmar-dispositivo': {
      post: {
        tags: ['Firmas'],
        summary: 'Firmar entrega en dispositivo compartido',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'entregaId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['firma_imagen_url', 'texto_aceptacion'],
                properties: {
                  trabajador_id: { type: 'string', format: 'uuid', nullable: true },
                  firma_imagen_url: { type: 'string', format: 'uri' },
                  texto_aceptacion: { type: 'string' },
                  texto_aceptacion_detalle: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        detalle_id: { type: 'string', format: 'uuid', nullable: true },
                        texto: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['firma_archivo', 'texto_aceptacion'],
                properties: {
                  trabajador_id: { type: 'string', format: 'uuid' },
                  firma_archivo: { type: 'string', format: 'binary' },
                  texto_aceptacion: { type: 'string' },
                  texto_aceptacion_detalle: {
                    type: 'string',
                    description: 'JSON string con arreglo de textos legales por detalle',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Firma registrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/devoluciones': {
      post: {
        tags: ['Devoluciones'],
        summary: 'Crear devolución en borrador',
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: 'Devolución creada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/devoluciones/{id}/confirm': {
      post: {
        tags: ['Devoluciones'],
        summary: 'Confirmar devolución',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Devolución confirmada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/compras': {
      post: {
        tags: ['Compras'],
        summary: 'Registrar compra e ingreso de inventario',
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: 'Compra registrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/inventario/ingresos': {
      get: {
        tags: ['Inventario'],
        summary: 'Listar ingresos de inventario',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Ingresos obtenidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Inventario'],
        summary: 'Registrar ingreso de inventario (manual o con documento)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fecha_ingreso: { type: 'string', format: 'date-time', nullable: true },
                  notas: { type: 'string', nullable: true },
                  documento_compra: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      proveedor_id: { type: 'string', format: 'uuid' },
                      tipo: { type: 'string', enum: ['factura', 'boleta', 'guia'] },
                      numero: { type: 'string' },
                      fecha: { type: 'string', format: 'date-time' },
                    },
                  },
                  detalles: {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'object',
                      properties: {
                        articulo_id: { type: 'string', format: 'uuid' },
                        ubicacion_id: { type: 'string', format: 'uuid' },
                        cantidad: { type: 'number' },
                        costo_unitario: { type: 'number' },
                        lote: {
                          type: 'object',
                          nullable: true,
                          properties: {
                            codigo_lote: { type: 'string', nullable: true },
                          },
                        },
                        activos: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              codigo: { type: 'string' },
                              nro_serie: { type: 'string', nullable: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['payload_json'],
                properties: {
                  payload_json: {
                    type: 'string',
                    description: 'JSON string con la misma estructura del body application/json',
                  },
                  documento_archivo: {
                    type: 'string',
                    format: 'binary',
                    description: 'Archivo opcional PDF/JPG/PNG/WEBP',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Ingreso registrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/inventario/stock': {
      get: {
        tags: ['Inventario'],
        summary: 'Consultar stock',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
          {
            name: 'articulo_id',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'ubicacion_id',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'lote_id',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 500 },
          },
          {
            name: 'offset',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 0 },
          },
        ],
        responses: {
          200: {
            description: 'Stock consultado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/inventario/movimientos-stock': {
      get: {
        tags: ['Inventario'],
        summary: 'Consultar movimientos de stock',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Movimientos obtenidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/dashboard/indicadores-operativos': {
      get: {
        tags: ['Dashboard'],
        summary: 'Indicadores operativos EPP (canónico)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Indicadores obtenidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/dashboard/ubicaciones/{ubicacionId}/resumen': {
      get: {
        tags: ['Dashboard'],
        summary: 'Resumen operativo por ubicación (canónico)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'ubicacionId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Resumen por ubicación obtenido',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
    '/api/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Resumen de indicadores EPP',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Resumen obtenido',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiSuccess' },
              },
            },
          },
        },
      },
    },
  },
};

module.exports = swaggerSpec;
