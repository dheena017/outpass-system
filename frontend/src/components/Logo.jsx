import { motion } from 'framer-motion';

export default function Logo({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-8 h-8 text-xl rounded-lg',
    md: 'w-10 h-10 text-2xl rounded-xl',
    lg: 'w-16 h-16 text-4xl rounded-2xl',
    xl: 'w-24 h-24 text-6xl rounded-[2rem]'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <motion.div
        whileHover={{ scale: 1.05, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        className={`${sizes[size]} bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 relative group overflow-hidden`}
      >
        <span className="font-black text-white italic relative z-10 select-none">O</span>
        
        {/* Shine effect */}
        <motion.div
          animate={{
            left: ['-100%', '200%'],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "linear",
            delay: 1
          }}
          className="absolute top-0 bottom-0 w-8 bg-white/20 -skew-x-12 z-20"
        />
        
        {/* Background pulse */}
        <div className="absolute inset-0 bg-blue-400/10 group-hover:bg-blue-400/20 transition-colors" />
      </motion.div>
      {size !== 'xl' && (
        <h1 className={`${size === 'sm' ? 'text-lg' : 'text-2xl'} font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:from-white group-hover:to-white transition-all`}>
          Outpass
        </h1>
      )}
    </div>
  );
}
