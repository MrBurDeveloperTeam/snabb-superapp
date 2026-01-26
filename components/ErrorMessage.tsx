import { motion, AnimatePresence } from 'framer-motion';

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
        >
          {/* <Alert severity="error">{message}</Alert> */}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
