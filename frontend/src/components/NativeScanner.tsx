import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { isNative, nativeImpact } from '../utils/native';
import { FiX, FiZap, FiZapOff } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function NativeScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleStartScan = () => {
      if (isNative()) {
        startNativeScanner();
      } else {
        toast.info('QR Scanner is only available in the Mobile App. Please use your camera app to scan the QR code.', {
          position: "top-center",
          autoClose: 5000
        });
      }
    };

    window.addEventListener('start-scan', handleStartScan);
    return () => {
      window.removeEventListener('start-scan', handleStartScan);
      stopNativeScanner();
    };
  }, []);

  const startNativeScanner = async () => {
    try {
      const status = await BarcodeScanner.checkPermission({ force: true });

      if (status.granted) {
        await nativeImpact();
        setIsScanning(true);
        
        // Hide UI and body background
        document.body.classList.add('scanner-active');
        await BarcodeScanner.hideBackground();

        const result = await BarcodeScanner.startScan();

        if (result.hasContent) {
          await nativeImpact();
          stopNativeScanner();
          handleScanResult(result.content);
        }
      } else {
        toast.error('Camera permission denied.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to start scanner.');
      stopNativeScanner();
    }
  };

  const stopNativeScanner = async () => {
    try {
      setIsScanning(false);
      document.body.classList.remove('scanner-active');
      await BarcodeScanner.showBackground();
      await BarcodeScanner.stopScan();
    } catch (err) {
      console.error('Stop scanner error:', err);
    }
  };

  const handleScanResult = (content) => {
    // Expected content: https://.../validate/UUID or just UUID
    try {
      let id = content;
      if (content.includes('/validate/')) {
        id = content.split('/validate/')[1].split('?')[0];
      }
      navigate(`/validate/${id}`);
    } catch (err) {
      toast.error('Invalid QR Code format.');
    }
  };

  const toggleTorch = async () => {
    try {
      if (isTorchOn) {
        await BarcodeScanner.disableTorch();
      } else {
        await BarcodeScanner.enableTorch();
      }
      setIsTorchOn(!isTorchOn);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isScanning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between p-8 pointer-events-none">
      {/* Scanner Overlay UI */}
      <div className="w-full flex justify-between items-center pointer-events-auto">
        <button 
          onClick={stopNativeScanner}
          className="w-12 h-12 flex items-center justify-center bg-black/50 text-white rounded-full backdrop-blur-md"
        >
          <FiX size={24} />
        </button>
        
        <button 
          onClick={toggleTorch}
          className="w-12 h-12 flex items-center justify-center bg-black/50 text-white rounded-full backdrop-blur-md transition-colors"
          style={{ color: isTorchOn ? '#fbbf24' : 'white' }}
        >
          {isTorchOn ? <FiZapOff size={24} /> : <FiZap size={24} />}
        </button>
      </div>

      <div className="relative w-64 h-64 pointer-events-none">
        {/* Animated Scanning Box */}
        <div className="absolute inset-0 border-2 border-indigo-500 rounded-3xl overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.5)]">
          <div className="w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)] animate-scanner-line" />
        </div>
        
        {/* Corner Accents */}
        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />
      </div>

      <div className="mb-12 pointer-events-auto">
        <p className="bg-black/50 text-white px-6 py-3 rounded-full backdrop-blur-md text-sm font-bold tracking-widest uppercase animate-pulse">
          Align QR Code within frame
        </p>
      </div>

      <style>{`
        body.scanner-active #root {
          visibility: hidden;
        }
        @keyframes scanner-line {
          0% { transform: translateY(0); }
          100% { transform: translateY(256px); }
        }
        .animate-scanner-line {
          animation: scanner-line 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
