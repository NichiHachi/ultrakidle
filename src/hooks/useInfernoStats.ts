import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface InfernoTotalScore {
    total_score: number;
    games_played: number;
}

export interface InfernoDailyAvg {
    avg_score: number | null;
    total_completed: number;
}

export type InfernoStatus = 'no_game_today' | 'in_progress' | 'completed';

export interface InfernoRoundData {
    status: InfernoStatus;
    total_score?: number;
    // Add other fields as necessary from the API response
}

export function useInfernoStats() {
    const [loading, setLoading] = useState(true);
    const [totalScore, setTotalScore] = useState<InfernoTotalScore | null>(null);
    const [dailyAvg, setDailyAvg] = useState<InfernoDailyAvg | null>(null);
    const [gameStatus, setGameStatus] = useState<InfernoRoundData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStats() {
            setLoading(true);
            try {
                const [totalRes, avgRes, roundRes] = await Promise.all([
                    supabase.rpc('get_inferno_total_score'),
                    supabase.rpc('get_inferno_daily_avg'),
                    supabase.rpc('get_inferno_round', { version: '1.2.0' })
                ]);

                if (totalRes.error) throw totalRes.error;
                if (avgRes.error) throw avgRes.error;
                if (roundRes.error) throw roundRes.error;

                setTotalScore(totalRes.data);
                setDailyAvg(avgRes.data);
                setGameStatus(roundRes.data);
            } catch (err: any) {
                console.error('Error fetching inferno stats:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, []);

    return { loading, totalScore, dailyAvg, gameStatus, error };
}
