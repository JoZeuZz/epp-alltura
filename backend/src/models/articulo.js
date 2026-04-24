const db = require('../db');
const { buildSetClause, normalizePagination } = require('./modelUtils');

const GRUPOS_VALIDOS = new Set(['equipo', 'herramienta']);

const SUBCLASIFICACIONES_POR_GRUPO = {
  equipo: new Set(['epp', 'medicion_ensayos']),
  herramienta: new Set(['manual', 'electrica_cable', 'inalambrica_bateria']),
};

const ESPECIALIDADES_VALIDAS = new Set([
  'oocc',
  'ooee',
  'andamios',
  'trabajos_verticales_lineas_de_vida',
]);

const SUBCLASIFICACIONES_NO_SERIALES = new Set(['epp']);

const normalizeKey = (value) => String(value || '').trim().toLowerCase();

const normalizeGrupoPrincipal = (value) => {
  if (value === undefined) return undefined;

  const normalized = normalizeKey(value);
  return GRUPOS_VALIDOS.has(normalized) ? normalized : null;
};

const normalizeSubclasificacion = (value, grupoPrincipal) => {
  if (value === undefined) return undefined;

  const normalized = normalizeKey(value);

  if (!normalized) {
    return null;
  }

  if (!grupoPrincipal) {
    const allowedInAnyGroup = Object.values(SUBCLASIFICACIONES_POR_GRUPO).some((set) =>
      set.has(normalized)
    );
    return allowedInAnyGroup ? normalized : null;
  }

  const allowedForGroup = SUBCLASIFICACIONES_POR_GRUPO[grupoPrincipal];
  return allowedForGroup && allowedForGroup.has(normalized) ? normalized : null;
};

const normalizeEspecialidades = (value) => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const seen = new Set();
  const normalized = [];

  for (const item of value) {
    const key = normalizeKey(item);
    if (!key || !ESPECIALIDADES_VALIDAS.has(key) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(key);
  }

  return normalized;
};

const resolveTrackingMode = (subclasificacion) => {
  if (!subclasificacion) {
    return 'serial';
  }
  return SUBCLASIFICACIONES_NO_SERIALES.has(subclasificacion) ? 'lote' : 'serial';
};

class ArticuloModel {
  constructor(data) {
    const grupoPrincipal = normalizeGrupoPrincipal(data.grupo_principal) || 'herramienta';
    const subclasificacion = normalizeSubclasificacion(data.subclasificacion, grupoPrincipal) || null;
    const especialidades = normalizeEspecialidades(
      Array.isArray(data.especialidades) ? data.especialidades : []
    );

    this.id = data.id;
    this.grupo_principal = grupoPrincipal;
    this.subclasificacion = subclasificacion;
    this.especialidades = especialidades || [];
    this.nombre = data.nombre;
    this.marca = data.marca;
    this.modelo = data.modelo;
    this.nivel_control = data.nivel_control;
    this.requiere_vencimiento = data.requiere_vencimiento;
    this.unidad_medida = data.unidad_medida;
    this.estado = data.estado;
    this.creado_en = data.creado_en;
  }

  static async create(fields) {
    const grupoPrincipal = normalizeGrupoPrincipal(fields.grupo_principal);
    const subclasificacion = normalizeSubclasificacion(fields.subclasificacion, grupoPrincipal);
    const especialidades = normalizeEspecialidades(fields.especialidades) || [];

    if (!grupoPrincipal) {
      const error = new Error('grupo_principal es obligatorio');
      error.statusCode = 400;
      throw error;
    }

    if (!subclasificacion) {
      const error = new Error('subclasificacion es obligatoria y debe ser válida para el grupo principal');
      error.statusCode = 400;
      throw error;
    }

    if (!String(fields.marca || '').trim()) {
      const error = new Error('marca es obligatoria');
      error.statusCode = 400;
      throw error;
    }

    if (!String(fields.modelo || '').trim()) {
      const error = new Error('modelo es obligatorio');
      error.statusCode = 400;
      throw error;
    }

    const trackingMode = resolveTrackingMode(subclasificacion);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `
        INSERT INTO articulo (
          tipo,
          grupo_principal,
          nombre,
          marca,
          modelo,
          categoria,
          subclasificacion,
          tracking_mode,
          retorno_mode,
          nivel_control,
          requiere_vencimiento,
          unidad_medida,
          estado
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'retornable', $9, $10, $11, $12)
        RETURNING id
        `,
        [
          grupoPrincipal,
          grupoPrincipal,
          fields.nombre,
          String(fields.marca || '').trim(),
          String(fields.modelo || '').trim(),
          subclasificacion,
          subclasificacion,
          trackingMode,
          fields.nivel_control,
          Boolean(fields.requiere_vencimiento),
          fields.unidad_medida,
          fields.estado || 'activo',
        ]
      );

