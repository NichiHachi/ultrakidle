import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import SEO from "../../components/SEO";
import { CURRENT_VERSION, useVersion } from "../../context/VersionContext";
import Button from "../../components/ui/Button";
import { EnemySearch } from "../../components/game/EnemySearch";
import { GuessBoard } from "../../components/game/GuessBoard";
import type { GuessResult } from "../../components/game/GuessBoard";
import { enemies } from "../../lib/enemy_list";
import { Typewriter } from "../../components/Typewriter";
import { motion } from "framer-motion";
import AlertDialog from "../../components/ui/AlertDialog";

const defaultHintData = { value: "", result: "gray" } as any;

const mapHintDataToGuessResult = (
    guess_enemy_id: number,
    hint_data: any,
    is_penance: boolean
): GuessResult => {
    const enemyData = enemies.find((e) => e.id === guess_enemy_id);
    const enemy_name = enemyData ? enemyData.name : "UNKNOWN";

    return {
        guess_id: guess_enemy_id,
        enemy_name,
        correct: hint_data.correct,
        is_penance,
        properties: {
            enemy_type: hint_data.properties.enemy_type || defaultHintData,
            weight_class: hint_data.properties.weight_class || defaultHintData,
            health: hint_data.properties.health || defaultHintData,
            level_count: hint_data.properties.level_count || defaultHintData,
            appearance: hint_data.properties.appearance || defaultHintData,
        },
    };
};

