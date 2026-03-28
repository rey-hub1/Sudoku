import { useEffect, useCallback } from "react";
import { useGameState } from "./hooks/useGameState";
import SudokuGrid from "./components/SudokuGrid";
import NumberPad from "./components/NumberPad";
import Toolbar from "./components/Toolbar";
import HintPanel from "./components/HintPanel";
import VictoryModal from "./components/VictoryModal";
import GameOverModal from "./components/GameOverModal";

function App() {
    const { state, actions } = useGameState();

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (state.isComplete || state.isGameOver) return;

            const num = parseInt(e.key);
            if (num >= 1 && num <= 9) {
                actions.inputNumber(num);
            } else if (e.key === "Backspace" || e.key === "Delete") {
                actions.eraseCell();
            } else if (e.key === "n" || e.key === "N") {
                actions.toggleNotesMode();
            } else if (
                (e.key === "z" || e.key === "Z") &&
                (e.metaKey || e.ctrlKey)
            ) {
                e.preventDefault();
                actions.undo();
            } else if (e.key === "ArrowUp" && state.selectionStart) {
                e.preventDefault();
                const newRow = Math.max(0, state.selectionStart.row - 1);
                actions.startSelection({
                    row: newRow,
                    col: state.selectionStart.col,
                });
            } else if (e.key === "ArrowDown" && state.selectionStart) {
                e.preventDefault();
                const newRow = Math.min(8, state.selectionStart.row + 1);
                actions.startSelection({
                    row: newRow,
                    col: state.selectionStart.col,
                });
            } else if (e.key === "ArrowLeft" && state.selectionStart) {
                e.preventDefault();
                const newCol = Math.max(0, state.selectionStart.col - 1);
                actions.startSelection({
                    row: state.selectionStart.row,
                    col: newCol,
                });
            } else if (e.key === "ArrowRight" && state.selectionStart) {
                e.preventDefault();
                const newCol = Math.min(8, state.selectionStart.col + 1);
                actions.startSelection({
                    row: state.selectionStart.row,
                    col: newCol,
                });
            }
        },
        [state.isComplete, state.isGameOver, state.selectionStart, actions],
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div className="min-h-screen bg-amber-50 flex flex-col items-center px-4 pt-6 sm:pt-10 pb-20 sm:pb-10 gap-6">
            {/* Header */}
            <header className="mb-6 sm:mb-8 text-center pb-10">
                <div className="flex items-center justify-center gap-3 mb-1 pb-10">
                    {/* Sudoku logo grid icon */}
                    <div className="w-9 h-9 grid grid-cols-3 grid-rows-3 gap-0.5 border-2 border-gray-900 bg-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        {[...Array(9)].map((_, i) => (
                            <div
                                key={i}
                                className={
                                    i % 2 === 0 || i === 4
                                        ? "bg-blue-600"
                                        : "bg-white"
                                }
                            />
                        ))}
                    </div>
                    <h1
                        className="text-4xl sm:text-5xl font-black tracking-tighter text-gray-900"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        SUDOKU
                    </h1>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mt-1">
                    Logic Puzzle Game
                </p>
            </header>

            {/* Main game area */}
            <main className="flex flex-col items-center gap-4 sm:gap-5 w-full max-w-120">
                {/* Toolbar */}
                <Toolbar
                    difficulty={state.difficulty}
                    timer={state.timer}
                    mistakes={state.mistakes}
                    maxMistakes={state.maxMistakes}
                    bestTime={state.bestTimes[state.difficulty]}
                    onNewGame={actions.newGame}
                />

                {/* Grid */}
                {state.isGenerating ? (
                    <div className="w-full aspect-square max-w-125 flex items-center justify-center bg-white border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex flex-col items-center gap-6">
                            <div className="w-16 h-16 border-8 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                            <span className="font-black text-2xl tracking-tighter text-gray-900 animate-pulse">GENERATING...</span>
                        </div>
                    </div>
                ) : (
                    <SudokuGrid
                        board={state.board}
                        initialBoard={state.initialBoard}
                        notes={state.notes}
                        notesMode={state.notesMode}
                        selectionStart={state.selectionStart}
                        selectionEnd={state.selectionEnd}
                        conflicts={state.conflicts}
                        wrongCells={state.wrongCells}
                        hintCell={state.hint?.cell ?? null}
                        onSelectionStart={actions.startSelection}
                        onSelectionUpdate={actions.updateSelection}
                    />
                )}

                {/* Hint Panel */}
                <HintPanel
                    hint={state.hint}
                    hintRevealed={state.hintRevealed}
                    onReveal={actions.requestHint}
                    onDismiss={() => actions.startSelection(null)}
                />

                {/* Number Pad */}
                <NumberPad
                    board={state.board}
                    notesMode={state.notesMode}
                    onNumber={actions.inputNumber}
                    onErase={actions.eraseCell}
                    onToggleNotes={actions.toggleNotesMode}
                    onUndo={actions.undo}
                    onHint={actions.requestHint}
                    disabled={state.isComplete || state.isGameOver}
                    showUndo={state.difficulty === "easy"}
                />
            </main>

            {/* Spacer between game and footer */}
            <div className="w-full h-12 sm:h-16 shrink-0" />

            {/* Footer */}
            <footer className="w-full max-w-120 text-center mb-8 sm:mb-12">
                <div className="flex items-center justify-center gap-x-6 gap-y-4 flex-wrap">
                    {[
                        { keys: "1–9", label: "Input" },
                        { keys: "N", label: "Notes" },
                        { keys: "←→↑↓", label: "Move" },
                        { keys: "⌘Z", label: "Undo" },
                    ].map(({ keys, label }) => (
                        <div
                            key={label}
                            className="flex items-center gap-1.5 whitespace-nowrap"
                        >
                            <kbd className="px-2 py-1 bg-white border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[10px] sm:text-xs font-mono font-black text-gray-900">
                                {keys}
                            </kbd>
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400">
                                {label}
                            </span>
                        </div>
                    ))}
                </div>
            </footer>

            {/* Modals */}
            {state.isComplete && (
                <VictoryModal
                    timer={state.timer}
                    mistakes={state.mistakes}
                    difficulty={state.difficulty}
                    bestTime={state.bestTimes[state.difficulty]}
                    onNewGame={() => actions.newGame()}
                />
            )}

            {state.isGameOver && (
                <GameOverModal
                    onRestart={actions.restartGame}
                    onNewGame={() => actions.newGame()}
                />
            )}
        </div>
    );
}

export default App;
