-- Seed: proveedores iniciales
-- Fuente: lista Excel entregada 2026-06-15
-- Idempotente: solo inserta si el nombre no existe ya en la tabla

INSERT INTO proveedor (nombre, rut, estado)
SELECT v.nombre, v.rut, 'activo'
FROM (VALUES
  ('BS SEGURIDAD INDUSTRIAL SPA',        '77.348.275-6'),
  ('SODIMAC',                             '96.792.430-K'),
  ('SHERWIN WILLIAMS',                    '96.803.460-K'),
  ('GREZ Y ULLOA',                        '80.432.900-5'),
  ('GRUPO INL SPA',                       '76.120.104-2'),
  ('RHONA S.A.',                          '92.307.000-1'),
  ('ELECTROCOM',                          '96.355.000-6'),
  ('EECOL ELECTRIC LTDA',                 '96.532.330-9'),
  ('REY DE LOS PERNOS',                   '76.733.630-6'),
  ('AGUA BLANCA INVERSIONES SPA',         '77.401.316-4'),
  ('LIBRERÍA LOS ANGELES',                '12.181.557-5'),
  ('HECTOR ULISES CAMPO PALAVECINO',      '9.376.150-2'),
  ('SOC. DE INVERSIONES LAS VEGAS LTDA.', '79.578.880-8'),
  ('ZURICH CHILES S.A.',                  '99.528.620-3'),
  ('ARP SERPI INVERSIONES',               '78.055.797-4'),
  ('SOCIEDAD INVERSIONES LAS VEGAS LTDA.','79.578.880-8'),
  ('SUR CONTAINER',                       '76.028.497-1'),
  ('ERSE ELETRIC',                        '77.638.085-7'),
  ('TRECK S.A.',                          '96.542.490-3'),
  ('POLITEC SPA',                         '96.567.010-6'),
  ('SOCIEDAD FORESTAL LOS LITRES LTDA.',  '76.449.530-6'),
  ('EBT SPA',                             '76.105.493-7'),
  ('REMACHES Y MAQUINARIAS LTDA.',        '78.404.150-6')
) AS v(nombre, rut)
WHERE NOT EXISTS (
  SELECT 1 FROM proveedor p WHERE p.nombre = v.nombre
);
