const ArticulosService = require('../../services/articulos.service');
const ArticuloModel = require('../../models/articulo');
const db = require('../../db');

jest.mock('../../models/articulo');
jest.mock('../../db', () => ({
  query: jest.fn(),
}));
jest.mock('../../lib/googleCloud', () => ({
  uploadFile: jest.fn(),
  deleteFileByUrl: jest.fn(),
  resolveImageUrl: jest.fn(async (url) => (url ? `/resolved/${url}` : url)),
}));

const { uploadFile, deleteFileByUrl } = require('../../lib/googleCloud');

describe('ArticulosService image uploads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sube foto opcional, guarda URL cruda y devuelve URL resuelta', async () => {
    const payload = {
      grupo_principal: 'epp',
      subclasificacion: 'epp',
      nombre: 'Casco',
      marca: '3M',
      modelo: 'X1',
      nivel_control: 'alto',
      unidad_medida: 'unidad',
    };
    const imageFile = { originalname: 'casco.jpg' };
    uploadFile.mockResolvedValue('uploads/catalogo/casco.jpg');
    ArticuloModel.create.mockResolvedValue({
      id: 'art-1',
      ...payload,
      foto_url: 'uploads/catalogo/casco.jpg',
    });

    const result = await ArticulosService.create(payload, imageFile);

    expect(uploadFile).toHaveBeenCalledWith(imageFile);
    expect(ArticuloModel.create).toHaveBeenCalledWith({
      ...payload,
      foto_url: 'uploads/catalogo/casco.jpg',
    });
    expect(result.foto_url).toBe('/resolved/uploads/catalogo/casco.jpg');
  });

  it('limpia foto subida si falla creación de artículo', async () => {
    const imageFile = { originalname: 'casco.jpg' };
    uploadFile.mockResolvedValue('uploads/catalogo/casco.jpg');
    ArticuloModel.create.mockRejectedValue(new Error('db failed'));

    await expect(ArticulosService.create({ nombre: 'Casco' }, imageFile)).rejects.toThrow('db failed');

    expect(deleteFileByUrl).toHaveBeenCalledWith('uploads/catalogo/casco.jpg');
  });

  it('borra foto antigua al actualizar con nueva imagen', async () => {
    const imageFile = { originalname: 'casco-v2.jpg' };
    ArticuloModel.findById.mockResolvedValue({
      id: 'art-1',
      nombre: 'Casco',
      foto_url: 'uploads/catalogo/casco-old.jpg',
    });
    uploadFile.mockResolvedValue('uploads/catalogo/casco-v2.jpg');
    ArticuloModel.update.mockResolvedValue({
      id: 'art-1',
      nombre: 'Casco',
      foto_url: 'uploads/catalogo/casco-v2.jpg',
    });

    await ArticulosService.update('art-1', { nombre: 'Casco' }, imageFile);

    expect(deleteFileByUrl).toHaveBeenCalledWith('uploads/catalogo/casco-old.jpg');
  });

  it('no borra foto antigua si artículo no tenía foto al actualizar', async () => {
    const imageFile = { originalname: 'casco-v2.jpg' };
    ArticuloModel.findById.mockResolvedValue({ id: 'art-1', foto_url: null });
    uploadFile.mockResolvedValue('uploads/catalogo/casco-v2.jpg');
    ArticuloModel.update.mockResolvedValue({ id: 'art-1', foto_url: 'uploads/catalogo/casco-v2.jpg' });

    await ArticulosService.update('art-1', {}, imageFile);

    expect(deleteFileByUrl).not.toHaveBeenCalledWith(null);
    expect(deleteFileByUrl).not.toHaveBeenCalledWith(undefined);
  });

  it('limpia nueva foto si update falla (no borra la antigua)', async () => {
    const imageFile = { originalname: 'casco-v2.jpg' };
    ArticuloModel.findById.mockResolvedValue({
      id: 'art-1',
      foto_url: 'uploads/catalogo/casco-old.jpg',
    });
    uploadFile.mockResolvedValue('uploads/catalogo/casco-v2.jpg');
    ArticuloModel.update.mockRejectedValue(new Error('db error'));
    deleteFileByUrl.mockResolvedValue(undefined);

    await expect(ArticulosService.update('art-1', {}, imageFile)).rejects.toThrow('db error');

    expect(deleteFileByUrl).toHaveBeenCalledWith('uploads/catalogo/casco-v2.jpg');
    expect(deleteFileByUrl).not.toHaveBeenCalledWith('uploads/catalogo/casco-old.jpg');
  });
});

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
