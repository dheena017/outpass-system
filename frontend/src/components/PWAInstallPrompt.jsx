import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDownload, FiX, FiCheckCircle } from 'react-icons/fi';
import { nativeImpact } from '../utils/native';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed/standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the install button
      setTimeout(() => setShowPrompt(true), 5000); // Wait 5 seconds to not annoy
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    await nativeImpact();
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // Reset the deferred prompt variable, it can only be used once.
    setDeferredPrompt(null);
    setShowPrompt(false);
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
  };

  const closePrompt = async () => {
    await nativeImpact();
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && !isInstalled && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-50 p-4 rounded-3xl glass dark:bg-slate-900 shadow-2xl border border-white/20 flex flex-col gap-4 overflow-hidden"
        >
          {/* Decorative light */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <FiDownload size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 dark:text-white">Install App</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Add to Home Screen for a native experience.</p>
            </div>
            <button 
              onClick={closePrompt}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleInstallClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
          >
            Install Now
            {/* Subtle pulse animation for the Install button */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-1.5 h-1.5 rounded-full bg-white"
            />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
