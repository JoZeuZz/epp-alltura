interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
  userAgent: string;
}

// Definir tipos específicos para Web Vitals
interface WebVitalEntry extends PerformanceEntry {
  value: number;
}

class PerformanceService {
  private metrics: PerformanceMetric[] = [];
  private observer: PerformanceObserver | null = null;
  private metricsEnabled: boolean;

  constructor() {
    // Feature flag: metrics disabled by default when VITE_ENABLE_METRICS is not set
    this.metricsEnabled = import.meta.env.VITE_ENABLE_METRICS === 'true';
  }

  initialize() {
    // Skip initialization if metrics are disabled
    if (!this.metricsEnabled) {
      return;
    }

    this.observeWebVitals();
    this.observeNavigationTiming();
    this.observeResourceTiming();
    
    // En desarrollo, enviar métricas cada 5 minutos para reducir requests
    // En producción, cada 30 segundos
    const isDevelopment = import.meta.env.MODE === 'development';
    const interval = isDevelopment ? 300000 : 30000; // 5min vs 30s
    
    setInterval(() => {
      this.sendMetrics();
    }, interval);
    
    // Enviar métricas al salir de la página
    window.addEventListener('beforeunload', () => {
      this.sendMetrics();
    });
  }

  private observeWebVitals() {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Type assertion para Web Vitals
          const webVitalEntry = entry as WebVitalEntry;
          if (webVitalEntry.value !== undefined) {
            this.recordMetric(`web-vital-${entry.name}`, webVitalEntry.value);
          }
        }
      });
      
      try {
        this.observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      } catch (error) {
        console.warn('Algunos tipos de métricas no están soportados:', error);
      }
    }
  }

  private observeNavigationTiming() {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        this.recordMetric('page-load-time', navigation.loadEventEnd - navigation.fetchStart);
        this.recordMetric('dom-content-loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
        this.recordMetric('first-byte', navigation.responseStart - navigation.fetchStart);
      }
    });
  }

  private observeResourceTiming() {
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming;
          
          if (resource.initiatorType === 'fetch' && resource.name.includes('/api/')) {
            this.recordMetric('api-response-time', resource.responseEnd - resource.fetchStart);
          }
        }
      });
      
      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Resource timing no soportado:', error);
      }
    }
  }

  recordMetric(name: string, value: number) {
    if (!this.metricsEnabled) return;
    
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      url: window.location.pathname,
      userAgent: navigator.userAgent
    });
  }

  // Métricas personalizadas para React Query
  recordApiCall(endpoint: string, duration: number, success: boolean) {
    this.recordMetric(`api-call-${endpoint}`, duration);
    this.recordMetric(`api-success-${endpoint}`, success ? 1 : 0);
  }

  private async sendMetrics() {
    if (!this.metricsEnabled || this.metrics.length === 0) return;
    
    try {
      const metricsToSend = [...this.metrics];
      this.metrics = [];
      
      await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ metrics: metricsToSend })
      });
    } catch {
      // Silently fail - don't spam console when metrics endpoint is not available
    }
  }
}

export const performanceService = new PerformanceService();
