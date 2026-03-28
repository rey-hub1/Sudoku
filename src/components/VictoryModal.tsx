import React, { useEffect, useState } from "react";
import type { Difficulty } from "../utils/sudoku";

interface VictoryModalProps {
    timer: number;
    mistakes: number;
    difficulty: Difficulty;
    bestTime: number | null;
    onNewGame: () => void;
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const CONFETTI_COLORS = [
    "#2563eb",
    "#3b82f6",
    "#60a5fa",
    "#93c5fd",
    "#f59e0b",
    "#f97316",
    "#ef4444",
    "#10b981",
    "#8b5cf6",
    "#ec4899",
];

const DIFFICULTY_STARS: Record<Difficulty, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
    expert: 4,
};

const VictoryModal: React.FC<VictoryModalProps> = ({
    timer,
    mistakes,
    difficulty,
    bestTime,
    onNewGame,
}) => {
    const [confettiPieces, setConfettiPieces] = useState<
        { left: string; color: string; delay: string; size: number }[]
    >([]);

    useEffect(() => {
        const pieces = Array.from({ length: 60 }, () => ({
            left: `${Math.random() * 100}%`,
            color: CONFETTI_COLORS[
                Math.floor(Math.random() * CONFETTI_COLORS.length)
            ],
            delay: `${Math.random() * 2}s`,
            size: Math.random() * 10 + 6,
        }));
        setConfettiPieces(pieces);
    }, []);

    const isNewBest = bestTime !== null && timer <= bestTime;
    const stars = DIFFICULTY_STARS[difficulty];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Confetti */}
            {confettiPieces.map((piece, i) => (
                <div
                    key={i}
                    className="confetti-piece"
                    style={{
                        left: piece.left,
                        backgroundColor: piece.color,
                        animationDelay: piece.delay,
                        width: `${piece.size}px`,
                        height: `${piece.size}px`,
                        borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                    }}
                />
            ))}

            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal */}
            <div className="animate-pop-in relative bg-amber-50 border-4 border-gray-900 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] max-w-sm w-[90%]">
                {/* Header stripe */}
                <div className="bg-blue-600 border-b-4 border-gray-900 px-8 py-5 text-center">
                    <div className="text-5xl mb-2">🏆</div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                        Puzzle Solved!
                    </h2>
                    <p className="text-blue-200 text-sm font-medium mt-0.5">
                        Congratulations, genius!
                    </p>
                </div>

                {/* Body */}
                <div className="p-6">
                    {/* Stars for difficulty */}
                    <div className="flex items-center justify-center gap-1 mb-5">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <svg
                                key={i}
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill={i < stars ? "#f59e0b" : "none"}
                                stroke={i < stars ? "#f59e0b" : "#d1d5db"}
                                strokeWidth="2"
                            >
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                        ))}
                        <span className="ml-2 text-sm font-bold text-gray-500 capitalize">
                            {difficulty}
                        </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-gray-50 border-2 border-gray-900 p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                                Time
                            </p>
                            <p className="text-2xl font-black text-gray-900 tabular-nums">
                                {formatTime(timer)}
                            </p>
                        </div>
                        <div className="bg-gray-50 border-2 border-gray-900 p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                                Mistakes
                            </p>
                            <p className="text-2xl font-black text-gray-900">
                                {mistakes}
                            </p>
                        </div>
                    </div>

                    {isNewBest && (
                        <div className="mb-4 py-2.5 px-4 bg-amber-50-300 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
                            <span className="text-lg">⭐</span>
                            <p className="text-sm font-black text-gray-900">
                                New Personal Best!
                            </p>
                        </div>
                    )}

                    <button
                        onClick={onNewGame}
                        className="w-full py-3.5 bg-blue-600 text-white font-black text-base tracking-wide border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-700 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all cursor-pointer uppercase"
                    >
                        Play Again →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VictoryModal;
