import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function MobileSplashScreen({ children }) {
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    // Artificial delay to show the beautiful splash
    const timer = setTimeout(() => {
      setComplete(true);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {!complete && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ 
              opacity: 0,
              scale: 1.1,
              filter: "blur(10px)",
              transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
            }}
            className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Pulsing Gradient Background */}
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px]"
            />
            
            <motion.div 
              animate={{ 
                scale: [1.1, 1, 1.1],
                opacity: [0.2, 0.4, 0.2]
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[80px] -bottom-20 -right-20"
            />

            {/* Logo Container */}
            <div className="relative group">
              <motion.div
                initial={{ scale: 0.8, opacity: 0, rotate: -15 }}
                animate={{ scale: 1, opacity: 1, rotate: 3 }}
                transition={{ 
                  duration: 1.2, 
                  ease: [0.16, 1, 0.3, 1],
                  rotate: { duration: 1.5, ease: "easeOut" }
                }}
                className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-[0_20px_50px_rgba(37,99,235,0.4)] border border-white/20 relative z-10"
              >
                <span className="text-6xl font-black text-white italic drop-shadow-2xl">O</span>
              </motion.div>
              
              {/* Glow effect */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1.5 }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                className="absolute inset-0 bg-blue-500/30 rounded-full blur-3xl -z-1"
              />
            </div>

            {/* Text and Loading */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="mt-12 text-center relative z-10"
            >
              <h1 className="text-4xl font-black tracking-tighter text-white mb-2">
                OUTPASS
              </h1>
              <p className="text-blue-400 font-bold tracking-[0.3em] text-xs uppercase opacity-80">
                Security & Tracking
              </p>
            </motion.div>

            {/* Modern Loader */}
            <div className="absolute bottom-20 left-0 right-0 flex flex-col items-center gap-4 px-12">
               <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
                  <motion.div 
                    initial={{ left: "-100%" }}
                    animate={{ left: "100%" }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                  />
               </div>
               <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                 Initializing Secure Environment
               </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={complete ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none' + ' transition-all duration-1000 ease-out'}>
        {children}
      </div>
    </>
  );
}
