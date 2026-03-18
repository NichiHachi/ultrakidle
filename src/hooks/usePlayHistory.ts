import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface HistoryItem {
    is_win: boolean;
    attempt_count: number;
    daily_choice: {
        chosen_at: string;
        enemy: {
            name: string;
        }
    }
}

export interface InfernoHistoryItem {
    total_score: number;
    total_time_seconds: number;
    completed_at: string;
    set: {
        game_date: string;
    }
}

export function usePlayHistory() {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [infernoHistory, setInfernoHistory] = useState<InfernoHistoryItem[]>([]);
    const [longestStreak, setLongestStreak] = useState(0);

    useEffect(() => {
        async function fetchHistory() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setLoading(false);
                    return;
                }

                const [classicRes, infernoRes, streakRes] = await Promise.all([
                    supabase
                        .from('user_wins')
                        .select(`
                            is_win,
                            attempt_count,
                            daily_choice:daily_choices (
                                chosen_at,
                                enemy:ultrakill_enemies (
                                    name
                                )
                            )
                        `)
                        .eq('user_id', session.user.id)
                        .order('completed_at', { ascending: false }),
                    supabase
                        .from('inferno_results')
                        .select(`
                            total_score,
                            total_time_seconds,
                            completed_at,
                            set:inferno_daily_sets (
                                game_date
                            )
                        `)
                        .eq('user_id', session.user.id)
                        .not('completed_at', 'is', null)
                        .order('completed_at', { ascending: false }),
                    supabase.rpc('get_user_longest_streak', { p_user_id: session.user.id })
                ]);

                if (classicRes.error) throw classicRes.error;
                if (infernoRes.error) throw infernoRes.error;
                
                if (streakRes.data !== null) setLongestStreak(streakRes.data as number);

                if (classicRes.data) {
                    const mappedData = classicRes.data.map((item: any) => {
                        const daily_choice = Array.isArray(item.daily_choice) ? item.daily_choice[0] : item.daily_choice;
                        if (daily_choice) {
                            daily_choice.enemy = Array.isArray(daily_choice.enemy) ? daily_choice.enemy[0] : daily_choice.enemy;
                        }
                        return { ...item, daily_choice };
                    });
                    setHistory(mappedData as HistoryItem[]);
                }

                if (infernoRes.data) {
                    const mappedInferno = infernoRes.data.map((item: any) => ({
                        ...item,
                        set: Array.isArray(item.set) ? item.set[0] : item.set
                    }));
                    setInfernoHistory(mappedInferno as InfernoHistoryItem[]);
                }

            } catch (err) {
                console.error("Failed to fetch play history", err);
            } finally {
                setLoading(false);
            }
        }

        fetchHistory();
    }, []);

    return { loading, history, infernoHistory, longestStreak };
}
