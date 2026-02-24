const ArticulosService = require('../../services/articulos.service');
const ArticuloModel = require('../../models/articulo');
const db = require('../../db');

jest.mock('../../models/articulo');
jest.mock('../../db', () => ({
  query: jest.fn(),
}));

describe('ArticulosService.removePermanent', () => {
  const articleId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna 404 cuando el artículo no existe', async () => {
    ArticuloModel.findById.mockResolvedValue(null);

    await expect(ArticulosService.removePermanent(articleId)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Articulo not found',
    });
  });

  it('retorna 409 cuando el artículo no está inactivo', async () => {
    ArticuloModel.findById.mockResolvedValue({
      id: articleId,
      estado: 'activo',
    });

    await expect(ArticulosService.removePermanent(articleId)).rejects.toMatchObject({
      statusCode: 409,
      errors: [
        {
          code: 'ARTICULO_DEBE_ESTAR_INACTIVO',
        },
      ],
    });
  });

  it('retorna 409 con detalle cuando el artículo tiene trazabilidad', async () => {
    ArticuloModel.findById.mockResolvedValue({
      id: articleId,
      estado: 'inactivo',
    });

    db.query
      .mockResolvedValueOnce({ rows: [{ total: 3 }] }) // compra_detalle
      .mockResolvedValueOnce({ rows: [{ total: 0 }] }) // lote
      .mockResolvedValueOnce({ rows: [{ total: 1 }] }) // activo
      .mockResolvedValueOnce({ rows: [{ total: 0 }] }) // stock
      .mockResolvedValueOnce({ rows: [{ total: 0 }] }) // entrega_detalle
      .mockResolvedValueOnce({ rows: [{ total: 2 }] }) // devolucion_detalle
      .mockResolvedValueOnce({ rows: [{ total: 5 }] }); // movimiento_stock

    await expect(ArticulosService.removePermanent(articleId)).rejects.toMatchObject({
      statusCode: 409,
      message: 'No se puede eliminar permanentemente un artículo con trazabilidad.',
      errors: [
        {
          code: 'ARTICULO_REFERENCIADO',
          details: {
            compra_detalle: 3,
            activo: 1,
            devolucion_detalle: 2,
            movimiento_stock: 5,
          },
        },
      ],
    });
  });

  it('elimina permanentemente cuando no existen referencias', async () => {
    ArticuloModel.findById.mockResolvedValue({
      id: articleId,
      estado: 'inactivo',
    });

    db.query
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await ArticulosService.removePermanent(articleId);

    expect(result).toEqual({
      id: articleId,
      deleted_permanently: true,
    });
    expect(db.query).toHaveBeenLastCalledWith('DELETE FROM articulo WHERE id = $1', [articleId]);
  });
});
