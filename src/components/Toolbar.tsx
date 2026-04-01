import React from "react";
import type { Difficulty } from "../utils/sudoku";

interface ToolbarProps {
    difficulty: Difficulty;
    timer: number;
    mistakes: number;
    maxMistakes: number;
    bestTime: number | null;
    hideMistakes?: boolean;
    isPaused: boolean;
    onTogglePause: () => void;
    onNewGame: (difficulty: Difficulty) => void;
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const DIFFICULTIES: { value: Difficulty; label: string; color: string }[] = [
    { value: "easy", label: "Easy", color: "bg-emerald-500" },
    { value: "medium", label: "Medium", color: "bg-amber-500" },
    { value: "hard", label: "Hard", color: "bg-orange-500" },
    { value: "expert", label: "Expert", color: "bg-red-500" },
    { value: "expert_plus", label: "Expert+", color: "bg-gray-900" },
];

const Toolbar: React.FC<ToolbarProps> = ({
    difficulty,
    timer,
    mistakes,
    maxMistakes,
    bestTime,
    hideMistakes = false,
    isPaused,
    onTogglePause,
    onNewGame,
}) => {
    return (
        <div className="flex flex-col gap-3 w-full">
            {/* Difficulty selector */}
            <div className="grid grid-cols-5 gap-2">
                {DIFFICULTIES.map((d) => (
                    <button
                        key={d.value}
                        onClick={() => onNewGame(d.value)}
                        className={`relative py-2 px-1 text-xs sm:text-sm font-bold transition-all duration-100 cursor-pointer border-2 border-gray-900 ${
                            difficulty === d.value
                                ? `${d.color} text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-x-px -translate-y-px`
                                : "bg-amber-50 text-gray-700 hover:bg-gray-50 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-px hover:-translate-y-px"
                        } active:shadow-none active:translate-x-0 active:translate-y-0`}
                    >
                        {difficulty === d.value && (
                            <span
                                className={`absolute top-1 right-1 w-1.5 h-1.5 ${d.color} border border-white rounded-full`}
                            />
                        )}
                        {d.label}
                    </button>
                ))}
            </div>

            {/* Stats bar */}
            <div className="flex items-center justify-between bg-amber-50 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 gap-3">
                {/* Timer */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onTogglePause}
                        className="w-7 h-7 flex items-center justify-center bg-blue-50 border-2 border-transparent hover:border-gray-900 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-px hover:-translate-x-px transition-all cursor-pointer"
                        title={isPaused ? "Resume game" : "Pause game"}
                    >
                        {isPaused ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600">
                                <rect x="6" y="4" width="4" height="16"></rect>
                                <rect x="14" y="4" width="4" height="16"></rect>
                            </svg>
                        )}
                    </button>
                    <span className="text-xl font-black text-gray-900 tabular-nums tracking-tight leading-none">
                        {formatTime(timer)}
                    </span>
                </div>

                {!hideMistakes && (
                    <>
                        {/* Divider */}
                        <div className="w-px h-8 bg-gray-200" />

                        {/* Mistakes */}
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 leading-none mb-1">
                                Mistakes
                            </span>
                            <div className="flex gap-1 items-center">
                                {Array.from({ length: maxMistakes }).map(
                                    (_, i) => (
                                        <div
                                            key={i}
                                            className={`w-3 h-3 border-2 border-gray-900 transition-colors ${
                                                i < mistakes
                                                    ? "bg-red-500"
                                                    : "bg-amber-50"
                                            }`}
                                        />
                                    ),
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Divider */}
                {bestTime !== null && <div className="w-px h-8 bg-gray-200" />}

                {/* Best time */}
                {bestTime !== null && (
                    <div className="flex items-center gap-1.5">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="text-amber-400"
                        >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 leading-none">
                                Best
                            </span>
                            <span className="text-sm font-black text-gray-900 tabular-nums">
                                {formatTime(bestTime)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(Toolbar);
