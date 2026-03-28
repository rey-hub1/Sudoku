import { useEffect, useCallback, useState, useMemo } from "react";
import { useGameState } from "./hooks/useGameState";
import SudokuGrid from "./components/SudokuGrid";
import NumberPad from "./components/NumberPad";
import Toolbar from "./components/Toolbar";
import HintPanel from "./components/HintPanel";
import VictoryModal from "./components/VictoryModal";
import GameOverModal from "./components/GameOverModal";

function App() {
    const { state, actions } = useGameState();
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [theme, setTheme] = useState<"classic" | "forest" | "sunset">(() => {
        const saved = localStorage.getItem("sudoku-theme");
        if (saved === "forest" || saved === "sunset" || saved === "classic") {
            return saved;
        }
        return "classic";
    });

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (state.isComplete || state.isGameOver) return;

            const num = parseInt(e.key);
            if (num >= 1 && num <= 9) {
                actions.inputNumber(num);
            } else if (
                e.key === "Backspace" ||
                e.key === "Delete" ||
                e.key === "0" ||
                e.key === "."
            ) {
                actions.eraseCell();
            } else if (e.key === "n" || e.key === "N") {
                actions.toggleNotesMode();
            } else if (e.key === " " || e.key === "m" || e.key === "M") {
                e.preventDefault();
                actions.toggleNotesMode();
            } else if (
                (e.key === "z" || e.key === "Z") &&
                (e.metaKey || e.ctrlKey)
            ) {
                e.preventDefault();
                actions.undo();
            } else if (e.key === "Escape") {
                actions.startSelection(null);
            } else {
                const isUp = e.key === "ArrowUp" || e.key === "w" || e.key === "W";
                const isDown =
                    e.key === "ArrowDown" || e.key === "s" || e.key === "S";
                const isLeft =
                    e.key === "ArrowLeft" || e.key === "a" || e.key === "A";
                const isRight =
                    e.key === "ArrowRight" || e.key === "d" || e.key === "D";

                if (isUp || isDown || isLeft || isRight) {
                    e.preventDefault();
                    const deltaRow = isUp ? -1 : isDown ? 1 : 0;
                    const deltaCol = isLeft ? -1 : isRight ? 1 : 0;

                    if (!state.selectionStart) {
                        actions.startSelection({ row: 0, col: 0 });
                        return;
                    }

                    const base = e.shiftKey
                        ? state.selectionEnd ?? state.selectionStart
                        : state.selectionStart;

                    const newRow = Math.max(0, Math.min(8, base.row + deltaRow));
                    const newCol = Math.max(0, Math.min(8, base.col + deltaCol));

                    if (e.shiftKey) {
                        actions.updateSelection({ row: newRow, col: newCol });
                    } else {
                        actions.startSelection({ row: newRow, col: newCol });
                    }
                }
            }
        },
        [
            state.isComplete,
            state.isGameOver,
            state.selectionStart,
            state.selectionEnd,
            actions,
        ],
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        document.body.dataset.theme = theme;
        localStorage.setItem("sudoku-theme", theme);
    }, [theme]);

    const analytics = useMemo(() => {
        const moves = state.moveTimes.length;
        const avg =
            moves === 0
                ? 0
                : state.moveTimes.reduce((a, b) => a + b, 0) / moves;
        const last = moves === 0 ? 0 : state.moveTimes[moves - 1];
        return { moves, avg, last };
    }, [state.moveTimes]);

    const handleShare = useCallback(() => {
        const code = actions.getShareCode();
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(code).then(
                () => window.alert("Puzzle code copied to clipboard."),
                () => window.prompt("Copy this puzzle code:", code),
            );
        } else {
            window.prompt("Copy this puzzle code:", code);
        }
    }, [actions]);

    const handleLoad = useCallback(() => {
        const code = window.prompt("Paste puzzle code:");
        if (!code) return;
        const ok = actions.loadFromCode(code);
        if (!ok) {
            window.alert("Invalid puzzle code.");
        }
    }, [actions]);

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
                <div className="mt-4 flex items-center justify-center gap-2">
                    {[
                        { value: "classic", label: "Classic" },
                        { value: "forest", label: "Forest" },
                        { value: "sunset", label: "Sunset" },
                    ].map((t) => (
                        <button
                            key={t.value}
                            onClick={() =>
                                setTheme(t.value as "classic" | "forest" | "sunset")
                            }
                            className={`px-3 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider border-2 border-gray-900 transition-all ${
                                theme === t.value
                                    ? "bg-gray-900 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                    : "bg-amber-50 text-gray-700 hover:bg-gray-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Main game area */}
            <main className="flex flex-col items-center gap-4 sm:gap-5 w-full max-w-[480px]">
                {/* Toolbar */}
                <Toolbar
                    difficulty={state.difficulty}
                    timer={state.timer}
                    mistakes={state.mistakes}
                    maxMistakes={state.maxMistakes}
                    bestTime={state.bestTimes[state.difficulty]}
                    onNewGame={actions.newGame}
                />

                <div className="w-full flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={actions.startDailyChallenge}
                            className="px-3 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider border-2 border-gray-900 bg-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50"
                        >
                            Daily Challenge
                        </button>
                        <button
                            onClick={handleShare}
                            className="px-3 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider border-2 border-gray-900 bg-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50"
                        >
                            Share Code
                        </button>
                        <button
                            onClick={handleLoad}
                            className="px-3 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider border-2 border-gray-900 bg-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50"
                        >
                            Load Code
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowHeatmap((v) => !v)}
                            className={`px-3 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider border-2 border-gray-900 transition-all ${
                                showHeatmap
                                    ? "bg-gray-900 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                    : "bg-amber-50 text-gray-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            }`}
                        >
                            Heatmap
                        </button>
                        <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-500">
                            Streak: {state.dailyStreak}
                        </div>
                    </div>
                </div>

                {/* Grid */}
                {state.isGenerating ? (
                    <div className="w-full aspect-square max-w-[500px] flex items-center justify-center bg-white border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex flex-col items-center gap-6">
                            <div className="w-16 h-16 border-8 border-gray-200 border-t-gray-900 rounded-full"></div>
                            <span className="font-black text-2xl tracking-tighter text-gray-900">GENERATING...</span>
                        </div>
                    </div>
                ) : (
                    <SudokuGrid
                        board={state.board}
                        initialBoard={state.initialBoard}
                        notes={state.notes}
                        notesMode={state.notesMode}
                        notesDisabled={state.difficulty === "expert_plus"}
                        heatmap={state.heatmap}
                        heatmapEnabled={showHeatmap}
                        selectionStart={state.selectionStart}
                        selectionEnd={state.selectionEnd}
                        conflicts={
                            state.difficulty === "expert_plus"
                                ? new Set()
                            : state.conflicts
                    }
                    wrongCells={
                        state.difficulty === "expert_plus"
                            ? new Set()
                            : state.wrongCells
                    }
                    hintCell={state.hint?.cell ?? null}
                    onSelectionStart={actions.startSelection}
                    onSelectionUpdate={actions.updateSelection}
                />
                )}

                {/* Hint Panel */}
                <HintPanel
                    hint={state.hint}
                    hintStage={state.hintStage}
                    onReveal={actions.requestHint}
                    onDismiss={() => actions.startSelection(null)}
                />

                <div className="w-full border-2 border-gray-900 bg-amber-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-4 py-3 text-xs sm:text-sm font-bold text-gray-700 flex items-center justify-between">
                    <div>Moves: {analytics.moves}</div>
                    <div>Avg/Move: {analytics.avg.toFixed(1)}s</div>
                    <div>Last: {analytics.last.toFixed(1)}s</div>
                </div>

                {/* Number Pad */}
                <NumberPad
                    board={state.board}
                    solution={state.solution}
                    notesMode={state.notesMode}
                    onNumber={actions.inputNumber}
                    onErase={actions.eraseCell}
                    onToggleNotes={actions.toggleNotesMode}
                    onUndo={actions.undo}
                    onHint={actions.requestHint}
                    disabled={state.isComplete || state.isGameOver}
                    notesDisabled={state.difficulty === "expert_plus"}
                    showUndo={state.difficulty === "easy"}
                />
            </main>

            {/* Spacer between game and footer */}
            <div className="w-full h-12 sm:h-16 shrink-0" />

            {/* Footer */}
            <footer className="w-full max-w-[480px] text-center mb-8 sm:mb-12">
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
                    achievements={state.recentAchievements}
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
