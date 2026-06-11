import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { supabase } from "../lib/supabaseClient";

interface TimeContextType {
  clockOffset: number;
  isSyncing: boolean;
  getSyncedTime: () => number;
  resync: () => Promise<void>;
}

const TimeContext = createContext<TimeContextType | undefined>(undefined);

export const TimeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [clockOffset, setClockOffset] = useState(0);
  const [isSyncing, setIsSyncing] = useState(true);

  const resync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const samples: { offset: number; rtt: number }[] = [];

      for (let i = 0; i < 3; i++) {
        const startPerf = performance.now();
        const { data, error } = await supabase.rpc("get_server_time");
        const endPerf = performance.now();
        const clientEndTime = Date.now();

        if (!error && data) {
          const rtt = endPerf - startPerf;
          const serverTime = Number(data);
          const adjustedServerTime = serverTime + rtt / 2;
          const offset = adjustedServerTime - clientEndTime;

          samples.push({ offset, rtt });
        }
      }

      if (samples.length > 0) {
        const bestSample = samples.reduce((prev, curr) =>
          prev.rtt < curr.rtt ? prev : curr,
        );
        setClockOffset(bestSample.offset);
      }
    } catch (err) {
      console.error("Failed to sync clock:", err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const getSyncedTime = useCallback(
    () => Date.now() + clockOffset,
    [clockOffset],
  );

  useEffect(() => {
    resync();
  }, [resync]);

  return (
    <TimeContext.Provider
      value={{
        clockOffset,
        isSyncing,
        getSyncedTime,
        resync,
      }}
    >
      {children}
    </TimeContext.Provider>
  );
};

export const useTime = () => {
  const context = useContext(TimeContext);
  if (!context) throw new Error("useTime must be used within a TimeProvider");
  return context;
};
