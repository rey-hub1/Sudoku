import React, { useMemo } from "react";
import type { Board } from "../utils/sudoku";

interface NumberPadProps {
    board: Board;
    notesMode: boolean;
    onNumber: (num: number) => void;
    onErase: () => void;
    onToggleNotes: () => void;
    onUndo: () => void;
    onHint: () => void;
    disabled: boolean;
    showUndo: boolean;
}

const ActionBtn: React.FC<{
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
    children: React.ReactNode;
    label: string;
    color?: "default" | "amber" | "blue";
}> = ({
    onClick,
    disabled = false,
    active = false,
    children,
    label,
    color = "default",
}) => {
    const base =
        "flex flex-col items-center justify-center gap-1 py-2.5 px-2 border-2 border-gray-900 font-bold transition-all duration-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none";
    const colorMap = {
        default: active
            ? "bg-gray-900 text-white shadow-none"
            : "bg-amber-50 text-gray-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 active:shadow-none active:translate-x-0.5 active:translate-y-0.5",
        blue: active
            ? "bg-blue-600 text-white border-blue-900 shadow-none"
            : "bg-amber-50 text-blue-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-50 active:shadow-none active:translate-x-0.5 active:translate-y-0.5",
        amber: "bg-amber-50 text-amber-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-50-50 active:shadow-none active:translate-x-0.5 active:translate-y-0.5",
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${base} ${colorMap[color]}`}
        >
            {children}
            <span className="text-[10px] font-bold leading-none uppercase tracking-wide">
                {label}
            </span>
        </button>
    );
};

const NumberPad: React.FC<NumberPadProps> = ({
    board,
    notesMode,
    onNumber,
    onErase,
    onToggleNotes,
    onUndo,
    onHint,
    disabled,
    showUndo,
}) => {
    const numberCounts = useMemo(() => {
        const counts: Record<number, number> = {};
        for (let n = 1; n <= 9; n++) counts[n] = 0;
        for (const row of board) {
            for (const val of row) {
                if (val !== null) counts[val]++;
            }
        }
        return counts;
    }, [board]);

    return (
        <div className="flex flex-col gap-3 w-full">
            {/* Action buttons */}
            <div
                className={`grid gap-2 ${showUndo ? "grid-cols-4" : "grid-cols-3"}`}
            >
                {showUndo && (
                    <ActionBtn
                        onClick={onUndo}
                        disabled={disabled}
                        label="Undo"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M3 7v6h6" />
                            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
                        </svg>
                    </ActionBtn>
                )}
                <ActionBtn onClick={onErase} disabled={disabled} label="Erase">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M20 5H9l-7 7 7 7h11a2 2 0 002-2V7a2 2 0 00-2-2z" />
                        <line x1="18" y1="9" x2="12" y2="15" />
                        <line x1="12" y1="9" x2="18" y2="15" />
                    </svg>
                </ActionBtn>
                <ActionBtn
                    onClick={onToggleNotes}
                    disabled={disabled}
                    active={notesMode}
                    color="blue"
                    label="Notes"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                </ActionBtn>
                <ActionBtn
                    onClick={onHint}
                    disabled={disabled}
                    color="amber"
                    label="Hint"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M9 18h6" />
                        <path d="M10 22h4" />
                        <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 01-1 1h-6a1 1 0 01-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" />
                    </svg>
                </ActionBtn>
            </div>

            {/* Number buttons */}
            <div className="grid grid-cols-9 gap-1 sm:gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                    const count = numberCounts[num];
                    const isComplete = count >= 9;
                    const remaining = 9 - count;
                    return (
                        <button
                            key={num}
                            onClick={() => onNumber(num)}
                            disabled={disabled || isComplete}
                            className={`
                relative aspect-square flex flex-col items-center justify-center border-2 border-gray-900 transition-all duration-100 cursor-pointer select-none
                ${
                    isComplete
                        ? "bg-gray-100 text-gray-300 cursor-not-allowed translate-x-0.5 translate-y-0.5 border-gray-300"
                        : "bg-blue-600 text-white shadow-[2px_2px_0px_1px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-500 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 sm:active:translate-x-1 sm:active:translate-y-1"
                }
                disabled:cursor-not-allowed
              `}
                        >
                            <span className="text-lg sm:text-2xl font-black leading-none">
                                {num}
                            </span>
                            {!isComplete && (
                                <span
                                    className={`text-[6px] sm:text-[7px] font-bold leading-none mt-0.5 ${remaining <= 2 ? "text-blue-200" : "text-blue-300"}`}
                                >
                                    {remaining}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default React.memo(NumberPad);
