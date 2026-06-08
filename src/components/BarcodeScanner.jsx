import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 150 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [0] // 0 means camera scan only (no file upload inside scanner UI)
      },
      false
    );

    scanner.render(
      (decodedText) => {
        // Stop scanning when success
        scanner.clear();
        onScan(decodedText);
      },
      (errorMessage) => {
        // Ignored, fires continuously
      }
    );

    return () => {
      scanner.clear().catch(error => console.error("Failed to clear html5QrcodeScanner.", error));
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
        <div id="reader" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden' }}></div>
      </div>
    </div>
  );
}
