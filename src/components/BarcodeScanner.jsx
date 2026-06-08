import React, { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Loader2 } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose }) {
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let html5QrCode;
    
    // Give the DOM a tiny bit of time to render the #reader div
    const timer = setTimeout(() => {
      html5QrCode = new Html5Qrcode("reader");
      let isProcessing = false;
      
      html5QrCode.start(
        { facingMode: "environment" }, // Prefer back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          if (isProcessing) return;
          isProcessing = true;
          // Success
          html5QrCode.stop().then(() => {
            onScan(decodedText);
          }).catch(err => console.error("Failed to stop scanner", err));
        },
        (errorMessage) => {
          // Ignore frequent parsing errors
        }
      ).catch((err) => {
        console.error("Camera start failed:", err);
        setHasError(true);
        setErrorMsg("לא הצלחנו לגשת למצלמה. ייתכן שאין לך הרשאה או שהדפדפן חוסם אותה.");
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(error => console.error("Failed to stop scanner on unmount.", error));
      }
    };
  }, [onScan]);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: '1rem', width: '90%', maxWidth: '500px' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="m-0 text-xl font-bold">סריקת ברקוד (ISBN)</h3>
          <button onClick={onClose} className="p-2" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
        <p className="text-gray-600 mb-4 text-sm text-center">
          כוון את המצלמה לברקוד (הקווים השחורים) שבגב הספר.
        </p>
        
        {hasError ? (
          <div className="text-center p-4" style={{ background: '#fee2e2', borderRadius: '8px', color: '#b91c1c' }}>
            {errorMsg}
          </div>
        ) : (
          <div id="reader" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
            <Loader2 className="animate-spin" color="white" />
          </div>
        )}
      </div>
    </div>
  );
}
