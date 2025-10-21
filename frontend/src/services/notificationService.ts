class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  
  // Inicializar service worker y notificaciones
  async initialize(): Promise<boolean> {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications no soportadas');
        return false;
      }

      // Registrar service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado:', this.swRegistration);
      
      return true;
    } catch (error) {
      console.error('Error registrando Service Worker:', error);
      return false;
    }
  }

  // Solicitar permisos y suscribirse
  async subscribe(): Promise<boolean> {
    try {
      if (!this.swRegistration) {
        await this.initialize();
      }

      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.warn('Permisos de notificación denegados');
        return false;
      }

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('VAPID public key no configurada');
        return false;
      }

      const applicationServerKey = this.urlB64ToUint8Array(vapidPublicKey);
      
      const subscription = await this.swRegistration!.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource
      });

      // Enviar suscripción al backend
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ subscription })
      });

      return true;
    } catch (error) {
      console.error('Error suscribiéndose a notificaciones:', error);
      return false;
    }
  }

  // Verificar si está suscrito
  async isSubscribed(): Promise<boolean> {
    try {
      if (!this.swRegistration) return false;
      
      const subscription = await this.swRegistration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      return false;
    }
  }

  private urlB64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
}

export const notificationService = new NotificationService();
