import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Button from "./Button";

interface PlayExpandableProps {
  label: string;
  isExpanded: boolean;
  onToggle: () => void;
  onClassic: () => void;
  onInferno: () => void;
  classicDisabled?: boolean;
  classicContent?: React.ReactNode;
  infernoDisabled?: boolean;
  infernoContent?: React.ReactNode;
}

export const PlayExpandable = ({
  label,
  isExpanded,
  onToggle,
  onClassic,
  onInferno,
  classicDisabled = false,
  classicContent,
  infernoDisabled = false,
  infernoContent,
}: PlayExpandableProps) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col">
      <Button variant="primary" size="xl" onClick={onToggle}>
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
            <div className="space-y-2 pb-2">
              <div className="grid grid-cols-2 gap-1 pt-1">
                <Button
                  variant="outline"
                  size="xl"
                  className="flex-1 "
                  onClick={onClassic}
                >
                  <span className="md:text-base text-sm">
                    {classicContent ?? "CLASSIC"}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  className="flex-1"
                  onClick={onInferno}
                >
                  <span className="md:text-base text-sm">
                    {infernoContent ?? "INFERNOGUESSR"}
                  </span>
                </Button>
              </div>
              {classicDisabled && (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => navigate("/play/classic")}
                  className="opacity-50 w-full hover:opacity-100"
                >
                  VIEW BOARD
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlayExpandable;
