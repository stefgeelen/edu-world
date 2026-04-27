import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[60%] bg-gradient-to-br from-teal-300 to-cyan-200 rounded-full blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[60%] bg-gradient-to-tl from-orange-300 to-amber-200 rounded-full blur-3xl opacity-20 pointer-events-none" />

      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="w-24 h-24 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-[2rem] shadow-xl shadow-teal-500/20 flex items-center justify-center mb-6 transform -rotate-3 relative z-10"
      >
        <Compass className="w-12 h-12 text-white" strokeWidth={2.5} />
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-6xl md:text-7xl font-black text-slate-800 tracking-tight relative z-10"
      >
        404
      </motion.h1>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-lg font-bold text-slate-700 mt-3 relative z-10"
      >
        Hmm, deze pagina bestaat niet
      </motion.p>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-slate-500 font-medium mt-1 mb-8 max-w-sm text-center relative z-10"
      >
        We konden de pagina <span className="font-mono text-slate-700">{location.pathname}</span> niet vinden.
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="flex flex-col sm:flex-row gap-3 w-full max-w-sm relative z-10"
      >
        <button
          onClick={() => navigate(-1)}
          className="flex-1 h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Terug
        </button>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="flex-1 h-14 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-400 hover:to-teal-500 text-white shadow-lg shadow-teal-500/30 active:scale-[0.98] border-b-4 border-teal-600 active:border-b-0 active:translate-y-1 transition-all"
        >
          <Home className="w-5 h-5" /> Naar Home
        </button>
      </motion.div>
    </div>
  );
};

export default NotFound;
