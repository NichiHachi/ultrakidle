import { useNavigate } from "react-router-dom";
import SEO from "../../components/SEO";
import { Typewriter } from "../../components/Typewriter";
import { motion } from "framer-motion";
import ModeTabs from "../../components/ui/ModeTabs";
import type { GameMode } from "../../components/ui/ModeTabs";

const InfernoPlayPage = () => {
    const navigate = useNavigate();

    const tabs: { id: GameMode; label: string }[] = [
        { id: "classic", label: "CLASSIC" },
        { id: "inferno", label: "INFERNOGUESSR" },
    ];

    return (
        <>
            <div className="z-40 flex flex-col w-full pt-4 min-h-full justify-start items-start">
                <SEO
                    title="InfernoGuessr"
                    description="Identify the target in the incoming inferno mode."
                />

                <ModeTabs
                    activeMode="inferno"
                    onModeChange={(mode) => navigate(`/play/${mode}`)}
                    tabs={tabs}
                />

                <motion.div
                    key="inferno"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col w-full items-start"
                >
                    <div className="flex flex-col gap-0 mb-4 w-full lg:text-xl md:text-lg text-sm opacity-50 text-left flex-shrink-0">
                        <div className="flex gap-2 items-baseline">
                            <h1 className="tracking-widest flex-1">
                                INFERNO_GUESSER
                            </h1>
                        </div>
                    </div>

                    <div className="flex flex-col items-start gap-4 py-8">
                        <p className="text-white/50 uppercase tracking-wider text-sm">
                            INCOMING TRANSMISSION...
                        </p>
                        <Typewriter
                            text="THIS MODULE IS NOT YET OPERATIONAL. STAND BY FOR DEPLOYMENT."
                            className="text-white/30 text-lg"
                            speed={0.03}
                        />
                    </div>
                </motion.div>
            </div>

            <div className="-z-10 h-dvh w-dvw bg-black/40 fixed top-0 left-0 overflow-visible"></div>
        </>
    );
};

export default InfernoPlayPage;
