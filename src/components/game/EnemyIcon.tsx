import { resolveExternalUrl } from '../../lib/urls';

interface EnemyIconProps {
    icons: string[];
    size?: number | string;
    isSpawn?: boolean;
    className?: string;
}

export const EnemyIcon = ({ icons, size = 40, isSpawn = false, className = '' }: EnemyIconProps) => {
    if (!icons || icons.length === 0) return null;

    const actualSize = isSpawn ? (typeof size === 'number' ? size / 2 : `calc(${size} / 2)`) : size;

    if (icons.length === 1) {
        return (
            <div
                className={`flex items-center justify-center ${className}`}
                style={{ width: size, height: size }}
            >
                <img
                    src={resolveExternalUrl(icons[0])}
                    alt="Enemy Icon"
                    style={{ width: actualSize, height: actualSize }}
                    className="object-contain"
                />
            </div>
        );
    }

    // Dual icon support with diagonal split
    return (
        <div
            className={`relative overflow-hidden ${className}`}
            style={{ width: size, height: size }}
        >
            <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ scale: isSpawn ? '0.5' : '1' }}
            >
                <img
                    src={resolveExternalUrl(icons[0])}
                    alt="Enemy Icon 1"
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
                />
                <img
                    src={resolveExternalUrl(icons[1])}
                    alt="Enemy Icon 2"
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                />
            </div>
        </div>
    );
};
