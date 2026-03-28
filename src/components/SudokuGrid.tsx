import React, { useMemo, useState, useEffect, useCallback } from "react";
import Cell from "./Cell";
import type { Board, NotesBoard, CellPosition } from "../utils/sudoku";

interface SudokuGridProps {
    board: Board;
    initialBoard: Board;
    notes: NotesBoard;
    notesMode: boolean;
    notesDisabled?: boolean;
    heatmap?: number[][];
    heatmapEnabled?: boolean;
    selectionStart: CellPosition | null;
    selectionEnd: CellPosition | null;
    conflicts: Set<string>;
    wrongCells: Set<string>;
    hintCell: CellPosition | null;
    onSelectionStart: (cell: CellPosition | null) => void;
    onSelectionUpdate: (cell: CellPosition | null) => void;
}

const SudokuGrid: React.FC<SudokuGridProps> = ({
    board,
    initialBoard,
    notes,
    notesMode,
    notesDisabled = false,
    heatmap,
    heatmapEnabled = false,
    selectionStart,
    selectionEnd,
    conflicts,
    wrongCells,
    hintCell,
    onSelectionStart,
    onSelectionUpdate,
}) => {
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        const handlePointerUp = () => setIsDragging(false);
        window.addEventListener("pointerup", handlePointerUp);
        return () => window.removeEventListener("pointerup", handlePointerUp);
    }, []);

    const handleCellPointerDown = useCallback(
        (row: number, col: number) => {
            setIsDragging(true);
            onSelectionStart({ row, col });
        },
        [onSelectionStart],
    );

    const handleCellPointerEnter = useCallback(
        (row: number, col: number) => {
            if (isDragging) {
                onSelectionUpdate({ row, col });
            }
        },
        [isDragging, onSelectionUpdate],
    );

    // Derived selection bounding box
    const selectionBounds = useMemo(() => {
        if (!selectionStart || !selectionEnd) return null;
        return {
            minRow: Math.min(selectionStart.row, selectionEnd.row),
            maxRow: Math.max(selectionStart.row, selectionEnd.row),
            minCol: Math.min(selectionStart.col, selectionEnd.col),
            maxCol: Math.max(selectionStart.col, selectionEnd.col),
        };
    }, [selectionStart, selectionEnd]);

    // Calculate which cells to highlight
    const highlightedCells = useMemo(() => {
        const set = new Set<string>();
        if (!selectionBounds) return set;

        const { minRow, maxRow, minCol, maxCol } = selectionBounds;

        // Highlight entire rows
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = 0; c < 9; c++) set.add(`${r},${c}`);
        }
        // Highlight entire columns
        for (let c = minCol; c <= maxCol; c++) {
            for (let r = 0; r < 9; r++) set.add(`${r},${c}`);
        }
        // Highlight 3x3 boxes
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                const boxRow = Math.floor(r / 3) * 3;
                const boxCol = Math.floor(c / 3) * 3;
                for (let br = boxRow; br < boxRow + 3; br++) {
                    for (let bc = boxCol; bc < boxCol + 3; bc++) {
                        set.add(`${br},${bc}`);
                    }
                }
            }
        }

        return set;
    }, [selectionBounds]);

    // Same number highlighting (only if single cell selected to avoid noise)
    const sameNumberCells = useMemo(() => {
        const set = new Set<string>();
        if (!selectionBounds) return set;

        // Only highlight same numbers if exactly 1 cell is selected
        if (
            selectionBounds.minRow !== selectionBounds.maxRow ||
            selectionBounds.minCol !== selectionBounds.maxCol
        ) {
            return set;
        }

        const { minRow, minCol } = selectionBounds;
        const selectedValue = board[minRow][minCol];
        if (selectedValue === null) return set;

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === selectedValue) {
                    set.add(`${r},${c}`);
                }
            }
        }
        return set;
    }, [selectionBounds, board]);

    const heatMax = useMemo(() => {
        if (!heatmapEnabled || !heatmap) return 0;
        let max = 0;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                max = Math.max(max, heatmap[r][c]);
            }
        }
        return max;
    }, [heatmapEnabled, heatmap]);

    return (
        <div className="inline-block border-4 border-gray-900 overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-gray-900">
            <div
                className="grid grid-cols-3 gap-1.5 bg-gray-900"
                style={{
                    width: "min(95vw, 450px)",
                    height: "min(95vw, 450px)",
                }}
            >
                {Array.from({ length: 9 }).map((_, boxIndex) => {
                    const boxRow = Math.floor(boxIndex / 3) * 3;
                    const boxCol = (boxIndex % 3) * 3;

                    const isMultiSelect =
                        selectionBounds !== null &&
                        (selectionBounds.minRow !== selectionBounds.maxRow ||
                            selectionBounds.minCol !== selectionBounds.maxCol);

                    return (
                        <div
                            key={boxIndex}
                            className="grid grid-cols-3 gap-px bg-gray-900"
                        >
                            {Array.from({ length: 9 }).map((_, cellIndex) => {
                                const r = boxRow + Math.floor(cellIndex / 3);
                                const c = boxCol + (cellIndex % 3);
                                const value = board[r][c];
                                const key = `${r},${c}`;
                                const isSelected =
                                    selectionBounds !== null &&
                                    r >= selectionBounds.minRow &&
                                    r <= selectionBounds.maxRow &&
                                    c >= selectionBounds.minCol &&
                                    c <= selectionBounds.maxCol;
                                const isGiven = initialBoard[r][c] !== null;

                                return (
                                    <div
                                        key={key}
                                        className="relative flex bg-amber-50 touch-none"
                                    >
                                        <div className="w-full h-full">
                                            <Cell
                                                row={r}
                                                col={c}
                                                value={value}
                                                notes={notes[r][c]}
                                                notesMode={
                                                    notesMode || isMultiSelect
                                                }
                                                notesDisabled={notesDisabled}
                                                heat={
                                                    heatmapEnabled && heatmap
                                                        ? heatmap[r][c]
                                                        : 0
                                                }
                                                heatMax={heatMax}
                                                heatmapEnabled={heatmapEnabled}
                                                isGiven={isGiven}
                                                isSelected={isSelected}
                                                isHighlighted={highlightedCells.has(
                                                    key,
                                                )}
                                                isSameNumber={
                                                    sameNumberCells.has(key) &&
                                                    !isSelected
                                                }
                                                isConflict={conflicts.has(key)}
                                                isWrong={wrongCells.has(key)}
                                                isHinted={
                                                    hintCell?.row === r &&
                                                    hintCell?.col === c
                                                }
                                                onPointerDown={() =>
                                                    handleCellPointerDown(r, c)
                                                }
                                                onPointerEnter={() =>
                                                    handleCellPointerEnter(r, c)
                                                }
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default React.memo(SudokuGrid);
