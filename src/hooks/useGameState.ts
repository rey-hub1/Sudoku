import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { Board, NotesBoard, Difficulty, CellPosition, HintResult } from '../utils/sudoku';
import {
  generatePuzzle,
  getAllConflicts,
  getHint,
  isBoardComplete,
  isBoardCorrect,
  createEmptyNotes,
  createEmptyBoard,
  getCandidates,
  encodePuzzleCode,
  decodePuzzleCode,
} from '../utils/sudoku';

// ─── Types ───────────────────────────────────────────────────────────

export interface GameState {
  board: Board;
  solution: Board;
  initialBoard: Board;
  notes: NotesBoard;
  selectionStart: CellPosition | null;
  selectionEnd: CellPosition | null;
  notesMode: boolean;
  mistakes: number;
  maxMistakes: number;
  timer: number;
  isRunning: boolean;
  isComplete: boolean;
  isGameOver: boolean;
  difficulty: Difficulty;
  bestTimes: Record<Difficulty, number | null>;
  conflicts: Set<string>;
  wrongCells: Set<string>;
  hint: HintResult | null;
  hintStage: 0 | 1 | 2;
  hintsUsed: number;
  achievements: Record<string, boolean>;
  recentAchievements: Achievement[];
  moveTimes: number[];
  lastMoveAt: number | null;
  history: { board: Board; notes: NotesBoard }[];
  isGenerating: boolean;
}

interface SavedState {
  board: (number | null)[][];
  solution: (number | null)[][];
  initialBoard: (number | null)[][];
  notes: number[][][]; // serialized sets
  difficulty: Difficulty;
  mistakes: number;
  timer: number;
  isComplete: boolean;
  isGameOver: boolean;
  hintsUsed?: number;
  moveTimes?: number[];
  lastMoveAt?: number | null;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
}

// ─── localStorage helpers ────────────────────────────────────────────

const SAVE_KEY = 'sudoku-save';
const BEST_TIMES_KEY = 'sudoku-best-times';
const ACHIEVEMENTS_KEY = 'sudoku-achievements';

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'no-mistakes',
    title: 'Flawless',
    description: 'Solve a puzzle with 0 mistakes.',
  },
  {
    id: 'no-hints',
    title: 'Mind Palace',
    description: 'Solve a puzzle without revealing any hints.',
  },
  {
    id: 'expert-sprint',
    title: 'Expert Sprint',
    description: 'Solve Expert in under 15 minutes.',
  },
  {
    id: 'comeback',
    title: 'Comeback',
    description: 'Win with only 1 mistake left.',
  },
];

