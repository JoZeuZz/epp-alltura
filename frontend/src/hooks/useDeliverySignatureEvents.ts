import { useEffect, useRef } from 'react';

export interface DeliverySignedEvent {
  signature_id: string;
  entrega_id: string;
  metodo: 'qr_link' | 'en_dispositivo' | string;
  firmado_en: string;
  trabajador_id: string;
}

interface UseDeliverySignatureEventsOptions {
  enabled?: boolean;
  onSigned?: (event: DeliverySignedEvent) => void;
}

export const useDeliverySignatureEvents = ({
  enabled = true,
  onSigned,
}: UseDeliverySignatureEventsOptions) => {
  const seenEventIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      return;
    }

    const url = `/api/firmas/events/deliveries?access_token=${encodeURIComponent(accessToken)}`;
    const source = new EventSource(url);

    const handler = (rawEvent: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(rawEvent.data) as DeliverySignedEvent;
        const eventId = rawEvent.lastEventId || payload.signature_id;

        if (eventId && seenEventIdsRef.current.has(eventId)) {
          return;
        }

        if (eventId) {
          seenEventIdsRef.current.add(eventId);
          if (seenEventIdsRef.current.size > 300) {
            const [firstKey] = seenEventIdsRef.current;
            if (firstKey) {
              seenEventIdsRef.current.delete(firstKey);
            }
          }
        }

        onSigned?.(payload);
      } catch (_error) {
        // Ignore malformed event payloads to keep the stream alive.
      }
    };

    source.addEventListener('delivery-signed', handler as EventListener);

    return () => {
      source.removeEventListener('delivery-signed', handler as EventListener);
      source.close();
    };
  }, [enabled, onSigned]);
};
