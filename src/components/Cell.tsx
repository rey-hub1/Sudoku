import React from "react";

interface CellProps {
    row: number;
    col: number;
    value: number | null;
    notes: Set<number>;
    soloNotes: Set<number>;
    notesMode: boolean;
    notesDisabled?: boolean;
    isGiven: boolean;
    isSelected: boolean;
    isHighlighted: boolean;
    isSameNumber: boolean;
    isConflict: boolean;
    isWrong: boolean;
    isHinted: boolean;
    onPointerDown: () => void;
    onPointerEnter: () => void;
}

const Cell: React.FC<CellProps> = ({
    row,
    col,
    value,
    notes,
    soloNotes,
    notesMode,
    notesDisabled = false,
    isGiven,
    isSelected,
    isHighlighted,
    isSameNumber,
    isConflict,
    isWrong,
    isHinted,
    onPointerDown,
    onPointerEnter,
}) => {
    // Determine background
    let bgClass = "bg-amber-50";

    if (isHinted) {
        bgClass = "bg-amber-50/50";
    } else if (isSelected) {
        bgClass = notesMode
            ? "bg-yellow-100 shadow-[inset_0_0_0_2px_#ca8a04] "
            : "bg-blue-200";
    } else if (isSameNumber) {
        bgClass = "bg-blue-100";
    } else if (isHighlighted) {
        bgClass = "bg-slate-200";
    }

    // Determine text color
    let textClass = "text-gray-800";
    const hasError = isConflict || isWrong;

    // The text color remains exactly the same whether selected or not!
    if (isGiven) {
        textClass = "text-gray-900 font-black";
    } else if (value !== null) {
        textClass = hasError
            ? "text-red-600 font-black"
            : "text-blue-600 font-black";
    } else if (isHinted) {
        textClass = "text-amber-600 font-black";
    }

    return (
        <button
            onPointerDown={(e) => {
                // Only trigger on left-click or touch, ignore right-click
                if (e.button === 0 || e.pointerType === "touch") {
                    onPointerDown();
                }
            }}
            onPointerEnter={onPointerEnter}
            className={`
        relative w-full aspect-square flex items-center justify-center
        text-lg sm:text-xl cursor-pointer select-none
        transition-colors duration-75
        ${bgClass} ${textClass}
        ${!isSelected ? "hover:bg-blue-50" : ""}
        ${isSelected ? "ring-2 ring-blue-700 ring-inset z-10" : ""}
        ${isHinted ? "ring-2 ring-amber-400 ring-inset z-10" : ""}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-inset
      `}
            aria-label={`Row ${row + 1}, Column ${col + 1}, value ${value || "empty"}`}
        >
            {value !== null ? (
                <span className="leading-none relative z-10">{value}</span>
            ) : !notesDisabled && notes.size > 0 ? (
                <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-[1px] sm:p-[2px] relative z-10">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <span
                            key={n}
                            className={`flex items-center justify-center text-[7px] sm:text-[9px] leading-none transition-colors duration-200 ${
                                notes.has(n)
                                    ? soloNotes.has(n)
                                        ? "font-black text-blue-950 drop-shadow-[0_0_3px_rgba(30,58,138,0.5)]"
                                        : isSelected
                                          ? notesMode
                                              ? "font-bold text-gray-900"
                                              : "font-bold text-blue-800"
                                          : "font-bold text-blue-500"
                                    : "font-bold text-transparent"
                            }`}
                        >
                            {n}
                        </span>
                    ))}
                </div>
            ) : null}
        </button>
    );
};

export default React.memo(Cell);
