import { useEffect, useRef } from 'react';
import { getStoredAccessToken } from '../services/authRefresh';

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

    let source: EventSource | null = null;
    let cancelled = false;

    const connect = async () => {
      const accessToken = getStoredAccessToken();
      if (!accessToken) {
        return;
      }

      const tokenResponse = await fetch('/api/firmas/events/deliveries/token', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!tokenResponse.ok) {
        return;
      }

      const payload = (await tokenResponse.json()) as {
        data?: {
          token?: string;
        };
      };

      const streamToken = payload?.data?.token;
      if (!streamToken || cancelled) {
        return;
      }

      source = new EventSource(
        `/api/firmas/events/deliveries?stream_token=${encodeURIComponent(streamToken)}`
      );

      source.addEventListener('delivery-signed', handler as EventListener);
      source.addEventListener('auth-required', () => {
        source?.close();
      });
    };

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
      } catch {
        // Ignore malformed event payloads to keep the stream alive.
      }
    };

    void connect();

    return () => {
      cancelled = true;
      source?.removeEventListener('delivery-signed', handler as EventListener);
      source?.close();
    };
  }, [enabled, onSigned]);
};