      const articuloId = rows[0].id;

      for (const especialidad of especialidades) {
        await client.query(
          `
          INSERT INTO articulo_especialidad (articulo_id, especialidad)
          VALUES ($1, $2)
          `,
          [articuloId, especialidad]
        );
      }

      await client.query('COMMIT');
      return ArticuloModel.findById(articuloId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(id) {
    const { rows } = await db.query(
      `
      SELECT
        a.id,
        a.grupo_principal,
        a.subclasificacion,
        a.nombre,
        a.marca,
        a.modelo,
        a.nivel_control,
        a.requiere_vencimiento,
        a.unidad_medida,
        a.estado,
        a.creado_en,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT ae.especialidad), NULL),
          ARRAY[]::varchar[]
        ) AS especialidades
      FROM articulo a
      LEFT JOIN articulo_especialidad ae ON ae.articulo_id = a.id
      WHERE a.id = $1
      GROUP BY a.id
      `,
      [id]
    );

    return rows.length ? new ArticuloModel(rows[0]) : null;
  }

  static async findAll(filters = {}) {
    const {
      grupo_principal,
      estado,
      search,
      subclasificacion,
      especialidad,
    } = filters;
    const { limit, offset } = normalizePagination(filters.limit, filters.offset);

    const conditions = [];
    const values = [];

    const hasGrupoFilter = Boolean(grupo_principal);
    const resolvedGrupoPrincipal = hasGrupoFilter ? normalizeGrupoPrincipal(grupo_principal) : undefined;

    if (hasGrupoFilter && !resolvedGrupoPrincipal) {
      return [];
    }

    if (resolvedGrupoPrincipal) {
      values.push(resolvedGrupoPrincipal);
      conditions.push(`a.grupo_principal = $${values.length}`);
    }

    if (estado) {
      values.push(estado);
      conditions.push(`a.estado = $${values.length}`);
    }

    if (subclasificacion) {
      const normalizedSubclasificacion = normalizeSubclasificacion(
        subclasificacion,
        resolvedGrupoPrincipal
      );

      if (!normalizedSubclasificacion) {
        return [];
      }

      values.push(normalizedSubclasificacion);
      conditions.push(`a.subclasificacion = $${values.length}`);
    }

    if (especialidad) {
      const normalizedEspecialidad = normalizeEspecialidades([especialidad]);
      if (!normalizedEspecialidad || !normalizedEspecialidad.length) {
        return [];
      }

      values.push(normalizedEspecialidad[0]);
      conditions.push(
        `EXISTS (
          SELECT 1
          FROM articulo_especialidad aes
          WHERE aes.articulo_id = a.id
            AND aes.especialidad = $${values.length}
        )`
      );
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(
        a.nombre ILIKE $${values.length}
        OR a.marca ILIKE $${values.length}
        OR a.modelo ILIKE $${values.length}
        OR COALESCE(a.subclasificacion, '') ILIKE $${values.length}
      )`);
    }

    let query = `
      SELECT
        a.id,
        a.grupo_principal,
        a.subclasificacion,
        a.nombre,
        a.marca,
        a.modelo,
        a.nivel_control,
        a.requiere_vencimiento,
        a.unidad_medida,
        a.estado,
        a.creado_en,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT ae.especialidad), NULL),
          ARRAY[]::varchar[]
        ) AS especialidades
      FROM articulo a
      LEFT JOIN articulo_especialidad ae ON ae.articulo_id = a.id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' GROUP BY a.id';

