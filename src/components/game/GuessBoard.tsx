import { enemies } from '../../lib/enemy_list';
import { EnemyIcon } from './EnemyIcon';
import { useSettings } from '../../context/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';

const isValueEclipsed = (val: any) => val === undefined || val === null || val === '';

export interface GuessResult {
    guess_id?: number;
    enemy_name: string;
    correct: boolean;
    correct_id?: number;
    is_penance?: boolean;
    properties: {
        enemy_type: { value: string; result: 'correct' | 'incorrect' };
        weight_class: { value: string; result: 'correct' | 'incorrect' };
        health: {
            value: number;
            result: 'correct' | 'higher' | 'lower';
            color?: 'green' | 'yellow' | 'red';
        };
        level_count: {
            value: number;
            result: 'correct' | 'higher' | 'lower';
            color?: 'green' | 'yellow' | 'red';
        };
        appearance: {
            value: string;
            result: 'correct' | 'incorrect' | 'later' | 'earlier';
            color?: 'green' | 'yellow' | 'red';
        };
    };
}

interface GuessBoardProps {
    guesses: GuessResult[];
}

const getResultColorClass = (
    result: 'correct' | 'incorrect' | 'gray' | string,
    color?: 'green' | 'yellow' | 'red',
    colorblindMode?: boolean
) => {
    if (result === 'gray') return 'bg-zinc-800/20 border-zinc-500/30 text-zinc-500/50';

    if (color) {
        if (color === 'green') return 'bg-green-600/20 border-green-500 text-green-500';
        if (color === 'yellow') {
            return colorblindMode
                ? 'bg-blue-600/20 border-blue-500 text-blue-500'
                : 'bg-yellow-600/20 border-yellow-500 text-yellow-500';
        }
        return 'bg-red-600/20 border-red-500 text-red-500';
    }

    return result === 'correct'
        ? 'bg-green-600/20 border-green-500 text-green-500'
        : 'bg-red-600/20 border-red-500 text-red-500';
};

const StatusIcon = ({
    result,
    color,
    enabled,
}: {
    result: string;
    color?: 'green' | 'yellow' | 'red';
    enabled: boolean;
}) => {
    if (!enabled) return null;
    let icon = '⨯';
    if (color === 'green' || result === 'correct') icon = '✓';
    else if (color === 'yellow') icon = 'ǃ';
    return <span className="mr-1.5 opacity-80 font-bold">{icon}</span>;
};