function loadBestTimes(): Record<Difficulty, number | null> {
  try {
    const saved = localStorage.getItem(BEST_TIMES_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { easy: null, medium: null, hard: null, expert: null, expert_plus: null };
}

function saveBestTimes(times: Record<Difficulty, number | null>) {
  localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(times));
}

function serializeNotes(notes: NotesBoard): number[][][] {
  return notes.map(row => row.map(cell => Array.from(cell)));
}

function deserializeNotes(data: number[][][]): NotesBoard {
  return data.map(row => row.map(cell => new Set(cell)));
}

function saveGame(state: GameState) {
  const data: SavedState = {
    board: state.board,
    solution: state.solution,
    initialBoard: state.initialBoard,
    notes: serializeNotes(state.notes),
    difficulty: state.difficulty,
    mistakes: state.mistakes,
    timer: state.timer,
    isComplete: state.isComplete,
    isGameOver: state.isGameOver,
    hintsUsed: state.hintsUsed,
    moveTimes: state.moveTimes,
    lastMoveAt: state.lastMoveAt,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function loadGame(): SavedState | null {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return null;
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}


function loadAchievements(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return {};
}

function saveAchievements(achievements: Record<string, boolean>) {
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
}

function getNewAchievements(params: {
  mistakes: number;
  maxMistakes: number;
  hintsUsed: number;
  timer: number;
  difficulty: Difficulty;
  existing: Record<string, boolean>;
}): { updated: Record<string, boolean>; recent: Achievement[] } {
  const updated = { ...params.existing };
  const recent: Achievement[] = [];

  const checks: { id: string; passed: boolean }[] = [
    { id: 'no-mistakes', passed: params.mistakes === 0 },
    { id: 'no-hints', passed: params.hintsUsed === 0 },
    { id: 'expert-sprint', passed: params.difficulty === 'expert' && params.timer <= 15 * 60 },
    { id: 'comeback', passed: params.mistakes === params.maxMistakes - 1 },
  ];

  for (const check of checks) {
    if (check.passed && !updated[check.id]) {
      updated[check.id] = true;
      const meta = ACHIEVEMENTS.find(a => a.id === check.id);
      if (meta) recent.push(meta);
    }
  }

  return { updated, recent };
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useGameState() {
  const savedRef = useRef<SavedState | null>(null);
  if (savedRef.current === null) {
    savedRef.current = loadGame();
  }
  const needsInitialGenerateRef = useRef<boolean>(savedRef.current === null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  const [state, setState] = useState<GameState>(() => {
    const saved = savedRef.current;
    if (saved) {
      const board = saved.board;
      return {
        board,
        solution: saved.solution,
        initialBoard: saved.initialBoard,
        notes: deserializeNotes(saved.notes),
        selectionStart: null,
        selectionEnd: null,
        notesMode: false,
        mistakes: saved.mistakes,
        maxMistakes: 3,
        timer: saved.timer,
        isRunning: !saved.isComplete && !saved.isGameOver,
        isComplete: saved.isComplete,
        isGameOver: saved.isGameOver,
        difficulty: saved.difficulty,
        bestTimes: loadBestTimes(),
        conflicts: getAllConflicts(board),
        wrongCells: new Set<string>(),
        hint: null,
        hintStage: 0,
        hintsUsed: saved.hintsUsed ?? 0,
        achievements: loadAchievements(),
        recentAchievements: [],
        moveTimes: saved.moveTimes ?? [],
        lastMoveAt: saved.lastMoveAt ?? null,
        history: [],
        isGenerating: false,
      };
    }

    return {
      board: createEmptyBoard(),
      solution: createEmptyBoard(),
      initialBoard: createEmptyBoard(),
      notes: createEmptyNotes(),
      selectionStart: null,
      selectionEnd: null,
      notesMode: false,
      mistakes: 0,
      maxMistakes: 3,
      timer: 0,
      isRunning: false,
      isComplete: false,
      isGameOver: false,
      difficulty: 'easy' as Difficulty,
      bestTimes: loadBestTimes(),
      conflicts: new Set<string>(),
      wrongCells: new Set<string>(),
      hint: null,
      hintStage: 0,
      hintsUsed: 0,
      achievements: loadAchievements(),
      recentAchievements: [],
      moveTimes: [],
      lastMoveAt: null,
      history: [],
      isGenerating: true,
    };
  });

  // Timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.isRunning && !state.isComplete && !state.isGameOver) {
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, timer: prev.timer + 1 }));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isRunning, state.isComplete, state.isGameOver]);

  // Auto-save
  useEffect(() => {
    if (state.isGenerating) return;
    const timeout = setTimeout(() => saveGame(state), 300);
    return () => clearTimeout(timeout);
  }, [state]);

  // Init worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/puzzleWorker.ts', import.meta.url),
      { type: 'module' },
    );
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const generatePuzzleAsync = useCallback((difficulty: Difficulty, seed?: string) => {
    const worker = workerRef.current;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!worker) {
      const { puzzle, solution } = generatePuzzle(difficulty, seed);
      return Promise.resolve({ puzzle, solution, requestId });
    }

    return new Promise<{ puzzle: Board; solution: Board; requestId: number }>((resolve) => {
      const handleMessage = (event: MessageEvent<{ id: number; puzzle: Board; solution: Board }>) => {
        if (event.data.id !== requestId) return;
        worker.removeEventListener('message', handleMessage);
        resolve({ puzzle: event.data.puzzle, solution: event.data.solution, requestId });
      };
      worker.addEventListener('message', handleMessage);
      worker.postMessage({ id: requestId, difficulty, seed });
    });
  }, []);

  const applyNewPuzzle = useCallback((
    puzzle: Board,
    solution: Board,
    difficulty: Difficulty,
    requestId: number,
    _meta?: { mode?: 'normal' | 'shared' },
  ) => {
    if (requestId !== requestIdRef.current) return;
    clearSave();
    setState(prev => ({
      board: puzzle.map(r => [...r]),
      solution,
      initialBoard: puzzle.map(r => [...r]),
      notes: createEmptyNotes(),
      selectionStart: null,
      selectionEnd: null,
      notesMode: false,
      mistakes: 0,
      maxMistakes: 3,
      timer: 0,
      isRunning: true,
      isComplete: false,
      isGameOver: false,
      difficulty,
      bestTimes: prev.bestTimes,
      conflicts: new Set<string>(),
      wrongCells: new Set<string>(),
      hint: null,
      hintStage: 0,
      hintsUsed: 0,
      achievements: prev.achievements,
      recentAchievements: [],
      moveTimes: [],
      lastMoveAt: null,
      history: [],
      isGenerating: false,
    }));
  }, []);

  // Initial puzzle generation
  useEffect(() => {
    if (!needsInitialGenerateRef.current) return;
    needsInitialGenerateRef.current = false;
    setState(prev => ({ ...prev, isGenerating: true }));
    generatePuzzleAsync('easy').then(({ puzzle, solution, requestId }) => {
      applyNewPuzzle(puzzle, solution, 'easy', requestId, { mode: 'normal' });
    });
  }, [applyNewPuzzle, generatePuzzleAsync]);

  // ─── Actions ─────────────────────────────────────────────────────

  const startSelection = useCallback((cell: CellPosition | null) => {
    setState(prev => ({ ...prev, selectionStart: cell, selectionEnd: cell, hint: null, hintStage: 0 }));
  }, []);

  const updateSelection = useCallback((cell: CellPosition | null) => {
    setState(prev => {
      // You can only update selection if a start point exists
      if (!prev.selectionStart) return prev;
      if (prev.difficulty === 'expert_plus') return prev;
      return { ...prev, selectionEnd: cell };
    });
  }, []);

  const toggleNotesMode = useCallback(() => {
    setState(prev => {
      if (prev.difficulty === 'expert_plus') return { ...prev, notesMode: false };
      return { ...prev, notesMode: !prev.notesMode };
    });
  }, []);

  const pruneInvalidNotes = useCallback((board: Board, notes: NotesBoard, initialBoard: Board) => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (initialBoard[r][c] !== null || board[r][c] !== null) {
          notes[r][c].clear();
          continue;
        }
        const candidates = new Set(getCandidates(board, r, c));
        for (const note of Array.from(notes[r][c])) {
          if (!candidates.has(note)) {
            notes[r][c].delete(note);
          }
        }
      }
    }
  }, []);

  const recordMoveAnalytics = useCallback((prev: GameState) => {
    const now = Date.now();
    const moveTimes = prev.lastMoveAt === null
      ? prev.moveTimes
      : [...prev.moveTimes, (now - prev.lastMoveAt) / 1000];
    const trimmedMoveTimes = moveTimes.slice(-500);
    return { moveTimes: trimmedMoveTimes, lastMoveAt: now };
  }, []);

  const inputNumber = useCallback((num: number) => {
    setState(prev => {
      if (!prev.selectionStart || !prev.selectionEnd || prev.isComplete || prev.isGameOver) return prev;

      // Determine bounding box
      const minRow = Math.min(prev.selectionStart.row, prev.selectionEnd.row);
      const maxRow = Math.max(prev.selectionStart.row, prev.selectionEnd.row);
      const minCol = Math.min(prev.selectionStart.col, prev.selectionEnd.col);
      const maxCol = Math.max(prev.selectionStart.col, prev.selectionEnd.col);

      const isMultiSelect = minRow !== maxRow || minCol !== maxCol;
      const isNotesAction = prev.notesMode || isMultiSelect;
      const notesDisabled = prev.difficulty === 'expert_plus';

      // Save history
      const historyEntry = {
        board: prev.board.map(r => [...r]),
        notes: prev.notes.map(r => r.map(c => new Set(c))),
      };

      if (isNotesAction && !notesDisabled) {
        // Toggle note across all empty selected cells
        const newNotes = prev.notes.map(r => r.map(c => new Set(c)));
        
        let shouldAdd = false;
        // First pass: check if we should add or remove
        // If ANY empty target cell is missing the note, we ADD to all. 
        // If ALL empty target cells already have the note, we REMOVE from all.
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            if (prev.initialBoard[r][c] === null && prev.board[r][c] === null) {
              if (!newNotes[r][c].has(num)) {
                shouldAdd = true;
              }
            }
          }
        }

        // Second pass: apply
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            if (prev.initialBoard[r][c] === null && prev.board[r][c] === null) {
              if (shouldAdd) {
                newNotes[r][c].add(num);
              } else {
                newNotes[r][c].delete(num);
              }
            }
          }
        }

        pruneInvalidNotes(prev.board, newNotes, prev.initialBoard);
        return {
          ...prev,
          notes: newNotes,
          history: [...prev.history, historyEntry],
        };
      }

      // Normal mode: Place number in all empty (non-given) selected cells
      const newBoard = prev.board.map(r => [...r]);
      const newNotes = notesDisabled
        ? createEmptyNotes()
        : prev.notes.map(r => r.map(c => new Set(c)));
      let madeChange = false;

      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          if (prev.initialBoard[r][c] === null) {
            newBoard[r][c] = num;
            newNotes[r][c].clear();
            madeChange = true;
            
            // Also clear this number from notes in same row, col, and box
            if (!notesDisabled) {
              for (let i = 0; i < 9; i++) {
                newNotes[r][i].delete(num);
                newNotes[i][c].delete(num);
              }
              const boxRow = Math.floor(r / 3) * 3;
              const boxCol = Math.floor(c / 3) * 3;
              for (let br = boxRow; br < boxRow + 3; br++) {
                for (let bc = boxCol; bc < boxCol + 3; bc++) {
                  newNotes[br][bc].delete(num);
                }
              }
            }
          }
        }
      }

      if (!madeChange) return prev; // No empty cells selected to fill

      // Determine mistake count across all selected cells
      let newMistakes = prev.mistakes;
      let isGameOver: boolean = prev.isGameOver;
      let hasNewMistake = false;
      
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          if (prev.initialBoard[r][c] === null && newBoard[r][c] !== null && newBoard[r][c] !== prev.solution[r][c]) {
            if (prev.board[r][c] !== newBoard[r][c]) {
              hasNewMistake = true;
            }
          }
        }
      }

      if (hasNewMistake) {
        newMistakes = Math.min(prev.maxMistakes, prev.mistakes + 1);
      }

      if (newMistakes >= prev.maxMistakes) {
        isGameOver = true;
      }

      // Check conflicts and completion
      if (!notesDisabled) {
        pruneInvalidNotes(newBoard, newNotes, prev.initialBoard);
      }
      const conflicts = getAllConflicts(newBoard);
      let isComplete = false;
      let bestTimes = prev.bestTimes;
      let isRunning = prev.isRunning;
      let achievements = prev.achievements;
      let recentAchievements: Achievement[] = [];

      if (isBoardComplete(newBoard) && isBoardCorrect(newBoard, prev.solution)) {
        isComplete = true;
        isRunning = false;
        const currentBest = bestTimes[prev.difficulty];
        if (currentBest === null || prev.timer < currentBest) {
          bestTimes = { ...bestTimes, [prev.difficulty]: prev.timer };
          saveBestTimes(bestTimes);
        }
        clearSave();

        const unlocked = getNewAchievements({
          mistakes: newMistakes,
          maxMistakes: prev.maxMistakes,
          hintsUsed: prev.hintsUsed,
          timer: prev.timer,
          difficulty: prev.difficulty,
          existing: prev.achievements,
        });
        achievements = unlocked.updated;
        recentAchievements = unlocked.recent;
        saveAchievements(achievements);

      }

      const analytics = recordMoveAnalytics(prev);

      return {
        ...prev,
        board: newBoard,
        notes: newNotes,
        mistakes: newMistakes,
        isGameOver,
        isComplete,
        isRunning,
        bestTimes,
        conflicts,
        achievements,
        recentAchievements,
        moveTimes: analytics.moveTimes,
        lastMoveAt: analytics.lastMoveAt,
        history: [...prev.history, historyEntry],
      };
    });
  }, [pruneInvalidNotes, recordMoveAnalytics]);

  const eraseCell = useCallback(() => {
    setState(prev => {
      if (!prev.selectionStart || !prev.selectionEnd || prev.isComplete || prev.isGameOver) return prev;
      const notesDisabled = prev.difficulty === 'expert_plus';
      
      const minRow = Math.min(prev.selectionStart.row, prev.selectionEnd.row);
      const maxRow = Math.max(prev.selectionStart.row, prev.selectionEnd.row);
      const minCol = Math.min(prev.selectionStart.col, prev.selectionEnd.col);
      const maxCol = Math.max(prev.selectionStart.col, prev.selectionEnd.col);

      const historyEntry = {
        board: prev.board.map(r => [...r]),
        notes: prev.notes.map(r => r.map(c => new Set(c))),
      };

      const newBoard = prev.board.map(r => [...r]);
      const newNotes = prev.notes.map(r => r.map(c => new Set(c)));
      let madeChange = false;

      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          if (prev.initialBoard[r][c] === null && (newBoard[r][c] !== null || newNotes[r][c].size > 0)) {
            newBoard[r][c] = null;
            newNotes[r][c].clear();
            madeChange = true;
          }
        }
      }

      if (!madeChange) return prev;

      if (!notesDisabled) {
        pruneInvalidNotes(newBoard, newNotes, prev.initialBoard);
      }
      const conflicts = getAllConflicts(newBoard);
      const analytics = recordMoveAnalytics(prev);

      return {
        ...prev,
        board: newBoard,
        notes: newNotes,
        conflicts,
        moveTimes: analytics.moveTimes,
        lastMoveAt: analytics.lastMoveAt,
        history: [...prev.history, historyEntry],
      };
    });
  }, [pruneInvalidNotes, recordMoveAnalytics]);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.history.length === 0 || prev.isComplete || prev.isGameOver) return prev;
      const last = prev.history[prev.history.length - 1];
      const conflicts = getAllConflicts(last.board);
      return {
        ...prev,
        board: last.board,
        notes: prev.difficulty === 'expert_plus' ? createEmptyNotes() : last.notes,
        conflicts,
        history: prev.history.slice(0, -1),
      };
    });
  }, []);

  const requestHint = useCallback(() => {
    setState(prev => {
      if (prev.isComplete || prev.isGameOver) return prev;
      if (prev.difficulty === 'expert_plus') return prev;
      const notesDisabled = false;

      // If hint is already showing, progress its tier
      if (prev.hint) {
        if (prev.hintStage === 0) {
          return { ...prev, hintStage: 1 };
        }

        if (prev.hintStage === 1) {
        const historyEntry = {
          board: prev.board.map(r => [...r]),
          notes: prev.notes.map(r => r.map(c => new Set(c))),
        };

        const { row, col } = prev.hint.cell;
        const newBoard = prev.board.map(r => [...r]);
        newBoard[row][col] = prev.hint.value;

        const newNotes = prev.notes.map(r => r.map(c => new Set(c)));
        newNotes[row][col].clear();

        if (!notesDisabled) {
          pruneInvalidNotes(newBoard, newNotes, prev.initialBoard);
        }
        const conflicts = getAllConflicts(newBoard);

        let isComplete = false;
        let bestTimes = prev.bestTimes;
        let isRunning = prev.isRunning;
        let achievements = prev.achievements;
        let recentAchievements: Achievement[] = [];

        if (isBoardComplete(newBoard) && isBoardCorrect(newBoard, prev.solution)) {
          isComplete = true;
          isRunning = false;
          const currentBest = bestTimes[prev.difficulty];
          if (currentBest === null || prev.timer < currentBest) {
            bestTimes = { ...bestTimes, [prev.difficulty]: prev.timer };
            saveBestTimes(bestTimes);
          }
          clearSave();

          const unlocked = getNewAchievements({
            mistakes: prev.mistakes,
            maxMistakes: prev.maxMistakes,
            hintsUsed: prev.hintsUsed + 1,
            timer: prev.timer,
            difficulty: prev.difficulty,
            existing: prev.achievements,
          });
          achievements = unlocked.updated;
          recentAchievements = unlocked.recent;
          saveAchievements(achievements);

        }

        return {
          ...prev,
          board: newBoard,
          notes: newNotes,
          conflicts,
          isComplete,
          isRunning,
          bestTimes,
          hintStage: 2,
          hintsUsed: prev.hintsUsed + 1,
          selectionStart: prev.hint.cell,
          selectionEnd: prev.hint.cell,
          history: [...prev.history, historyEntry],
          achievements,
          recentAchievements,
        };
        }

        return prev;
      }

      // Get a new hint
      const hint = getHint(prev.board, prev.solution);
      if (!hint) return prev;

      return {
        ...prev,
        hint,
        hintStage: 0,
        selectionStart: hint.cell,
        selectionEnd: hint.cell,
      };
    });
  }, [pruneInvalidNotes]);

  const newGame = useCallback((difficulty?: Difficulty) => {
    const diff = difficulty || state.difficulty;
    
    // Set generating state
    setState(prev => ({ ...prev, isGenerating: true, recentAchievements: [] }));

    generatePuzzleAsync(diff).then(({ puzzle, solution, requestId }) => {
      applyNewPuzzle(puzzle, solution, diff, requestId, { mode: 'normal' });
    });
  }, [state.difficulty, applyNewPuzzle, generatePuzzleAsync]);

  const getShareCode = useCallback(() => {
    return encodePuzzleCode(state.initialBoard, state.solution, state.difficulty);
  }, [state.initialBoard, state.solution, state.difficulty]);

  const loadFromCode = useCallback((code: string) => {
    const decoded = decodePuzzleCode(code);
    if (!decoded) return false;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    applyNewPuzzle(decoded.puzzle, decoded.solution, decoded.difficulty, requestId, { mode: 'shared' });
    return true;
  }, [applyNewPuzzle]);

  const restartGame = useCallback(() => {
    setState(prev => ({
      ...prev,
      board: prev.initialBoard.map(r => [...r]),
      notes: createEmptyNotes(),
      selectionStart: null,
      selectionEnd: null,
      notesMode: false,
      mistakes: 0,
      timer: 0,
      isRunning: true,
      isComplete: false,
      isGameOver: false,
      conflicts: new Set<string>(),
      wrongCells: new Set<string>(),
      hint: null,
      hintStage: 0,
      hintsUsed: 0,
      recentAchievements: [],
      history: [],
      isGenerating: false,
    }));
  }, []);

  // Memoize wrong cells (only for user-entered values)
  const wrongCells = useMemo(() => {
    const wrong = new Set<string>();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = state.board[r][c];
        if (val !== null && state.initialBoard[r][c] === null && val !== state.solution[r][c]) {
          wrong.add(`${r},${c}`);
        }
      }
    }
    return wrong;
  }, [state.board, state.solution, state.initialBoard]);

  return {
    state: {
      ...state,
      wrongCells,
    },
    actions: {
      startSelection,
      updateSelection,
      toggleNotesMode,
      inputNumber,
      eraseCell,
      undo,
      requestHint,
      newGame,
      getShareCode,
      loadFromCode,
      restartGame,
    },
  };
}
