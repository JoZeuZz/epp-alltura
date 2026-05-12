import { useEffect, useRef } from 'react';
import { getStoredAccessToken } from '@alltura/shell';

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
  const reconnectDelayMsRef = useRef(1000);
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      return;
    }

    reconnectDelayMsRef.current = 1000;

    let source: EventSource | null = null;
    let cancelled = false;
    let aborted = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled || aborted || reconnectTimerRef.current) {
        return;
      }

      const delay = reconnectDelayMsRef.current;
      reconnectDelayMsRef.current = Math.min(reconnectDelayMsRef.current * 2, 10000);
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        void connect();
      }, delay);
    };

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
      clearReconnectTimer();
      source?.close();
      source = null;

      try {
        const accessToken = getStoredAccessToken();
        if (!accessToken) {
          aborted = true;
          return;
        }

        const tokenResponse = await fetch('/api/firmas/events/deliveries/token', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (cancelled || aborted) {
          return;
        }
        if (!tokenResponse.ok) {
          if (tokenResponse.status === 401 || tokenResponse.status === 403) {
            aborted = true;
            clearReconnectTimer();
            return;
          }
          scheduleReconnect();
          return;
        }

        const payload = (await tokenResponse.json()) as { data?: { token?: string } };
        const streamToken = payload?.data?.token;
        if (!streamToken || cancelled || aborted) {
          scheduleReconnect();
          return;
        }

        source = new EventSource(
          `/api/firmas/events/deliveries?stream_token=${encodeURIComponent(streamToken)}`
        );
        reconnectDelayMsRef.current = 1000;
      } catch {
        scheduleReconnect();
        return;
      }

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

      source.addEventListener('auth-required', () => {
        aborted = true;
        clearReconnectTimer();
        source?.close();
      });

      source.onerror = () => {
        source?.close();
        scheduleReconnect();
      };
    };

    void connect();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      source?.close();
    };
  }, [enabled, onSigned, onReturnSigned]);
};
