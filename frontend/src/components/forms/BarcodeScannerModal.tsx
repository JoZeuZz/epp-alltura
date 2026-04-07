import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../Modal';
import { parseScannedCode } from '../../utils/barcode';

type BarcodeDetectorResult = {
  rawValue?: string;
};

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

const DETECTION_FORMATS = ['qr_code', 'code_128', 'ean_13', 'ean_8', 'code_39', 'itf', 'upc_a', 'upc_e'];

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onDetected }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isDetectingRef = useRef(false);

  const [status, setStatus] = useState('Listo para escanear.');
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  const supportsCamera = useMemo(
    () => typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
    []
  );

  const BarcodeDetectorImpl = useMemo(
    () => (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector,
    []
  );

  const supportsBarcodeDetector = Boolean(BarcodeDetectorImpl);

  const stopScanner = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    detectorRef.current = null;
    isDetectingRef.current = false;
  }, []);

  const handleDetectedValue = useCallback(
    (rawValue: string | null | undefined) => {
      const parsed = parseScannedCode(rawValue);
      if (!parsed) {
        setError('No se detectó un código válido. Intenta nuevamente o pega el código.');
        return;
      }

      onDetected(parsed);
      onClose();
    },
    [onClose, onDetected]
  );

  const startScanner = useCallback(async () => {
    stopScanner();
    setError(null);

    if (!supportsCamera) {
      setStatus('Cámara no disponible en este dispositivo.');
      setError('Puedes usar la opción de pegar código o ingresar el código manualmente.');
      return;
    }

    if (!supportsBarcodeDetector || !BarcodeDetectorImpl) {
      setStatus('Escaneo por cámara no soportado en este navegador.');
      setError('Usa la opción de pegar código o escribe el código manualmente.');
      return;
    }

    try {
      setStatus('Solicitando permiso de cámara...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      });
      streamRef.current = stream;

      detectorRef.current = new BarcodeDetectorImpl({ formats: DETECTION_FORMATS });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus('Apunta la cámara al código QR o código de barras.');

      intervalRef.current = window.setInterval(async () => {
        if (isDetectingRef.current || !videoRef.current || !detectorRef.current) {
          return;
        }

        if (videoRef.current.readyState < 2) {
          return;
        }

        isDetectingRef.current = true;
        try {
          const results = await detectorRef.current.detect(videoRef.current);
          const firstResult = results.find((item) => parseScannedCode(item.rawValue));
          if (firstResult) {
            handleDetectedValue(firstResult.rawValue);
          }
        } catch {
          // Ignore transient frame detection errors.
        } finally {
          isDetectingRef.current = false;
        }
      }, 350);
    } catch (cameraError) {
      const maybeError = cameraError as { name?: string };
      if (maybeError?.name === 'NotAllowedError') {
        setError('Permiso de cámara denegado. Habilítalo o usa la opción de pegar código.');
      } else if (maybeError?.name === 'NotFoundError') {
        setError('No se detectó una cámara disponible en el dispositivo.');
      } else {
        setError('No fue posible iniciar la cámara.');
      }
      setStatus('No se pudo iniciar el escáner.');
    }
  }, [BarcodeDetectorImpl, handleDetectedValue, stopScanner, supportsBarcodeDetector, supportsCamera]);

  const handlePasteFromClipboard = useCallback(async () => {
    setError(null);

    try {
      if (!navigator.clipboard?.readText) {
        setError('Tu navegador no permite leer el portapapeles automáticamente.');
        return;
      }

      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        setError('El portapapeles está vacío.');
        return;
      }

      handleDetectedValue(text);
    } catch {
      setError('No se pudo leer el portapapeles. Pega el código manualmente en el campo.');
    }
  }, [handleDetectedValue]);

  const handleManualSubmit = useCallback(() => {
    handleDetectedValue(manualCode);
  }, [handleDetectedValue, manualCode]);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setManualCode('');
      setError(null);
      setStatus('Listo para escanear.');
      return;
    }

    setTimeout(() => {
      manualInputRef.current?.focus();
    }, 0);

    void startScanner();

    return () => {
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Escanear código"
      description="Escanea o pega un código para buscar y seleccionar un activo elegible."
    >
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Escanear código</h3>

        <div className="rounded-lg border border-gray-200 overflow-hidden bg-black/90">
          <video
            ref={videoRef}
            className="w-full h-56 object-cover"
            muted
            playsInline
            aria-label="Vista previa de cámara para escanear código"
          />
        </div>

        <p className="text-sm text-gray-600" aria-live="polite">
          {status}
        </p>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void startScanner()}
            className="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50"
          >
            Reintentar cámara
          </button>
          <button
            type="button"
            onClick={() => void handlePasteFromClipboard()}
            className="px-3 py-2 rounded-md bg-primary-blue text-white text-sm hover:opacity-90"
          >
            Pegar código
          </button>
        </div>

        <div className="space-y-2">
          <label htmlFor="barcode-manual-input" className="block text-sm font-medium text-gray-700">
            Código manual
          </label>
          <div className="flex gap-2">
            <input
              id="barcode-manual-input"
              ref={manualInputRef}
              type="text"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="Ej: TAL-001 o SER-001"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
            />
            <button
              type="button"
              onClick={handleManualSubmit}
              className="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50"
            >
              Usar código
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BarcodeScannerModal;