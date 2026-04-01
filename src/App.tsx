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
    const [theme, setTheme] = useState<
        "classic" | "forest" | "sunset" | "purple"
    >(() => {
        const saved = localStorage.getItem("sudoku-theme");
        if (
            saved === "forest" ||
            saved === "sunset" ||
            saved === "classic" ||
            saved === "purple"
        ) {
            return saved;
        }
        return "classic";
    });
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (state.isComplete || state.isGameOver) return;

            if (e.key === "p" || e.key === "P") {
                actions.togglePause();
                return;
            }
            if (e.key === "Escape" && state.isPaused) {
                actions.togglePause();
                return;
            }

            if (state.isPaused) return;

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

                    const base =
                        e.shiftKey && state.difficulty !== "expert_plus"
                        ? state.selectionEnd ?? state.selectionStart
                        : state.selectionStart;

                    const newRow = Math.max(0, Math.min(8, base.row + deltaRow));
                    const newCol = Math.max(0, Math.min(8, base.col + deltaCol));

                    if (e.shiftKey && state.difficulty !== "expert_plus") {
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
            state.isPaused,
            state.selectionStart,
            state.selectionEnd,
            state.difficulty,
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
        <div className="min-h-screen bg-amber-50 relative flex flex-col items-center px-4 pt-6 sm:pt-10 pb-20 sm:pb-10">

            {/* ─── Sidebar Overlay (semua ukuran layar) ─── */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <aside className="relative w-[320px] max-w-[90vw] animate-[fadeIn_0.2s_ease-out]">
                        <div className="border-4 border-gray-900 bg-amber-50 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-6">
                            {/* Header sidebar */}
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 grid grid-cols-3 grid-rows-3 gap-[2px] border-2 border-gray-900 bg-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                        {[...Array(9)].map((_, i) => (
                                            <div
                                                key={i}
                                                className={i % 2 === 0 || i === 4 ? "bg-blue-600" : "bg-white"}
                                            />
                                        ))}
                                    </div>
                                    <div>
                                        <div className="text-xl font-black tracking-tight text-gray-900 leading-none mb-1">Sudoku</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Game Hub</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center text-sm font-black border-2 border-gray-900 bg-red-500 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
                                    aria-label="Close menu"
                                >
                                    ✕
                                </button>
                            </div>

                            <nav className="flex flex-col gap-3 mb-8">
                                {[
                                    { label: "Puzzle", active: true },
                                    { label: "Daily Task", soon: true },
                                    { label: "Challenges", soon: true },
                                    { label: "Records", soon: true },
                                    { label: "Settings", soon: true },
                                ].map((item) => (
                                    <button
                                        key={item.label}
                                        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-black uppercase tracking-wider border-2 border-gray-900 transition-all ${
                                            item.active
                                                ? "bg-blue-600 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-x-[2px] -translate-y-[2px]"
                                                : "bg-white text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-100"
                                        } ${item.soon ? "opacity-60 cursor-not-allowed hover:bg-white hover:translate-x-0 hover:translate-y-0 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" : ""}`}
                                        disabled={item.soon}
                                    >
                                        <span>{item.label}</span>
                                        {item.soon && (
                                            <span className="text-[9px] px-1.5 py-0.5 border-2 border-gray-900 bg-amber-200 text-gray-900">
                                                SOON
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </nav>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { handleShare(); setSidebarOpen(false); }}
                                    className="flex-1 py-3 text-xs font-black uppercase tracking-wider border-2 border-gray-900 bg-green-400 text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
                                >
                                    Share
                                </button>
                                <button
                                    onClick={() => { handleLoad(); setSidebarOpen(false); }}
                                    className="flex-1 py-3 text-xs font-black uppercase tracking-wider border-2 border-gray-900 bg-white text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
                                >
                                    Load
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            )}

            {/* ─── Game Content — selalu center di viewport ─── */}
            <div className="w-full max-w-[520px] flex flex-col items-center gap-6">

                {/* Header */}
                <header className="w-full text-center pb-4">
                    <div className="flex items-center justify-center gap-3 mb-1 relative pb-4">
                        {/* Tombol Menu — selalu tampil di semua ukuran layar */}
                        <button
                            onClick={() => setSidebarOpen((v) => !v)}
                            className="absolute left-0 top-0 px-2 py-1.5 text-[10px] font-black uppercase tracking-wider border-2 border-gray-900 bg-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 transition-colors"
                            aria-label="Toggle menu"
                        >
                            ☰ Menu
                        </button>
                        <div className="w-9 h-9 grid grid-cols-3 grid-rows-3 gap-0.5 border-2 border-gray-900 bg-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            {[...Array(9)].map((_, i) => (
                                <div
                                    key={i}
                                    className={i % 2 === 0 || i === 4 ? "bg-blue-600" : "bg-white"}
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
                            { value: "purple", label: "Purple" },
                        ].map((t) => (
                            <button
                                key={t.value}
                                onClick={() =>
                                    setTheme(t.value as "classic" | "forest" | "sunset" | "purple")
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
                <main className="flex flex-col items-center gap-4 sm:gap-5 w-full">
                    <Toolbar
                        difficulty={state.difficulty}
                        timer={state.timer}
                        mistakes={state.mistakes}
                        maxMistakes={state.maxMistakes}
                        bestTime={state.bestTimes[state.difficulty]}
                        hideMistakes={state.difficulty === "expert_plus"}
                        isPaused={state.isPaused}
                        onTogglePause={actions.togglePause}
                        onNewGame={actions.newGame}
                    />

                    {state.isGenerating ? (
                        <div className="w-full aspect-square max-w-[500px] flex items-center justify-center bg-white border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex flex-col items-center gap-6">
                                <div className="w-16 h-16 border-8 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                                <span className="font-black text-2xl tracking-tighter text-gray-900">GENERATING...</span>
                            </div>
                        </div>
                    ) : (
                        <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center">
                            {state.isPaused && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center">
                                    <div className="absolute inset-0 bg-gray-900/55 backdrop-blur-md" />
                                    <div className="relative z-10 mx-4 w-full max-w-[420px] border-2 border-gray-900 bg-gradient-to-br from-white/95 via-white/90 to-amber-50/90 text-gray-900 shadow-[14px_14px_0px_0px_rgba(0,0,0,1)] backdrop-blur-xl p-7 sm:p-8 animate-[fadeIn_0.2s_ease-out]">
                                        <div className="absolute -top-3 -right-3 w-12 h-12 bg-blue-600 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-6" />
                                        <div className="flex items-center gap-4 mb-5">
                                            <div className="w-12 h-12 flex items-center justify-center bg-gray-900 text-white border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-xl font-black">
                                                II
                                            </div>
                                            <div>
                                                <div className="text-3xl sm:text-4xl font-black tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                                    Game Paused
                                                </div>
                                                <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-gray-500">
                                                    Take a breather
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-600 mb-6">
                                            Press <span className="font-black text-gray-900">P</span> or <span className="font-black text-gray-900">Esc</span> to resume.
                                        </p>
                                        <button
                                            onClick={actions.togglePause}
                                            className="w-full px-8 py-4 text-sm sm:text-base font-black uppercase tracking-wider bg-blue-600 text-white border-2 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                                        >
                                            Resume Game
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div
                                className={`transition-all duration-200 ${
                                    state.isPaused
                                        ? "blur-[2px] brightness-90 saturate-50 scale-[0.985]"
                                        : ""
                                }`}
                            >
                                <SudokuGrid
                                    board={state.board}
                                    initialBoard={state.initialBoard}
                                    notes={state.notes}
                                    notesMode={state.notesMode}
                                    notesDisabled={state.difficulty === "expert_plus"}
                                    disableMultiSelect={state.difficulty === "expert_plus"}
                                    disabled={state.isPaused || state.isComplete || state.isGameOver}
                                    selectionStart={state.selectionStart}
                                    selectionEnd={state.selectionEnd}
                                    conflicts={state.difficulty === "expert_plus" ? new Set() : state.conflicts}
                                    wrongCells={state.difficulty === "expert_plus" ? new Set() : state.wrongCells}
                                    hintCell={state.hint?.cell ?? null}
                                    onSelectionStart={actions.startSelection}
                                    onSelectionUpdate={actions.updateSelection}
                                />
                            </div>
                        </div>
                    )}

                    {state.difficulty !== "expert_plus" && (
                        <HintPanel
                            hint={state.hint}
                            hintStage={state.hintStage}
                            onReveal={actions.requestHint}
                            onDismiss={() => actions.startSelection(null)}
                        />
                    )}

                    <div className="w-full border-2 border-gray-900 bg-amber-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-4 py-3 text-xs sm:text-sm font-bold text-gray-700 flex items-center justify-between">
                        <div>Moves: {analytics.moves}</div>
                        <div>Avg/Move: {analytics.avg.toFixed(1)}s</div>
                        <div>Last: {analytics.last.toFixed(1)}s</div>
                    </div>

                    <NumberPad
                        board={state.board}
                        solution={state.solution}
                        notesMode={state.notesMode}
                        onNumber={actions.inputNumber}
                        onErase={actions.eraseCell}
                        onToggleNotes={actions.toggleNotesMode}
                        onUndo={actions.undo}
                        onHint={actions.requestHint}
                        disabled={state.isComplete || state.isGameOver || state.isPaused}
                        notesDisabled={state.difficulty === "expert_plus"}
                        hintDisabled={state.difficulty === "expert_plus"}
                        showUndo={state.difficulty === "easy"}
                    />
                </main>

                {/* Footer shortcuts */}
                <footer className="w-full text-center mb-2">
                    <div className="flex items-center justify-center gap-x-6 gap-y-4 flex-wrap">
                        {[
                            { keys: "1-9", label: "Input" },
                            { keys: "N", label: "Notes" },
                            { keys: "ARROWS", label: "Move" },
                            { keys: "P", label: "Pause" },
                        ].map(({ keys, label }) => (
                            <div key={label} className="flex items-center gap-1.5 whitespace-nowrap">
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
            </div>

            {/* ─── Modals ─── */}
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
