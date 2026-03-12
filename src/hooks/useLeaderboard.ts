import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export interface UserState {
  user_id: string;
  discord_name: string;
  avatar_url: string;
  guesses: string[][];
  status: "playing" | "won" | "lost";
  attempt_count: number;
  last_guess_at: string;
  streak: number;
}

export const useLeaderboard = (guildId?: string | null) => {
  const [users, setUsers] = useState<Record<string, UserState>>({});
  const [dailyId, setDailyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [allowedUserIds, setAllowedUserIds] = useState<Set<string> | null>(
    null
  );

  const fetchProfileForUser = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("discord_name, avatar_url")
      .eq("id", userId)
      .single();

    if (profile) {
      setUsers((prev) => {
        if (!prev[userId]) return prev;
        return {
          ...prev,
          [userId]: {
            ...prev[userId],
            discord_name: profile.discord_name,
            avatar_url: profile.avatar_url || "/images/v1-plush.webp",
          },
        };
      });
    }
  };

  useEffect(() => {
    const initLeaderboard = async () => {
      try {
        const { data: dailyData, error: dailyError } = await supabase
          .from("current_daily_choice")
          .select("daily_choice_id")
          .single();

        if (dailyError) throw dailyError;
        const todayId = dailyData.daily_choice_id;
        setDailyId(todayId);

        let guildMemberIds: string[] | null = null;
        if (guildId) {
          const { data: guildData, error: guildError } = await supabase
            .from("user_guilds")
            .select("user_id")
            .eq("guild_id", guildId);

          if (!guildError && guildData) {
            guildMemberIds = guildData.map((g) => g.user_id);
            setAllowedUserIds(new Set(guildMemberIds));
          }
        } else {
          setAllowedUserIds(null);
        }

        let guessQuery = supabase
          .from("guess_colors")
          .select("user_id, guess_number, colors, created_at")
          .eq("daily_choice_id", todayId);

        if (guildMemberIds) {
          guessQuery = guessQuery.in("user_id", guildMemberIds);
        }

        const { data: guessData, error: guessError } = await guessQuery
          .order("user_id")
          .order("guess_number");

        if (guessError) throw guessError;

        const userIds = Array.from(
          new Set(guessData?.map((g) => g.user_id) || [])
        );
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, discord_name, avatar_url")
          .in("id", userIds.length > 0 ? userIds : ["__none__"]);

        if (profileError)
          console.error("[Leaderboard] Profile fetch error:", profileError);

        interface Profile {
          id: string;
          discord_name: string;
          avatar_url: string | null;
        }

        const profileMap = (
          (profileData as unknown as Profile[]) || []
        ).reduce((acc: Record<string, Profile>, p) => {
          acc[p.id] = p;
          return acc;
        }, {});

        const initialUsers: Record<string, UserState> = {};

        guessData?.forEach((row) => {
          if (!initialUsers[row.user_id]) {
            const profile = profileMap[row.user_id];
            initialUsers[row.user_id] = {
              user_id: row.user_id,
              discord_name: profile?.discord_name || row.user_id.slice(0, 8),
              avatar_url: profile?.avatar_url || "/images/v1-plush.webp",
              guesses: [],
              status: "playing",
              attempt_count: 0,
              last_guess_at: row.created_at || "",
              streak: 0,
            };
          }
          const guessColors = (row.colors as string[]).map((c: string) =>
            c.toLowerCase()
          );
          initialUsers[row.user_id].guesses.push(guessColors);

          if (guessColors.every((c) => c === "green")) {
            initialUsers[row.user_id].status = "won";
          } else if (
            initialUsers[row.user_id].guesses.length >= 5 &&
            initialUsers[row.user_id].status !== "won"
          ) {
            initialUsers[row.user_id].status = "lost";
          }

          initialUsers[row.user_id].attempt_count =
            initialUsers[row.user_id].guesses.length;
          if (row.created_at) {
            initialUsers[row.user_id].last_guess_at = row.created_at;
          }
        });

        setUsers(initialUsers);

        if (guildId) {
          const { data: streakData } = await supabase.rpc("get_guild_streaks", {
            p_guild_id: guildId,
          });

          if (streakData) {
            const streakMap = new Map<string, number>(
              (streakData as { user_id: string; streak: number }[]).map((s) => [
                s.user_id,
                s.streak,
              ])
            );
            setUsers((prev) => {
              const updated = { ...prev };
              for (const uid of Object.keys(updated)) {
                updated[uid] = {
                  ...updated[uid],
                  streak: streakMap.get(uid) ?? 0,
                };
              }
              return updated;
            });
          }
        }
      } catch (err) {
        console.error("[Leaderboard] Failed to initialize", err);
      } finally {
        setLoading(false);
      }
    };

    initLeaderboard();
  }, [guildId]);

  useEffect(() => {
    if (!dailyId) return;

    const guessChannel = supabase
      .channel("leaderboard_guesses")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "guess_colors",
          filter: `daily_choice_id=eq.${dailyId}`,
        },
        (payload) => {
          const newGuess = payload.new as {
            user_id: string;
            colors: string[];
            created_at?: string;
          };

          if (allowedUserIds && !allowedUserIds.has(newGuess.user_id)) {
            return;
          }

          const guessColors = newGuess.colors.map((c: string) =>
            c.toLowerCase()
          );
          const createdAt = newGuess.created_at || new Date().toISOString();

          setUsers((prev) => {
            const existing = prev[newGuess.user_id];
            if (existing) {
              const newGuesses = [...existing.guesses, guessColors];
              const isWin = guessColors.every((c) => c === "green");
              const isLoss = !isWin && newGuesses.length >= 5;

              let newStreak = existing.streak;
              if (existing.status === "playing") {
                if (isWin) newStreak += 1;
                else if (isLoss) newStreak = 0;
              }

              return {
                ...prev,
                [newGuess.user_id]: {
                  ...existing,
                  guesses: newGuesses,
                  attempt_count: newGuesses.length,
                  status: isWin ? "won" : isLoss ? "lost" : existing.status,
                  last_guess_at: createdAt,
                  streak: newStreak,
                },
              };
            } else {
              fetchProfileForUser(newGuess.user_id);
              const isWin = guessColors.every((c) => c === "green");
              const isLoss = !isWin && 1 >= 5;
              return {
                ...prev,
                [newGuess.user_id]: {
                  user_id: newGuess.user_id,
                  discord_name: "Anonymous",
                  avatar_url: "/images/v1-plush.webp",
                  guesses: [guessColors],
                  status: isWin ? "won" : isLoss ? "lost" : "playing",
                  attempt_count: 1,
                  last_guess_at: createdAt,
                  streak: isWin ? 1 : isLoss ? 0 : 0,
                },
              };
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(guessChannel);
    };
  }, [dailyId, allowedUserIds]);

  return { users, loading };
};