    values.push(limit, offset);
    query += ` ORDER BY a.creado_en DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const { rows } = await db.query(query, values);
    return rows.map((row) => new ArticuloModel(row));
  }

  static async update(id, fields) {
    const hasGrupoPrincipalUpdate = Object.prototype.hasOwnProperty.call(fields, 'grupo_principal');
    const hasSubclasificacionUpdate = Object.prototype.hasOwnProperty.call(fields, 'subclasificacion');

    const current = await ArticuloModel.findById(id);
    if (!current) {
      return null;
    }

    const grupoPrincipal = hasGrupoPrincipalUpdate
      ? normalizeGrupoPrincipal(fields.grupo_principal)
      : current.grupo_principal;

    if (hasGrupoPrincipalUpdate && !grupoPrincipal) {
      const error = new Error('grupo_principal es inválido');
      error.statusCode = 400;
      throw error;
    }

    if (hasGrupoPrincipalUpdate && !hasSubclasificacionUpdate) {
      const error = new Error('Si actualiza grupo_principal debe enviar subclasificacion compatible');
      error.statusCode = 400;
      throw error;
    }

    const subclasificacion = hasSubclasificacionUpdate
      ? normalizeSubclasificacion(fields.subclasificacion, grupoPrincipal)
      : current.subclasificacion;

    if (hasSubclasificacionUpdate && !subclasificacion) {
      const error = new Error('subclasificacion inválida para el grupo principal indicado');
      error.statusCode = 400;
      throw error;
    }

    if (Object.prototype.hasOwnProperty.call(fields, 'marca') && !String(fields.marca || '').trim()) {
      const error = new Error('marca es obligatoria');
      error.statusCode = 400;
      throw error;
    }

    if (Object.prototype.hasOwnProperty.call(fields, 'modelo') && !String(fields.modelo || '').trim()) {
      const error = new Error('modelo es obligatorio');
      error.statusCode = 400;
      throw error;
    }

    const especialidades = Object.prototype.hasOwnProperty.call(fields, 'especialidades')
      ? normalizeEspecialidades(fields.especialidades) || []
      : undefined;

    const updateFields = {
      tipo: grupoPrincipal,
      grupo_principal: grupoPrincipal,
      nombre: fields.nombre,
      marca: Object.prototype.hasOwnProperty.call(fields, 'marca')
        ? String(fields.marca || '').trim()
        : undefined,
      modelo: Object.prototype.hasOwnProperty.call(fields, 'modelo')
        ? String(fields.modelo || '').trim()
        : undefined,
      categoria: subclasificacion,
      subclasificacion,
      tracking_mode:
        hasGrupoPrincipalUpdate || hasSubclasificacionUpdate
          ? resolveTrackingMode(subclasificacion)
          : undefined,
      retorno_mode:
        hasGrupoPrincipalUpdate || hasSubclasificacionUpdate
          ? 'retornable'
          : undefined,
      nivel_control: fields.nivel_control,
      requiere_vencimiento: fields.requiere_vencimiento,
      unidad_medida: fields.unidad_medida,
      estado: fields.estado,
    };

    const { clause, values } = buildSetClause(updateFields);

    if (!clause && especialidades === undefined) {
      return current;
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      if (clause) {
        values.push(id);
        await client.query(
          `UPDATE articulo SET ${clause} WHERE id = $${values.length} RETURNING id`,
          values
        );
      }

      if (especialidades !== undefined) {
        await client.query('DELETE FROM articulo_especialidad WHERE articulo_id = $1', [id]);

        for (const especialidad of especialidades) {
          await client.query(
            `
            INSERT INTO articulo_especialidad (articulo_id, especialidad)
            VALUES ($1, $2)
            `,
            [id, especialidad]
          );
        }
      }

      await client.query('COMMIT');
      return ArticuloModel.findById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = ArticuloModel;
