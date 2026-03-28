import React from "react";
import type { HintResult } from "../utils/sudoku";

interface HintPanelProps {
    hint: HintResult | null;
    hintRevealed: boolean;
    onReveal: () => void;
    onDismiss: () => void;
}

const HintPanel: React.FC<HintPanelProps> = ({
    hint,
    hintRevealed,
    onReveal,
    onDismiss,
}) => {
    if (!hint) return null;

    return (
        <div className="animate-fade-in-up w-full border-2 border-gray-900 bg-amber-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50-400 border-b-2 border-gray-900">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-900"
                >
                    <path d="M9 18h6" />
                    <path d="M10 22h4" />
                    <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 01-1 1h-6a1 1 0 01-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" />
                </svg>
                <span className="text-xs font-black uppercase tracking-widest text-gray-900">
                    Smart Hint
                </span>
            </div>

            {/* Body */}
            <div className="px-4 py-3 flex items-start justify-between gap-4">
                <p className="text-sm text-gray-700 leading-relaxed flex-1">
                    {hint.message}
                </p>
                <div className="flex gap-2 shrink-0 pt-0.5">
                    {!hintRevealed && (
                        <button
                            onClick={onReveal}
                            className="text-xs font-black text-gray-900 bg-amber-50-300 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 px-3 py-1.5 transition-all cursor-pointer uppercase tracking-wide whitespace-nowrap"
                        >
                            Reveal
                        </button>
                    )}
                    <button
                        onClick={onDismiss}
                        className="text-xs font-black text-gray-900 bg-amber-50 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 px-3 py-1.5 transition-all cursor-pointer uppercase tracking-wide"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HintPanel;
