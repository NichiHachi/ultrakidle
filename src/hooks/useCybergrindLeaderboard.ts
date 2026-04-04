import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export interface CGLeaderboardEntry {
    user_id: string;
    discord_name: string;
    avatar_url: string;
    best_wave: number;
    total_guesses: number;
    hint_accuracy: number;
    achieved_at: string;
    rank: number;
}

export const useCybergrindLeaderboard = () => {
    const [entries, setEntries] = useState<CGLeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasEllipsis, setHasEllipsis] = useState(false);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id;

                // Fetch top 
                const { data: top3Data, error: top3Error } = await supabase
                    .from("cybergrind_leaderboard")
                    .select("*")
                    .limit(10)
                    .order("rank", { ascending: true });

                if (top3Error) {
                    console.error("Error fetching top 3 cybergrind leaderboard:", top3Error);
                }

                const top3 = (top3Data || []) as CGLeaderboardEntry[];

                if (!userId) {
                    setEntries(top3);
                    setLoading(false);
                    return;
                }

                // Fetch user's rank
                const { data: userData, error: userError } = await supabase
                    .from("cybergrind_leaderboard")
                    .select("rank")
                    .eq("user_id", userId)
                    .maybeSingle();

                if (userError) {
                    console.error("Error fetching user rank for cybergrind leaderboard:", userError);
                }

                if (!userData || !userData.rank) {
                    setEntries(top3);
                    setLoading(false);
                    return;
                }

                const userRank = userData.rank;

                if (userRank <= 4) {
                    // fetch top 5 to overlap with user
                    const { data: top5Data, error: top5Error } = await supabase
                        .from("cybergrind_leaderboard")
                        .select("*")
                        .limit(5)
                        .order("rank", { ascending: true });

                    if (top5Error) {
                        console.error("Error fetching top 5 cybergrind leaderboard:", top5Error);
                    }

                    setEntries((top5Data || []) as CGLeaderboardEntry[]);
                    setHasEllipsis(false);
                } else {
                    // get user and neighbors
                    const { data: neighborData, error: neighborError } = await supabase
                        .from("cybergrind_leaderboard")
                        .select("*")
                        .gte("rank", userRank - 1)
                        .lte("rank", userRank + 1)
                        .order("rank", { ascending: true });

                    if (neighborError) {
                        console.error("Error fetching neighbor records for cybergrind leaderboard:", neighborError);
                    }

                    setHasEllipsis(true);
                    const combined = [...top3, ...((neighborData || []) as CGLeaderboardEntry[])];

                    // Deduplicate by rank just in case
                    const uniqueEntries = Array.from(new Map(combined.map(e => [e.rank, e])).values());
                    // Sort by rank
                    uniqueEntries.sort((a, b) => a.rank - b.rank);

                    setEntries(uniqueEntries);
                }

            } catch (err) {
                console.error("Error fetching cybergrind leaderboard:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    return { entries, loading, hasEllipsis };
};
