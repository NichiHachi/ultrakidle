import { useState, useRef, useEffect } from 'react';
import { enemies } from '../../lib/enemy_list';
import { EnemyIcon } from './EnemyIcon';

interface EnemySearchProps {
    onGuess: (enemyId: number) => void;
    disabled?: boolean;
    excludeIds?: number[];
}

export const EnemySearch = ({ onGuess, disabled = false, excludeIds = [] }: EnemySearchProps) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const sortedEnemies = [...enemies].sort((a, b) => a.name.localeCompare(b.name));

    const filteredEnemies = sortedEnemies.filter(enemy =>
        enemy.name.toLowerCase().includes(query.toLowerCase()) &&
        !excludeIds.includes(enemy.id)
    );

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (enemyId: number) => {
        setQuery('');
        setIsOpen(false);
        onGuess(enemyId);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && filteredEnemies.length === 1) {
            handleSelect(filteredEnemies[0].id);
        }
    };

    return (
        <div ref={wrapperRef} className="relative lg:text-xl text-base lg:w-1/2 w-full z-50">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder="ENTER ENEMY DESIGNATION..."
                    className="w-full bg-black border-2 border-white/20 p-3 text-white uppercase font-bold focus:outline-none focus:border-red-500 transition-colors disabled:opacity-50"
                />
            </div>

            {isOpen && (
                <ul className="absolute top-full left-0 w-full mt-1 bg-black border-2 border-white/20 max-h-60 overflow-y-auto">
                    {filteredEnemies.length > 0 ? (
                        filteredEnemies.map(enemy => (
                            <li
                                key={enemy.id}
                                onClick={() => handleSelect(enemy.id)}
                                className="p-3 hover:bg-white/10 cursor-pointer uppercase text-left border-b border-white/10 last:border-b-0 flex items-center gap-3"
                            >
                                <EnemyIcon icons={enemy.icon} size={24} />
                                <span>{enemy.name}</span>
                            </li>
                        ))
                    ) : (
                        <li className="p-3 text-white/50 text-left italic">NO MATCHING DESIGNATION...</li>
                    )}
                </ul>
            )}
        </div>
    );
};
