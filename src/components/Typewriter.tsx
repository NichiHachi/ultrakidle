import { motion } from 'framer-motion';

interface TypewriterSegment {
    text: string;
    className?: string;
};

interface TypewriterProps {
    text?: string;
    segments?: TypewriterSegment[];
    delay?: number;
    onComplete?: () => void;
    className?: string;
    speed?: number;
}

export const Typewriter = ({ text = '', segments, delay = 0, onComplete, className = '', speed = 0.03 }: TypewriterProps) => {
    const definedSegments = segments ?? [{ text, className: '' }];

    const characters = definedSegments.flatMap((segment) =>
        segment.text.split('').map((char) => ({
            char,
            className: segment.className || '',
        }))
    );

    const container = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: speed,
                delayChildren: delay,
            },
        },
    };

    const child = {
        visible: {
            opacity: 1,
            transition: {
                duration: 0,
            },
        },
        hidden: {
            opacity: 0,
        },
    };

    return (
        <motion.div
            style={{ overflow: "hidden", display: "flex", flexWrap: "wrap" }}
            variants={container}
            initial="hidden"
            animate="visible"
            className={className}
            onAnimationComplete={onComplete}
        >
            {characters.map((char, index) => (
                <motion.span variants={child} key={index} className={char.className}>
                    {char.char === " " ? "\u00A0" : char.char}
                </motion.span>
            ))}
        </motion.div>
    );
};
