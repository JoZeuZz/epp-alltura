# GCP Cloud Storage — Setup para Inventario Alltura

## 1. Crear el bucket

1. Ir a [Google Cloud Console](https://console.cloud.google.com) → **Cloud Storage** → **Buckets** → **Create**
2. **Nombre:** `alltura-inventario-prod` (debe ser globalmente único en GCS)
3. **Región:** `southamerica-west1` (Santiago — latencia mínima) o `us-central1` (más barato)
4. **Storage class:** Standard
5. **Access control:** Uniform (recomendado — sin ACL por objeto)
6. **Public access prevention:** Enforce (los archivos se sirven vía URLs firmadas o proxy — sin acceso público directo)
7. Click **Create**

## 2. Crear la cuenta de servicio

1. IAM & Admin → **Service Accounts** → **Create Service Account**
2. **Nombre:** `inventario-app`
3. **Descripción:** `Sube y elimina archivos del bucket de inventario`
4. Click **Create and Continue**
5. En "Grant this service account access to project": **no agregar rol aquí** (lo haremos a nivel de bucket en el paso 3)
6. Click **Done**

## 3. Asignar permisos solo sobre el bucket (más seguro)

1. Ir al bucket creado → **Permissions** tab → **Grant Access**
2. **Principal:** `inventario-app@<tu-proyecto-id>.iam.gserviceaccount.com`
3. **Role:** `Storage Object Admin` (`roles/storage.objectAdmin`)
   - Permite: crear, leer, listar y eliminar objetos dentro del bucket
4. Click **Save**

## 4. Descargar la clave JSON

1. IAM & Admin → **Service Accounts** → click en `inventario-app`
2. Tab **Keys** → **Add Key** → **Create new key** → **JSON**
3. Se descarga `inventario-app-<id>.json`
4. **Nunca commitear este archivo — agrégalo a `.gitignore` si lo ubicas en el repo**

## 5. Variables de entorno

### Desarrollo local — `backend/.env`

```env
# GCS
GCS_PROJECT_ID=tu-proyecto-id
GCS_BUCKET_NAME=alltura-inventario-prod
GCS_PREFIX=herramientas
IMAGE_STORAGE_PROVIDER=gcs
GCS_SIGNED_URLS=true
GCS_IMAGE_PROXY=true
GOOGLE_APPLICATION_CREDENTIALS=/ruta/absoluta/inventario-app-key.json
```

Para dev sin GCS (archivos en disco local), omitir todas las vars `GCS_*` y usar:
```env
IMAGE_STORAGE_PROVIDER=local
```

### Producción en Coolify — `inventario.alltura.cl`

En Coolify no se puede montar un archivo fácilmente, así que el JSON se pasa como variable inline:

1. Abre el archivo JSON descargado en un editor de texto
2. Copia **todo** el contenido (es un objeto JSON en una línea o multilínea — Coolify lo acepta igual)
3. En Coolify → tu servicio → **Environment Variables**, agrega:

```env
GCS_PROJECT_ID=tu-proyecto-id
GCS_BUCKET_NAME=alltura-inventario-prod
GCS_PREFIX=herramientas
IMAGE_STORAGE_PROVIDER=gcs
GCS_SIGNED_URLS=true
GCS_IMAGE_PROXY=true
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"tu-proyecto-id","private_key_id":"...","private_key":"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n","client_email":"inventario-app@tu-proyecto-id.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token",...}
```

El valor de `GOOGLE_APPLICATION_CREDENTIALS_JSON` es el contenido completo del JSON descargado, en una sola línea.

> `GOOGLE_APPLICATION_CREDENTIALS_JSON` tiene prioridad sobre `GOOGLE_APPLICATION_CREDENTIALS`. Si defines ambas, se usa la JSON inline.

## 6. Verificar la conexión

```bash
cd backend && node -e "
const { Storage } = require('@google-cloud/storage');
const opts = { projectId: process.env.GCS_PROJECT_ID };
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  opts.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
} else {
  opts.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}
const s = new Storage(opts);
s.bucket(process.env.GCS_BUCKET_NAME).getMetadata()
  .then(() => console.log('Conexión OK'))
  .catch(e => console.error('Error:', e.message));
"
```

Si responde `Conexión OK`, la cuenta de servicio tiene acceso al bucket.

## 7. Estructura de carpetas en el bucket

Las carpetas se crean automáticamente al subir el primer archivo con ese prefijo — no hay que crearlas manualmente.

```
{GCS_PREFIX}/
  articulos/
    fotos/           # Foto del artículo     → EPP001_casco-de-seguridad_1716134400000-a1b2c3.jpg
    facturas/        # PDF de factura         → EPP001_1716134400000-a1b2c3.pdf
    manuales/        # PDF de manual          → EPP001_1716134400000-a1b2c3.pdf
    certificaciones/ # PDFs de certificados   → EPP001_cert-en361_1716134400000-a1b2c3.pdf
  entregas/
    evidencias/      # Foto de evidencia de entrega
  devoluciones/
    evidencias/      # Foto de evidencia de devolución
  usuarios/
    fotos/           # Foto de perfil de usuario
```

## 8. Notas sobre eliminación

Cuando se elimina un artículo permanentemente desde la app:
- Se eliminan del bucket: foto, factura, manual y todas las certificaciones del artículo
- La operación usa `Promise.allSettled` — si algún archivo ya no existe en GCS, la eliminación del artículo continúa igual
- El frontend muestra un `ConfirmationModal` con advertencia explícita antes de permitir la acción

Las fotos de evidencia de entregas y devoluciones **no se eliminan** al borrar el artículo — son registros históricos que permanecen en el bucket.
