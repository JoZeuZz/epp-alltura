import { postForm } from './http';

export interface FacturaAnalysis {
  proveedor_id:     string | null;
  proveedor_nombre: string | null;
  proveedor_creado: boolean;
  fecha_compra:     string | null;  // ISO YYYY-MM-DD
  valor:            number | null;  // con IVA incluido
  extractado_ok:    boolean;
}

export async function parseFactura(
  file: File,
  articuloNombre: string
): Promise<FacturaAnalysis> {
  const fd = new FormData();
  fd.append('factura', file);
  fd.append('articulo_nombre', articuloNombre);

  const res = await postForm<{ ok: boolean; data: FacturaAnalysis }>(
    '/facturas/parse',
    fd
  );
  return res.data;
}
