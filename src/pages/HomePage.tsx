import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { useGameInit } from "../hooks/useGameInit";
import { Typewriter } from "../components/Typewriter";
import { isRunningInDiscord, discordSdk } from "../lib/discord";
import { resolveExternalUrl } from "../lib/urls";
import { useMessages } from "../context/MessagesContext";
import SEO from "../components/SEO";
import PlayExpandable from "../components/ui/PlayExpandable";

const LoadingDots = () => {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-block w-[3ch] text-left">
      {".".repeat(dotCount)}
    </span>
  );
};

const getCountdown = () => {
  const now = new Date();
  const etStr = now.toLocaleString("en-US", {
    timeZone: "America/Managua",
  });
  const etNow = new Date(etStr);
  const etMidnight = new Date(etStr);
  etMidnight.setHours(24, 0, 0, 0);

  const msDiff = etMidnight.getTime() - etNow.getTime();

  const hours = Math.floor(msDiff / (1000 * 60 * 60));
  const minutes = Math.floor((msDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((msDiff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds };
};

const HomePage = () => {
  const {
    loading: gameLoading,
    guessHistory,
    dailyStats,
    streak,
    refresh,
    dailyChanged,
    setDailyChanged,
    infernoTotal,
    infernoAvg,
    infernoStatus,
  } = useGameInit();

  const navigate = useNavigate();
  const [diagnosticsStarted, setDiagnosticsStarted] = useState(false);
  const [countdown, setCountdown] = useState(getCountdown());
  const [playExpanded, setPlayExpanded] = useState(false);
  const { hasUnread } = useMessages();

  useEffect(() => {
    if (dailyChanged) {
      setDailyChanged(false);
      refresh();
    }
  }, [dailyChanged, setDailyChanged, refresh]);

  useEffect(() => {
    const timer = setInterval(() => {
      const current = getCountdown();
      setCountdown(current);

      if (
        current.hours === 0 &&
        current.minutes === 0 &&
        current.seconds === 0
      ) {
        setTimeout(() => refresh(), 2000);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!gameLoading) {
      const timer = setTimeout(() => setDiagnosticsStarted(true), 200);
      return () => clearTimeout(timer);
    }
  }, [gameLoading]);

  const hasWon = guessHistory.some((g) => g.hint_data?.correct);
  const hasReachedLimit = guessHistory.length >= 5;
  const isGameOver = hasWon || hasReachedLimit;
  const isInfernoCompleted = infernoStatus?.status === "completed";

  const classicStatus = hasWon
    ? "COMPLETED"
    : hasReachedLimit
    ? "FAILED"
    : "READY";

  const getInfernoStatusText = () => {
    if (!infernoStatus) return "READY";
    switch (infernoStatus.status) {
      case "completed":
        return "COMPLETED";
      case "in_progress":
        return "READY";
      default:
        return "READY";
    }
  };
  const infernoStatusText = getInfernoStatusText();

  const countdownStr = `${String(countdown.hours).padStart(2, "0")}:${String(
    countdown.minutes
  ).padStart(2, "0")}:${String(countdown.seconds).padStart(2, "0")}`;

  return (
    <div className="flex flex-col w-full h-full min-h-0">
      <SEO
        title="Home"
        description="ULTRAKIDLE - The daily character guessing game for ULTRAKILL players. Test your knowledge of enemies, levels, and more."
      />
      <div className="flex flex-col gap-4 w-full mx-auto h-full min-h-0">
        <div className="flex flex-col gap-0 w-full lg:text-xl md:text-lg text-sm opacity-50 text-left flex-shrink-0">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <div className="flex gap-1 items-baseline">
                <Typewriter text="MODULES:" speed={0.02} delay={0.1} />
                {gameLoading && <LoadingDots />}
              </div>
              {diagnosticsStarted && (
                <>
                  <Typewriter
                    text={`CLASSIC... ${classicStatus}`}
                    speed={0.02}
                    delay={0}
                    className={
                      classicStatus === "COMPLETED"
                        ? "text-green-500"
                        : classicStatus === "FAILED"
                        ? "text-red-500"
                        : ""
                    }
                  />
                  <Typewriter
                    text={`INFERNOGUESSR... ${infernoStatusText}`}
                    speed={0.02}
                    delay={0.1}
                    className={
                      infernoStatusText === "COMPLETED" ? "text-green-500" : ""
                    }
                  />
                </>
              )}
            </div>

            {diagnosticsStarted && (
              <div className="flex flex-row items-start justify-start gap-6">
                <div className="flex flex-col min-w-0">
                  <Typewriter text="CLASSIC:" speed={0.02} delay={0.3} />
                  <Typewriter
                    text={`├ STREAK: ${streak}`}
                    speed={0.02}
                    delay={0.4}
                  />
                  {dailyStats && (
                    <>
                      <Typewriter
                        text={`├ CLEARED: ${dailyStats.total_wins}`}
                        speed={0.02}
                        delay={0.5}
                      />
                      <Typewriter
                        text={`└ TERMINATED: ${dailyStats.total_losses}`}
                        speed={0.02}
                        delay={0.6}
                      />
                    </>
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <Typewriter text="INFERNOGUESSR:" speed={0.02} delay={0.3} />
                  <Typewriter
                    text={`├ POINTS: ${infernoTotal?.total_score ?? 0}`}
                    speed={0.02}
                    delay={0.4}
                  />
                  <Typewriter
                    text={`├ DEPLOYMENTS: ${infernoTotal?.games_played ?? 0}`}
                    speed={0.02}
                    delay={0.5}
                  />
                  <Typewriter
                    text={`└ TODAY_AVG: ${infernoAvg?.avg_score ?? 0}`}
                    speed={0.02}
                    delay={0.6}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {diagnosticsStarted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-4 w-full max-w-[450px] overflow-show min-h-0 pb-4"
          >
            <div className="flex flex-col gap-2">
              <PlayExpandable
                label={
                  isGameOver || isInfernoCompleted
                    ? "PLAY"
                    : guessHistory.length > 0
                    ? "CONTINUE"
                    : "PLAY"
                }
                isExpanded={playExpanded}
                onToggle={() => setPlayExpanded((p) => !p)}
                onClassic={() => navigate("/play/classic")}
                onInferno={() => navigate("/play/infernoguessr")}
                classicDisabled={isGameOver}
                classicContent={
                  isGameOver ? (
                    <span className="">CLASSIC ({countdownStr})</span>
                  ) : null
                }
                infernoContent={
                  isInfernoCompleted ? (
                    <span className="">INFERNOGUESSR ({countdownStr})</span>
                  ) : null
                }
              />
              <Button
                variant="outline"
                size="xl"
                onClick={() => navigate("/enemies")}
                className="mt-2"
              >
                ENEMIES
              </Button>
              <Button
                variant="outline"
                size="xl"
                onClick={() => navigate("/levels")}
                className="mt-2"
              >
                LEVELS
              </Button>
              <div className="flex w-full h-fit gap-2 flex-row">
                <Button
                  variant="outline"
                  size="xl"
                  className="flex-1"
                  onClick={() => {
                    const url = "https://ko-fi.com/G2G41UYAX6";
                    if (isRunningInDiscord() && discordSdk) {
                      discordSdk.commands.openExternalLink({ url });
                    } else {
                      window.open(url, "_blank");
                    }
                  }}
                >
                  DONATE
                  <img
                    className={`w-6 ml-3`}
                    src={resolveExternalUrl(
                      "/external/kofi/5c14e387dab576fe667689cf/670f5a01229bf8a18f97a3c1_favion.png"
                    )}
                    alt="Ko-fi"
                  />
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  onClick={() => navigate("/credits")}
                >
                  CREDITS
                </Button>
              </div>
              <div className="flex h-fit gap-2 flex-row">
                <Button
                  variant="outline"
                  className="flex-1"
                  size="xl"
                  onClick={() => navigate("/history")}
                >
                  LOGS
                </Button>
                <div className="relative overflow-visible h-full aspect-square">
                  <Button
                    variant="outline"
                    className="h-full w-full"
                    px="px-2"
                    py="py-2"
                    size="xl"
                    onClick={() => navigate("/messages")}
                  >
                    <svg
                      className="h-full w-full lucide lucide-mail-icon lucide-mail"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                    </svg>
                  </Button>
                  <AnimatePresence>
                    {hasUnread && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute top-0 right-0 z-30 pointer-events-none"
                      >
                        <div className="relative w-3 h-3 ">
                          <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full" />
                          <div className="absolute inset-0 w-3 h-3 scale-[1.5] animate-ping bg-green-500 rounded-full" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            {!isRunningInDiscord() && (
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="ghost"
                  className="flex items-center w-full"
                  onClick={() => navigate("/discord-install")}
                >
                  INSTALL ON DISCORD
                  <img
                    className="w-5 ml-2"
                    src="https://img.icons8.com/ios-filled/50/ffffff/discord-logo.png"
                    alt="Discord"
                  />
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
