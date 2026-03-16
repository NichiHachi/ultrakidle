import { motion } from "framer-motion";

export type GameMode = "classic" | "inferno";

interface Tab {
    id: GameMode;
    label: string;
}

interface ModeTabsProps {
    activeMode: GameMode;
    onModeChange: (mode: GameMode) => void;
    tabs: Tab[];
}

export const ModeTabs = ({ activeMode, onModeChange, tabs }: ModeTabsProps) => {
    return (
        <div className="flex gap-0 mb-4 w-full max-w-[450px]">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onModeChange(tab.id)}
                    className={`
            relative hover:cursor-pointer flex-1 py-2 px-4 text-sm md:text-base
            font-bold tracking-widest uppercase
            border-2 border-white/20 transition-colors duration-200
            ${activeMode === tab.id
                            ? "bg-white text-black border-white"
                            : "bg-transparent text-white/50 hover:text-white/80 hover:border-white/40"
                        }
            ${tab.id === "classic" ? "border-r-0" : ""}
          `}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default ModeTabs;
