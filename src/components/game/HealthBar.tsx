import { useEffect, useState, useRef } from "react";

interface HealthBarProps {
  initialHealth: number;
  waveNumber: number;
  startTime: string | null;
  onHealthDepleted: () => void;
  isGameOver: boolean;
  isDecaying: boolean;
  isFirstRound?: boolean;
}

const HealthBar = ({ initialHealth, waveNumber, startTime, onHealthDepleted, isGameOver, isDecaying, isFirstRound }: HealthBarProps) => {
  const [displayHealth, setDisplayHealth] = useState(initialHealth);
  const hasDepleted = useRef(false);
  const zeroHealthTime = useRef<number | null>(null);

  const [flashColor, setFlashColor] = useState<"green" | "red" | null>(null);
  const prevInitialHealth = useRef(initialHealth);
  const prevStartTime = useRef(startTime);
  const prevWave = useRef(waveNumber);

  useEffect(() => {
    if (initialHealth > 0) {
      hasDepleted.current = false;
      zeroHealthTime.current = null;
    }
  }, [initialHealth, waveNumber]);

  useEffect(() => {
    // If wave or round started, reset ref without flashing
    if (prevStartTime.current !== startTime || prevWave.current !== waveNumber) {
      prevStartTime.current = startTime;
      prevWave.current = waveNumber;
      prevInitialHealth.current = initialHealth;
      setFlashColor(null);
      return;
    }

    if (prevInitialHealth.current !== initialHealth) {
        const healthDiff = Math.abs(initialHealth - prevInitialHealth.current);

        if (prevInitialHealth.current > 0 && !isGameOver && healthDiff > 2) {
          if (initialHealth > prevInitialHealth.current) {
            setFlashColor("green");
          } else if (initialHealth < prevInitialHealth.current) {
            setFlashColor("red");
          }
        }
        prevInitialHealth.current = initialHealth;
      }
  }, [initialHealth, startTime, waveNumber, isGameOver]);

  useEffect(() => {
    if (flashColor) {
      const timer = setTimeout(() => {
        setFlashColor(null);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [flashColor]);

  useEffect(() => {
    if (isGameOver) {
      setDisplayHealth(initialHealth);
      return;
    }

    let animationFrame: number;
    let lastTime = Date.now();
    let lastLogTime = Date.now();

    const update = () => {
      const nowMs = Date.now();
      const dt = Math.min((nowMs - lastTime) / 1000, 0.1); // max 100ms delta
      lastTime = nowMs;

      let targetHealth = initialHealth;

      if (isDecaying && startTime && !hasDepleted.current) {
        const startMs = new Date(startTime).getTime() + 200;
        const elapsedSeconds = Math.max(0, (nowMs - startMs) / 1000);
        const decayRate = isFirstRound ? 1.0 : Math.sqrt(waveNumber);
        targetHealth = Math.max(0, initialHealth - (elapsedSeconds * decayRate));

        if (targetHealth <= 0) {
          if (zeroHealthTime.current === null) {
            zeroHealthTime.current = nowMs;
          } else if (nowMs - zeroHealthTime.current >= 200) {
            hasDepleted.current = true;
            onHealthDepleted();
          }
        } else {
          zeroHealthTime.current = null;
        }
      }

      setDisplayHealth((prev) => {
        const diff = targetHealth - prev;
        
        if (nowMs - lastLogTime > 1000) {
          console.log(`[HealthBar] wave: ${waveNumber}, initialHealth: ${initialHealth}, isDecaying: ${isDecaying}, startTime: ${startTime}, isFirstRound: ${isFirstRound}`);
          console.log(`[HealthBar] dt: ${dt}, targetHealth: ${targetHealth}, prevDisplay: ${prev}, diff: ${diff}`);
          lastLogTime = nowMs;
        }
        
        if (Math.abs(diff) < 0.1) return targetHealth;
        // Smoothly interpolate. Faster if the difference is big, keeping it tight when decaying
        return prev + diff * (1 - Math.pow(0.001, dt)); // time-independent lerp
      });

      // Always request the next frame if not game over
      if (!hasDepleted.current) {
         animationFrame = requestAnimationFrame(update);
      }
    };

    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [startTime, initialHealth, waveNumber, onHealthDepleted, isGameOver, isDecaying, isFirstRound]);

  const displayHealthInt = hasDepleted.current ? 0 : Math.floor(displayHealth);
  const percentage = hasDepleted.current ? 0 : Math.min(100, Math.max(0, displayHealth));

  const containerClasses = `w-full bg-white/20 border-0 rounded-md overflow-hidden flex items-center relative h-8 transition-all duration-500`;

  const textClasses = `relative z-10 font-bold text-lg ml-2 transition-colors duration-500 ${
    flashColor === "green" ? "text-green-200 " :
    flashColor === "red" ? "text-red-200 " :
    "text-white"
  }`;


  return (
    <div className={containerClasses}>
      <div 
        className="absolute top-0 left-0 h-full bg-red-500 transition-none rounded-md"
        style={{ width: `${percentage}%` }}
      />
      <div className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
        flashColor === "green" ? "bg-green-500/20 opacity-100" :
        flashColor === "red" ? "bg-red-500/20 opacity-100" :
        "opacity-0"
      }`} />
      <span className={textClasses}>
        {displayHealthInt}
      </span>
    </div>
  );
};

export default HealthBar;
