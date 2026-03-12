import { LogGrid } from "./LogGrid";
import { motion, AnimatePresence } from "framer-motion";
import type { UserState } from "../../hooks/useLeaderboard";

interface LeaderboardProps {
  layout?: "vertical" | "horizontal";
  users: Record<string, UserState>;
  loading: boolean;
}

const StreakBadge = ({ streak }: { streak: number }) => (
  <div
    className={`text-sm font-bold flex gap-0 flex-row ${
      streak > 0 ? "text-orange-400" : "text-white/30 grayscale"
    }`}
  >
        🔥<div className="translate-y-1">{streak}</div>
  </div>
);

export const Leaderboard = ({
  layout = "vertical",
  users,
  loading,
}: LeaderboardProps) => {
  if (loading)
    return (
      <div className="text-white/50 w-full animate-pulse uppercase text-xs">
        SYNCHRONIZING...
      </div>
    );

  const calculateAccuracyScore = (guesses: string[][]) => {
    return guesses.reduce((total, row) => {
      const rowScore = row.reduce((rowTotal, color) => {
        if (color === "green") return rowTotal + 1;
        if (color === "yellow") return rowTotal + 0.5;
        return rowTotal;
      }, 0);
      return total + rowScore;
    }, 0);
  };

  const sortedUsers = Object.values(users).sort((a, b) => {
    const statusScore = { won: 2, playing: 1, lost: 0 };
    if (statusScore[a.status] !== statusScore[b.status]) {
      return statusScore[b.status] - statusScore[a.status];
    }

    if (a.attempt_count !== b.attempt_count) {
      return a.attempt_count - b.attempt_count;
    }

    const scoreA = calculateAccuracyScore(a.guesses);
    const scoreB = calculateAccuracyScore(b.guesses);
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    return (a.last_guess_at || "").localeCompare(b.last_guess_at || "");
  });

  const getRankColor = () => "text-white/80";

  const renderEntry = (user: UserState, index: number) => (
    <motion.div
      key={user.user_id}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start justify-center gap-1 p-2 border transition-colors ${
        layout === "horizontal" ? "w-36 flex-shrink-0" : "w-[135px]"
      } ${
        user.status === "won"
          ? "bg-green-500/10 border-green-500/30"
          : user.status === "lost"
            ? "bg-red-500/10 border-red-500/30"
            : "bg-white/5 border-white/10"
      }`}
    >
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <span className={`text-xs font-bold ${getRankColor()}`}>
          #{index + 1}
        </span>
        <img
          src={user.avatar_url}
          alt={user.discord_name}
          className="w-8 h-8 border border-white/20"
        />
        <StreakBadge streak={user.streak} />
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-xs font-bold text-white truncate">
          {user.discord_name}
        </span>
        <LogGrid hintData={user.guesses} size="sm" typewriter />
      </div>
    </motion.div>
  );

  if (layout === "horizontal") {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <AnimatePresence initial={false}>
          {sortedUsers.map((user, index) => renderEntry(user, index))}
        </AnimatePresence>
        {sortedUsers.length === 0 && (
          <div className="text-white/30 uppercase italic text-xs py-2 w-full text-center">
            NO GUILD DATA.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <AnimatePresence initial={false}>
        {sortedUsers.map((user, index) => renderEntry(user, index))}
      </AnimatePresence>
      {sortedUsers.length === 0 && (
        <div className="text-white/30 uppercase italic text-center py-4 text-xs">
          NO DATA RECEIVED FROM GUILD MEMBERS.
        </div>
      )}
    </div>
  );
};
