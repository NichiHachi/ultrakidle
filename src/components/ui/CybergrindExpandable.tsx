import { motion, AnimatePresence } from "framer-motion";
import Button from "./Button";

interface CybergrindExpandableProps {
  label: string;
  isExpanded: boolean;
  onToggle: () => void;
  onClassic: () => void;
  onInferno: () => void;
}

export const CybergrindExpandable = ({
  label,
  isExpanded,
  onToggle,
  onClassic,
  onInferno,
}: CybergrindExpandableProps) => {
  return (
    <div className="flex flex-col">
      <Button
        variant="outline"
        size="xl"
        onClick={onToggle}
      >
        {label}
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-2 inline-block"
        >
          ▼
        </motion.span>
      </Button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden md:px-3 px-2"
          >
            <div className="space-y-1 pb-2 pt-1">
              <div className="grid grid-cols-2 gap-1">
                <Button
                  variant="outline"
                  size="xl"
                  onClick={onClassic}
                >
                  <span className="md:text-base text-sm uppercase">
                    CLASSIC
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  onClick={onInferno}
                >
                  <span className="md:text-base text-sm uppercase text-wrap leading-tight">
                    INFERNOGUESSR
                  </span>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CybergrindExpandable;
