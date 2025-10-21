const CACHE_NAME = 'alltura-reports-v1';
const OFFLINE_CACHE = 'offline-v1';
const RUNTIME_CACHE = 'runtime-v1';

const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/logo192.png',
  '/offline.html'
];

const API_CACHE_PATTERNS = [
  /\/api\/projects/,
  /\/api\/scaffolds/,
  /\/api\/users\/me/
];

// Instalación: cachear recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)),
      caches.open(OFFLINE_CACHE).then(cache => {
        return cache.add('/offline.html');
      })
    ])
  );
  self.skipWaiting();
});

// Activación: limpiar cachés antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== OFFLINE_CACHE && name !== RUNTIME_CACHE)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Estrategia de fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Manejar APIs con estrategia Network First
  if (isApiRequest(request)) {
    event.respondWith(networkFirstStrategy(request));
  }
  // Manejar assets estáticos con Cache First
  else if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request));
  }
  // Navegación con Network First + Offline Fallback
  else if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
  }
});

// Estrategia Network First para APIs
async function networkFirstStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Para POST requests sin caché, guardar en IndexedDB para retry
    if (request.method === 'POST') {
      await saveFailedRequest(request);
    }
    
    throw error;
  }
}

// Estrategia Cache First para assets estáticos
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  
  if (cached) {
    return cached;
  }
  
  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  
  return response;
}

// Estrategia para navegación
async function navigationStrategy(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(OFFLINE_CACHE);
    return cache.match('/offline.html');
  }
}

// Helpers
function isApiRequest(request) {
  return request.url.includes('/api/');
}

function isStaticAsset(request) {
  return request.destination === 'script' || 
         request.destination === 'style' || 
         request.destination === 'image';
}

// Guardar requests fallidos para retry posterior
async function saveFailedRequest(request) {
  const body = await request.text();
  const failedRequest = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: body,
    timestamp: Date.now()
  };
  
  // Usar IndexedDB para persistir requests fallidos
  const db = await openDB();
  const transaction = db.transaction(['failed_requests'], 'readwrite');
  transaction.objectStore('failed_requests').add(failedRequest);
}

// Background Sync para reintentos
self.addEventListener('sync', (event) => {
  if (event.tag === 'retry-failed-requests') {
    event.waitUntil(retryFailedRequests());
  }
});

async function retryFailedRequests() {
  const db = await openDB();
  const transaction = db.transaction(['failed_requests'], 'readwrite');
  const store = transaction.objectStore('failed_requests');
  const requests = await store.getAll();
  
  for (const failedRequest of requests) {
    try {
      const response = await fetch(failedRequest.url, {
        method: failedRequest.method,
        headers: failedRequest.headers,
        body: failedRequest.body
      });
      
      if (response.ok) {
        await store.delete(failedRequest.id);
      }
    } catch (error) {
      console.log('Retry failed for:', failedRequest.url);
    }
  }
}
