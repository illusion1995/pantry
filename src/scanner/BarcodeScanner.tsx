import { useEffect, useRef, useState } from 'react';
import { LightIcon } from '../components/icons';

// Grocery products use EAN/UPC barcodes. Limiting to these avoids misreads.
const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

interface Props {
  onDetected: (code: string) => void;
}

/** Live camera view that calls `onDetected` once with the first barcode it reads. */
export function BarcodeScanner({ onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const onDetectedRef = useRef(onDetected);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
  const [error, setError] = useState('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | undefined;
    let stopDecoding = () => {};
    let found = false;

    const report = (raw: string) => {
      if (found || cancelled) return;
      found = true;
      navigator.vibrate?.(80);
      onDetectedRef.current(raw);
    };

    (async () => {
      setStatus('starting');
      setTorchSupported(false);
      setTorchOn(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This page can’t use the camera. Open the app from its https:// address.');
        setStatus('error');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (e) {
        if (!cancelled) {
          setError(cameraErrorMessage(e));
          setStatus('error');
        }
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play().catch(() => {});

      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      const capabilities = track.getCapabilities?.() as { torch?: boolean } | undefined;
      setTorchSupported(Boolean(capabilities?.torch));
      setStatus('scanning');

      const stop = await startDecoding(video, report);
      if (cancelled) stop();
      else stopDecoding = stop;
    })();

    return () => {
      cancelled = true;
      stopDecoding();
      stream?.getTracks().forEach((t) => t.stop());
      trackRef.current = null;
    };
  }, [attempt]);

  async function toggleTorch() {
    const track = trackRef.current;
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }

  if (status === 'error') {
    return (
      <div className="scanner-error" role="alert">
        <p>{error}</p>
        <button type="button" className="btn btn--outline" onClick={() => setAttempt((n) => n + 1)}>
          Try the camera again
        </button>
      </div>
    );
  }

  return (
    <div className="scanner">
      <div className="scanner__view">
        <video ref={videoRef} className="scanner__video" playsInline muted aria-label="Camera view" />
        <div className="scanner__target" aria-hidden="true" />
        {status === 'starting' && <p className="scanner__starting">Starting the camera…</p>}
      </div>
      <p className="scanner__hint">Hold the barcode inside the yellow box.</p>
      {torchSupported && (
        <button type="button" className="btn btn--outline" aria-pressed={torchOn} onClick={toggleTorch}>
          <LightIcon /> {torchOn ? 'Turn off the light' : 'Turn on the light'}
        </button>
      )}
    </div>
  );
}

/** Starts reading barcodes from the video. Returns a function that stops it. */
async function startDecoding(video: HTMLVideoElement, onCode: (code: string) => void): Promise<() => void> {
  const Native = window.BarcodeDetector;
  if (Native) {
    const supported = await Native.getSupportedFormats().catch(() => [] as string[]);
    const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
    if (formats.length > 0) {
      const detector = new Native({ formats });
      let stopped = false;
      const tick = async () => {
        if (stopped) return;
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          try {
            const [code] = await detector.detect(video);
            if (code && !stopped) onCode(code.rawValue);
          } catch {
            // A frame that can't be read; try the next one.
          }
        }
        if (!stopped) setTimeout(tick, 120);
      };
      void tick();
      return () => {
        stopped = true;
      };
    }
  }

  // Fallback for browsers without the built-in detector (e.g. desktop Chrome on Windows).
  const [{ BrowserMultiFormatOneDReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ]);
  const hints = new Map([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
  ]);
  const reader = new BrowserMultiFormatOneDReader(hints, { delayBetweenScanAttempts: 120 });
  const controls = await reader.decodeFromVideoElement(video, (result) => {
    if (result) onCode(result.getText());
  });
  return () => controls.stop();
}

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'The camera is blocked. Allow camera access for this app in your phone’s settings, then try again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found on this device.';
    case 'NotReadableError':
    case 'AbortError':
      return 'Another app is using the camera. Close it and try again.';
    default:
      return 'The camera didn’t start. Try again.';
  }
}