const CybergrindClassicPage = () => {
    const { setUpdateAvailable } = useVersion();
    const bottomRef = useRef<HTMLDivElement>(null);

    const [status, setStatus] = useState<"loading" | "no_run" | "active" | "game_over">("loading");
    const [currentWave, setCurrentWave] = useState<number>(1);
    const [modifiers, setModifiers] = useState<string[]>([]);
    const [guesses, setGuesses] = useState<GuessResult[]>([]);
    const [guessCount, setGuessCount] = useState<number>(0);
    const [roundId, setRoundId] = useState<number | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shouldFlash, setShouldFlash] = useState(false);
    const [isAbandonModalOpen, setIsAbandonModalOpen] = useState(false);
    const [stats, setStats] = useState<{ waves_reached: number; is_new_record: boolean; correct_id?: number } | null>(null);

    const handleStartRun = async () => {
        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.rpc("start_cybergrind_run", {
                version: CURRENT_VERSION,
            });

            if (error) {
                if (error.message.includes("CLIENT_OUTDATED")) setUpdateAvailable(true);
                throw error;
            }

            setStatus("active");
            setRoundId(data.round_id);
            setCurrentWave(data.round_number);
            setModifiers(data.modifiers || []);
            setGuesses([]);
            setGuessCount(0);
        } catch (err) {
            console.error("Error starting cybergrind run:", err);
            setStatus("loading");
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchState = async () => {
        try {
            const { data, error } = await supabase.rpc("get_cybergrind_state");
            if (error) throw error;

            if (data.status === "no_run") {
                await handleStartRun();
            } else if (data.status === "active") {
                setStatus("active");
                setRoundId(data.round_id);
                setCurrentWave(data.current_wave);
                setModifiers(data.modifiers || []);
                setGuessCount(data.guess_count || 0);

                if (data.guesses) {
                    const mappedGuesses = data.guesses.map((g: any) =>
                        mapHintDataToGuessResult(g.guess_enemy_id, g.hint_data, g.is_penance)
                    );
                    setGuesses(mappedGuesses);
                } else {
                    setGuesses([]);
                }
            }
        } catch (err) {
            console.error("Error fetching cybergrind state:", err);
            setStatus("loading");
        }
    };

    useEffect(() => {
        fetchState();
    }, []);

    const handleGuess = async (enemyId: number) => {
        if (isSubmitting || status !== "active" || !roundId) return;

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.rpc("submit_cybergrind_guess", {
                guess_id: enemyId,
                p_round_id: roundId,
                version: CURRENT_VERSION,
            });

            if (error) {
                if (error.message.includes("CLIENT_OUTDATED")) setUpdateAvailable(true);
                throw error;
            }

            const newGuess = mapHintDataToGuessResult(enemyId, data.hint_data, data.is_penance);
            setGuesses((prev) => {
                const updated = [...prev, newGuess];
                return modifiers.includes("LETHE") ? updated.slice(-2) : updated;
            });
            setGuessCount((prev) => prev + 1);

            if (data.hint_data.correct) {
                setShouldFlash(true);
                setTimeout(() => setShouldFlash(false), 1500);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAbandon = () => {
        setIsAbandonModalOpen(true);
    };

    const confirmAbandon = async () => {
        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.rpc("abandon_cybergrind_run", { version: CURRENT_VERSION });
            if (error) throw error;
            setStats({
                waves_reached: data.waves_reached,
                is_new_record: data.is_new_record
            });
            setStatus("game_over");
            setIsAbandonModalOpen(false);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNextRound = async () => {
        setGuesses([]);
        setTimeout(async () => {
            await fetchState();
        }, 400);
    };

    const hasWon = guesses.some((g) => g.correct);
    const hasReachedLimit = guessCount >= 6 && !hasWon;
    const isRoundOver = hasWon || hasReachedLimit;
    const isGameOver = status === "game_over";

    useEffect(() => {
        if (status !== "loading" && (isRoundOver || isGameOver)) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [status, isRoundOver, isGameOver]);

    if (status === "loading") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="text-2xl font-bold tracking-widest text-white/20 animate-pulse uppercase italic">
                    CONNECTING TO TERMINAL...
                </div>
            </div>
        );
    }

    if (isGameOver && stats) {
        return (
            <div className="p-4 z-40 flex flex-col w-full min-h-full items-center justify-center">
                <SEO title="Cybergrind Game Over" description="Cybergrind run summary." />
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-2xl bg-zinc-900/80 border border-white/10 p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden"
                >
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]" />

                    <div className="flex flex-col items-center text-center gap-8 relative z-20">
                        <div className="space-y-2">
                            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-red-500 uppercase italic">
                                RUN TERMINATED
                            </h2>
                            <Typewriter text="SYSTEM STATUS: INACTIVE" className="text-red-500/50 font-bold tracking-widest" speed={0.05} />
                        </div>

                        <div className="w-full grid grid-cols-2 gap-4">
                            <div className="flex flex-col p-4 bg-white/5 border border-white/5">
                                <span className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">Waves Reached</span>
                                <span className="text-3xl font-black text-white italic">{stats.waves_reached}</span>
                            </div>
                            <div className="flex flex-col p-4 bg-white/5 border border-white/5">
                                <span className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">Personal Record</span>
                                <span className="text-3xl font-black text-white italic">{stats.is_new_record ? "YES" : "NO"}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
                            <Button
                                variant="primary"
                                size="lg"
                                className="w-full font-black italic tracking-tighter py-6 text-xl"
                                onClick={() => window.location.reload()}
                            >
                                START NEW RUN
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full font-bold opacity-50 hover:opacity-100"
                                onClick={() => window.location.href = "/"}
                            >
                                RETURN TO MAIN MENU
                            </Button>
                        </div>
                    </div>
                </motion.div>

                {/* Background Dim */}
                <div className="fixed left-0 top-0 -z-10 h-dvh w-dvw overflow-visible bg-black/40"></div>
            </div>
        );
    }

    return (
        <>
            <div className="z-40 flex flex-col w-full pt-4 min-h-full justify-start items-start">
                <SEO title={`Cybergrind - Wave ${currentWave}`} description="Endless enemy-guessing mode." />

                <motion.div
                    key="cybergrind-active"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col w-full items-start"
                >
                    <div className="flex flex-col gap-0 mb-4 w-full lg:text-xl md:text-lg text-sm opacity-50 text-left flex-shrink-0">
                        <div className="flex gap-2 items-baseline">
                            <h1 className="tracking-widest flex-1">
                                CYBERGRIND_CLASSIC
                            </h1>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 w-full md:max-w-[1000px] border-b border-white/5 pb-6">
                        <div className="flex items-baseline gap-2">
                            <span className="text-white/60 font-bold uppercase tracking-widest whitespace-nowrap">WAVE:</span>
                            <span className="text-2xl font-black text-white italic leading-none">{currentWave}</span>
                        </div>

                        <div className="flex items-baseline gap-2 min-h-6">
                            <span className="text-white/60 font-bold uppercase tracking-widest whitespace-nowrap">MODIFIERS:</span>
                            <div className="flex gap-2 items-center flex-wrap">
                                {modifiers.length > 0 ? (
                                    modifiers.map(mod => (
                                        <span key={mod} className="font-bold text-red-500 uppercase italic tracking-wider">
                                            {mod}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-white/40 uppercase tracking-widest italic font-bold">NONE</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="w-full z-20">
                        <EnemySearch
                            onGuess={handleGuess}
                            disabled={isSubmitting || isRoundOver || isGameOver}
                        />
                    </div>

                    <motion.div
                        animate={shouldFlash ? { backgroundColor: ["rgba(255, 255, 255, 0.6)", "rgba(255, 255, 255, 0)"] } : { backgroundColor: "rgba(255, 255, 255, 0)" }}
                        transition={shouldFlash ? { duration: 1.5, ease: "easeOut" } : { duration: 0 }}
                        className="md:max-w-[1000px] w-full mt-4"
                    >
                        <div className="w-full flex justify-left">
                            <span className="text-white/50 text-sm text-left place-self-start w-full justify-left">
                                * All data mirrors that of the official wiki, which can be subject to change
                            </span>
                        </div>
                        <GuessBoard guesses={guesses} />
                    </motion.div>

                    <div className="mt-2 text-white flex flex-col items-start gap-1 font-bold uppercase tracking-wider md:max-w-[1000px] w-full">
                        <span className="opacity-50">
                            GUESSES REMAINING: {Math.max(0, 6 - guessCount)} / 6
                        </span>

                        {!isRoundOver && !isGameOver && (
                            <Button variant="danger" onClick={handleAbandon} className="mt-2 bg-white/20">
                                ABANDON RUN
                            </Button>
                        )}

                        {hasWon && (
                            <div className="flex flex-col gap-1 items-start mt-2">
                                <Typewriter text="STATUS: SUCCESS" className="text-green-500 opacity-50" speed={0.02} />
                                <Typewriter text={`WAVE ${currentWave} CLEARED`} className="opacity-50" speed={0.02} delay={0.4} />
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={handleNextRound}
                                        className="opacity-50 hover:opacity-100 mt-2"
                                    >
                                        CONTINUE
                                    </Button>
                                </motion.div>
                            </div>
                        )}

                        {hasReachedLimit && (
                            <div className="flex flex-col gap-1 items-start mt-2">
                                <Typewriter text="STATUS: FAILED" className="text-red-500 opacity-50" speed={0.02} />
                                <Typewriter text={`TERMINAL_SHUTDOWN_INITIATED`} className="opacity-50 " speed={0.02} delay={0.4} />
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={confirmAbandon}
                                        className="opacity-50 hover:opacity-100 mt-2"
                                    >
                                        CLOSE SESSION
                                    </Button>
                                </motion.div>
                            </div>
                        )}
                        <div ref={bottomRef} className="h-20" />
                    </div>
                </motion.div>
            </div>

            {/* Background Dim */}
            {!isGameOver && (
                modifiers.some((m) => m === "ECLIPSE") && (
                    <div className="fixed left-0 top-0 -z-10 h-dvh w-dvw overflow-visible bg-black/80"></div>
                )
            ) || (
                    <div className="fixed left-0 top-0 -z-10 h-dvh w-dvw overflow-visible bg-black/40"></div>
                )}

            <AlertDialog
                isOpen={isAbandonModalOpen}
                onClose={() => setIsAbandonModalOpen(false)}
                onConfirm={confirmAbandon}
                title="Acknowledge Abandonment"
                description="Are you sure you want to terminate the current run? Your progress will be recorded and the run will end."
                variant="danger"
                confirmText="Terminate Run"
                cancelText="Return"
                isConfirming={isSubmitting}
            />
        </>
    );
};

export default CybergrindClassicPage;
