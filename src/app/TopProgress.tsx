import { AnimatePresence, motion } from 'framer-motion';
import { useNavigation } from 'react-router-dom';

/** A slim bar across the top while the next page's code is on its way. */
export function TopProgress() {
  const busy = useNavigation().state !== 'idle';
  return (
    <AnimatePresence>
      {busy && (
        <motion.div
          aria-hidden="true"
          className="fixed inset-x-0 top-0 z-[90] h-0.5 origin-left bg-primary rtl:origin-right"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 0.85, transition: { duration: 4, ease: [0.1, 0.7, 0.3, 1] } }}
          exit={{ scaleX: 1, opacity: 0, transition: { duration: 0.25 } }}
        />
      )}
    </AnimatePresence>
  );
}