export const GuessBoard = ({ guesses }: GuessBoardProps) => {
    const { colorblindMode } = useSettings();

    return (
        <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm text-left uppercase border-collapse">
                <thead className="text-xs text-white/50 bg-white/5 border-b border-white/10">
                    <tr>
                        <th className="px-4 py-3">Enemy</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Weight</th>
                        <th className="px-4 py-3">Health</th>
                        <th className="px-4 py-3">Total Levels</th>
                        <th className="px-4 py-3">Registered at</th>
                    </tr>
                </thead>
                <tbody className="relative">
                    <AnimatePresence mode="popLayout" initial={false}>
                        {guesses.map((guess, idx) => {
                            const enemy = enemies.find(e => e.name === guess.enemy_name);
                            return (
                                <motion.tr
                                    key={guess.guess_id || idx}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                    className={`border-b border-white/5 last:border-0 hover:bg-white/5 ${guess.is_penance ? 'bg-amber-500/5' : ''
                                        }`}
                                >
                                    <td
                                        className={`px-4 py-4 font-bold max-w-[200px] border-l-4 ${guess.is_penance ? 'border-l-amber-400' : 'border-black/50'
                                            } ${getResultColorClass(guess.correct ? 'correct' : 'incorrect', undefined, colorblindMode)}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {enemy && (
                                                <EnemyIcon icons={enemy.icon} size={32} className="shrink-0" />
                                            )}
                                            <div className="flex items-center truncate">
                                                <StatusIcon
                                                    result={guess.correct ? 'correct' : 'incorrect'}
                                                    enabled={colorblindMode}
                                                />
                                                <span className="truncate">{guess.enemy_name}</span>
                                            </div>
                                            {guess.is_penance && (
                                                <span className="ml-auto shrink-0 text-[9px] font-bold text-amber-400 border border-amber-400/50 rounded px-1">
                                                    P
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    <td
                                        className={`px-4 py-4 font-bold border-l-4 border-black/50 ${getResultColorClass(
                                            guess.properties.enemy_type.value
                                                ? guess.properties.enemy_type.result
                                                : 'gray',
                                            undefined,
                                            colorblindMode
                                        )}`}
                                    >
                                        <div className="flex items-center">
                                            <StatusIcon
                                                result={guess.properties.enemy_type.result}
                                                enabled={colorblindMode && !isValueEclipsed(guess.properties.enemy_type.value)}
                                            />
                                            {!isValueEclipsed(guess.properties.enemy_type.value)
                                                ? guess.properties.enemy_type.value
                                                : '[ECLIPSED]'}
                                        </div>
                                    </td>

                                    <td
                                        className={`px-4 py-4 font-bold border-l-4 border-black/50 ${getResultColorClass(
                                            guess.properties.weight_class.value
                                                ? guess.properties.weight_class.result
                                                : 'gray',
                                            undefined,
                                            colorblindMode
                                        )}`}
                                    >
                                        <div className="flex items-center">
                                            <StatusIcon
                                                result={guess.properties.weight_class.result}
                                                enabled={colorblindMode && !!guess.properties.weight_class.value}
                                            />
                                            {!isValueEclipsed(guess.properties.weight_class.value)
                                                ? guess.properties.weight_class.value
                                                : '[ECLIPSED]'}
                                        </div>
                                    </td>

                                    <td
                                        className={`px-4 py-4 font-bold border-l-4 border-black/50 ${getResultColorClass(
                                            guess.properties.health.value !== undefined
                                                ? guess.properties.health.result
                                                : 'gray',
                                            guess.properties.health.value !== undefined
                                                ? guess.properties.health.color
                                                : undefined,
                                            colorblindMode
                                        )}`}
                                    >
                                        <div className="flex items-center gap-2 h-full">
                                            <StatusIcon
                                                result={guess.properties.health.result}
                                                color={guess.properties.health.color}
                                                enabled={colorblindMode && !isValueEclipsed(guess.properties.health.value)}
                                            />
                                            {!isValueEclipsed(guess.properties.health.value)
                                                ? guess.properties.health.value
                                                : '[ECLIPSED]'}
                                            {!isValueEclipsed(guess.properties.health.value) &&
                                                guess.properties.health.result === 'higher' && (
                                                    <span className="text-lg">▲</span>
                                                )}
                                            {!isValueEclipsed(guess.properties.health.value) &&
                                                guess.properties.health.result === 'lower' && (
                                                    <span className="text-lg">▼</span>
                                                )}
                                        </div>
                                    </td>

                                    <td
                                        className={`px-4 py-4 font-bold border-l-4 border-black/50 ${getResultColorClass(
                                            !isValueEclipsed(guess.properties.level_count.value)
                                                ? guess.properties.level_count.result
                                                : 'gray',
                                            !isValueEclipsed(guess.properties.level_count.value)
                                                ? guess.properties.level_count.color
                                                : undefined,
                                            colorblindMode
                                        )}`}
                                    >
                                        <div className="flex items-center gap-2 h-full">
                                            <StatusIcon
                                                result={guess.properties.level_count.result}
                                                color={guess.properties.level_count.color}
                                                enabled={
                                                    colorblindMode && !isValueEclipsed(guess.properties.level_count.value)
                                                }
                                            />
                                            {!isValueEclipsed(guess.properties.level_count.value)
                                                ? guess.properties.level_count.value
                                                : '[ECLIPSED]'}
                                            {!isValueEclipsed(guess.properties.level_count.value) &&
                                                guess.properties.level_count.result === 'higher' && (
                                                    <span className="text-lg">▲</span>
                                                )}
                                            {!isValueEclipsed(guess.properties.level_count.value) &&
                                                guess.properties.level_count.result === 'lower' && (
                                                    <span className="text-lg">▼</span>
                                                )}
                                        </div>
                                    </td>

                                    <td
                                        className={`px-4 py-4 font-bold border-l-4 border-black/50 ${getResultColorClass(
                                            guess.properties.appearance.value
                                                ? guess.properties.appearance.result
                                                : 'gray',
                                            guess.properties.appearance.value
                                                ? guess.properties.appearance.color
                                                : undefined,
                                            colorblindMode
                                        )}`}
                                    >
                                        <div className="flex items-center gap-2 h-full">
                                            <StatusIcon
                                                result={guess.properties.appearance.result}
                                                color={guess.properties.appearance.color}
                                                enabled={colorblindMode && !!guess.properties.appearance.value}
                                            />
                                            {guess.properties.appearance.value &&
                                                guess.properties.appearance.result === 'earlier' && (
                                                    <span className="text-lg">◄</span>
                                                )}
                                            {!isValueEclipsed(guess.properties.appearance.value)
                                                ? guess.properties.appearance.value
                                                : '[ECLIPSED]'}
                                            {guess.properties.appearance.value &&
                                                guess.properties.appearance.result === 'later' && (
                                                    <span className="text-lg">►</span>
                                                )}
                                        </div>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </AnimatePresence>
                    {guesses.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-white/30 italic">
                                NO GUESSES YET...
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
