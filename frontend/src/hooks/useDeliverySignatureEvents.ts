import { useEffect, useRef } from 'react';
import { getStoredAccessToken } from '../services/authRefresh';

export interface DeliverySignedEvent {
  signature_id: string;
  entrega_id: string;
  metodo: 'qr_link' | 'en_dispositivo' | string;
  firmado_en: string;
  trabajador_id: string;
}

export interface ReturnSignedEvent {
  signature_id: string;
  devolucion_id: string;
  metodo: 'qr_link' | 'en_dispositivo' | string;
  firmado_en: string;
  trabajador_id: string;
}

interface UseDeliverySignatureEventsOptions {
  enabled?: boolean;
  onSigned?: (event: DeliverySignedEvent) => void;
  onReturnSigned?: (event: ReturnSignedEvent) => void;
}

export const useDeliverySignatureEvents = ({
  enabled = true,
  onSigned,
  onReturnSigned,
}: UseDeliverySignatureEventsOptions) => {
  const seenEventIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let source: EventSource | null = null;
    let cancelled = false;

    const deduplicateAndRun = (id: string, fn: () => void) => {
      if (id && seenEventIdsRef.current.has(id)) return;
      if (id) {
        seenEventIdsRef.current.add(id);
        if (seenEventIdsRef.current.size > 300) {
          const [firstKey] = seenEventIdsRef.current;
          if (firstKey) seenEventIdsRef.current.delete(firstKey);
        }
      }
      fn();
    };

    const connect = async () => {
      const accessToken = getStoredAccessToken();
      if (!accessToken) return;

      const tokenResponse = await fetch('/api/firmas/events/deliveries/token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!tokenResponse.ok) return;

      const payload = (await tokenResponse.json()) as { data?: { token?: string } };
      const streamToken = payload?.data?.token;
      if (!streamToken || cancelled) return;

      source = new EventSource(
        `/api/firmas/events/deliveries?stream_token=${encodeURIComponent(streamToken)}`
      );

      source.addEventListener('delivery-signed', ((rawEvent: MessageEvent<string>) => {
        try {
          const data = JSON.parse(rawEvent.data) as DeliverySignedEvent;
          const eventId = rawEvent.lastEventId || data.signature_id;
          deduplicateAndRun(eventId, () => onSigned?.(data));
        } catch { /* ignore malformed */ }
      }) as EventListener);

      source.addEventListener('return-signed', ((rawEvent: MessageEvent<string>) => {
        try {
          const data = JSON.parse(rawEvent.data) as ReturnSignedEvent;
          const eventId = rawEvent.lastEventId || data.signature_id;
          deduplicateAndRun(eventId, () => onReturnSigned?.(data));
        } catch { /* ignore malformed */ }
      }) as EventListener);

      source.addEventListener('auth-required', () => { source?.close(); });
    };

    void connect();

    return () => {
      cancelled = true;
      source?.close();
    };
  }, [enabled, onSigned, onReturnSigned]);
};
