// ─── Types ───────────────────────────────────────────────────────────

export type Board = (number | null)[][];
export type NotesBoard = Set<number>[][];
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'expert_plus';

export interface CellPosition {
  row: number;
  col: number;
}

export interface Conflict {
  row: number;
  col: number;
}

export interface HintResult {
  cell: CellPosition;
  value: number;
  message: string;
  candidates: number[];
}

// ─── Constants ───────────────────────────────────────────────────────

const CLUE_COUNTS: Record<Difficulty, number> = {
  easy: 38,
  medium: 30,
  hard: 25,
  expert: 20,
  expert_plus: 17,
};

const DIFFICULTY_SCORE_RANGES: Record<Difficulty, { min: number; max: number; mid: number }> = {
  easy: { min: 0, max: 6, mid: 3 },
  medium: { min: 7, max: 14, mid: 10 },
  hard: { min: 15, max: 22, mid: 18 },
  expert: { min: 23, max: 40, mid: 30 },
  expert_plus: { min: 28, max: 45, mid: 36 },
};

// ─── Helpers ─────────────────────────────────────────────────────────

type Rng = () => number;

function hashStringToSeed(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): Rng {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSeededRng(seed?: string): Rng {
  if (!seed) return Math.random;
  return mulberry32(hashStringToSeed(seed));
}

export function createEmptyBoard(): Board {
  return Array.from({ length: 9 }, () => Array(9).fill(null));
}

function shuffleArray<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValid(board: Board, row: number, col: number, num: number): boolean {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (board[row][c] === num) return false;
  }
  // Check column
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === num) return false;
  }
  // Check 3×3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

export function getCandidates(board: Board, row: number, col: number): number[] {
  if (board[row][col] !== null) return [];
  const candidates: number[] = [];
  for (let num = 1; num <= 9; num++) {
    if (isValid(board, row, col, num)) {
      candidates.push(num);
    }
  }
  return candidates;
}

// ─── Solver ──────────────────────────────────────────────────────────

function findBestEmptyCell(board: Board): { row: number; col: number; candidates: number[] } | null {
  let bestCell: { row: number; col: number; candidates: number[] } | null = null;
  let minCandidates = 10;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === null) {
        const candidates = getCandidates(board, r, c);
        if (candidates.length === 0) {
          return { row: r, col: c, candidates: [] }; // Early exit: dead end
        }
        if (candidates.length < minCandidates) {
          minCandidates = candidates.length;
          bestCell = { row: r, col: c, candidates };
          if (minCandidates === 1) return bestCell; // Early exit: forces move
        }
      }
    }
  }
  return bestCell;
}

function solveBoard(board: Board): boolean {
  const best = findBestEmptyCell(board);
  if (!best) return true; // Solved

  const { row, col, candidates } = best;
  for (const num of candidates) {
    board[row][col] = num;
    if (solveBoard(board)) return true;
    board[row][col] = null;
  }
  return false;
}

export function solveSudoku(board: Board): Board | null {
  const copy = board.map(row => [...row]);
  if (solveBoard(copy)) return copy;
  return null;
}

// ─── Count solutions (up to 2 for uniqueness check) ─────────────────

function countSolutions(board: Board, limit: number): number {
  let count = 0;

  function solve(): boolean {
    const best = findBestEmptyCell(board);
    if (!best) {
      count++;
      return count >= limit;
    }

    const { row, col, candidates } = best;
    for (const num of candidates) {
      board[row][col] = num;
      if (solve()) return true;
      board[row][col] = null;
    }
    return false;
  }

  solve();
  return count;
}

// ─── Generator ───────────────────────────────────────────────────────

function estimateDifficultyScore(board: Board): number {
  const working = board.map(row => [...row]);
  let guesses = 0;
  let maxCandidates = 0;
  let forcedSteps = 0;

  function solve(): boolean {
    const best = findBestEmptyCell(working);
    if (!best) return true;

    const { row, col, candidates } = best;
    if (candidates.length === 0) return false;

    if (candidates.length === 1) {
      forcedSteps++;
      working[row][col] = candidates[0];
      if (solve()) return true;
      working[row][col] = null;
      return false;
    }

    guesses++;
    maxCandidates = Math.max(maxCandidates, candidates.length);
    for (const num of candidates) {
      working[row][col] = num;
      if (solve()) return true;
      working[row][col] = null;
    }
    return false;
  }

  solve();

  const guessScore = guesses * 5;
  const candidateScore = Math.max(0, maxCandidates - 2) * 2;
  const forcedScore = Math.floor(forcedSteps / 20);
  return guessScore + candidateScore + forcedScore;
}

function generateFullBoard(rng: Rng): Board {
  const board = createEmptyBoard();

  function fill(pos: number): boolean {
    if (pos === 81) return true;
    const r = Math.floor(pos / 9);
    const c = pos % 9;
    const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
    for (const num of nums) {
      if (isValid(board, r, c, num)) {
        board[r][c] = num;
        if (fill(pos + 1)) return true;
        board[r][c] = null;
      }
    }
    return false;
  }

  fill(0);
  return board;
}

export function generatePuzzle(difficulty: Difficulty, seed?: string): { puzzle: Board; solution: Board } {
  const rng = createSeededRng(seed);
  const target = DIFFICULTY_SCORE_RANGES[difficulty];
  const maxAttempts = 30;
  let bestMatch: { puzzle: Board; solution: Board; score: number } | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solution = generateFullBoard(rng);
    const puzzle = solution.map(row => [...row]);
    const clues = CLUE_COUNTS[difficulty];
    const cellsToRemove = 81 - clues;

    // Get all cell positions and shuffle them
    const positions: CellPosition[] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        positions.push({ row: r, col: c });
      }
    }
    const shuffledPositions = shuffleArray(positions, rng);

    let removed = 0;
    for (const { row, col } of shuffledPositions) {
      if (removed >= cellsToRemove) break;
      const backup = puzzle[row][col];
      puzzle[row][col] = null;

      // Check uniqueness
      const testBoard = puzzle.map(r => [...r]);
      if (countSolutions(testBoard, 2) === 1) {
        removed++;
      } else {
        puzzle[row][col] = backup;
      }
    }

    const score = estimateDifficultyScore(puzzle);
    if (score >= target.min && score <= target.max) {
      return { puzzle, solution };
    }

    if (!bestMatch || Math.abs(score - target.mid) < Math.abs(bestMatch.score - target.mid)) {
      bestMatch = { puzzle, solution, score };
    }
  }

  if (bestMatch) {
    return { puzzle: bestMatch.puzzle, solution: bestMatch.solution };
  }

  const fallbackSolution = generateFullBoard(rng);
  const fallbackPuzzle = fallbackSolution.map(row => [...row]);
  return { puzzle: fallbackPuzzle, solution: fallbackSolution };
}

// ─── Conflict detection ─────────────────────────────────────────────

export function getConflicts(board: Board, row: number, col: number, val: number): Conflict[] {
  if (val === null || val === 0) return [];
  const conflicts: Conflict[] = [];

  // Row
  for (let c = 0; c < 9; c++) {
    if (c !== col && board[row][c] === val) {
      conflicts.push({ row, col: c });
    }
  }

  // Column
  for (let r = 0; r < 9; r++) {
    if (r !== row && board[r][col] === val) {
      conflicts.push({ row: r, col });
    }
  }

  // Box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if ((r !== row || c !== col) && board[r][c] === val) {
        conflicts.push({ row: r, col: c });
      }
    }
  }

  return conflicts;
}

// ─── All board conflicts ────────────────────────────────────────────

export function getAllConflicts(board: Board): Set<string> {
  const conflictSet = new Set<string>();

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = board[r][c];
      if (val !== null) {
        const conflicts = getConflicts(board, r, c, val);
        if (conflicts.length > 0) {
          conflictSet.add(`${r},${c}`);
          conflicts.forEach(cf => conflictSet.add(`${cf.row},${cf.col}`));
        }
      }
    }
  }

  return conflictSet;
}

// ─── Smart hint ─────────────────────────────────────────────────────

function findHiddenSingle(board: Board): { cell: CellPosition; value: number; candidates: number[]; unit: 'row' | 'column' | 'box' } | null {
  // Rows
  for (let r = 0; r < 9; r++) {
    const candidateMap: Record<number, CellPosition[]> = {};
    for (let n = 1; n <= 9; n++) candidateMap[n] = [];
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== null) continue;
      const candidates = getCandidates(board, r, c);
      for (const n of candidates) {
        candidateMap[n].push({ row: r, col: c });
      }
    }
    for (let n = 1; n <= 9; n++) {
      if (candidateMap[n].length === 1) {
        const cell = candidateMap[n][0];
        return { cell, value: n, candidates: getCandidates(board, cell.row, cell.col), unit: 'row' };
      }
    }
  }

  // Columns
  for (let c = 0; c < 9; c++) {
    const candidateMap: Record<number, CellPosition[]> = {};
    for (let n = 1; n <= 9; n++) candidateMap[n] = [];
    for (let r = 0; r < 9; r++) {
      if (board[r][c] !== null) continue;
      const candidates = getCandidates(board, r, c);
      for (const n of candidates) {
        candidateMap[n].push({ row: r, col: c });
      }
    }
    for (let n = 1; n <= 9; n++) {
      if (candidateMap[n].length === 1) {
        const cell = candidateMap[n][0];
        return { cell, value: n, candidates: getCandidates(board, cell.row, cell.col), unit: 'column' };
      }
    }
  }

  // Boxes
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const candidateMap: Record<number, CellPosition[]> = {};
      for (let n = 1; n <= 9; n++) candidateMap[n] = [];
      for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
        for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
          if (board[r][c] !== null) continue;
          const candidates = getCandidates(board, r, c);
          for (const n of candidates) {
            candidateMap[n].push({ row: r, col: c });
          }
        }
      }
      for (let n = 1; n <= 9; n++) {
        if (candidateMap[n].length === 1) {
          const cell = candidateMap[n][0];
          return { cell, value: n, candidates: getCandidates(board, cell.row, cell.col), unit: 'box' };
        }
      }
    }
  }

  return null;
}

export function getHint(board: Board, solution: Board): HintResult | null {
  // Find empty cells
  const emptyCells: CellPosition[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === null) {
        emptyCells.push({ row: r, col: c });
      }
    }
  }

  if (emptyCells.length === 0) return null;

  // 1) Naked single
  for (const cell of emptyCells) {
    const candidates = getCandidates(board, cell.row, cell.col);
    if (candidates.length === 1) {
      const value = solution[cell.row][cell.col]!;
      const message = `Naked Single: Row ${cell.row + 1}, Column ${cell.col + 1} has only one candidate.`;
      return { cell, value, message, candidates };
    }
  }

  // 2) Hidden single (row, column, box)
  const hidden = findHiddenSingle(board);
  if (hidden) {
    const value = solution[hidden.cell.row][hidden.cell.col]!;
    const message = `Hidden Single: In this ${hidden.unit}, only one cell can take ${hidden.value}.`;
    return { cell: hidden.cell, value, message, candidates: hidden.candidates };
  }

  // 3) Fallback: most constrained cell
  let bestCell: CellPosition | null = null;
  let bestCount = 10;
  let bestCandidates: number[] = [];

  for (const cell of emptyCells) {
    const candidates = getCandidates(board, cell.row, cell.col);
    if (candidates.length > 0 && candidates.length < bestCount) {
      bestCount = candidates.length;
      bestCell = cell;
      bestCandidates = candidates;
    }
  }

  if (!bestCell) return null;

  const value = solution[bestCell.row][bestCell.col]!;
  const boxNum = Math.floor(bestCell.row / 3) * 3 + Math.floor(bestCell.col / 3) + 1;
  const message = `Candidate Focus: Row ${bestCell.row + 1}, Column ${bestCell.col + 1} in Box ${boxNum} has ${bestCandidates.join(' or ')}.`;
  return { cell: bestCell, value, message, candidates: bestCandidates };
}

// ─── Check completion ───────────────────────────────────────────────

export function isBoardComplete(board: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === null) return false;
    }
  }
  return true;
}

export function isBoardCorrect(board: Board, solution: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

// ─── Create empty notes board ────────────────────────────────────────

export function createEmptyNotes(): NotesBoard {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set<number>())
  );
}

// ─── Share Code ─────────────────────────────────────────────────────

function boardToString(board: Board): string {
  let out = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = board[r][c];
      out += val === null ? '.' : String(val);
    }
  }
  return out;
}

function stringToBoard(str: string): Board | null {
  if (str.length !== 81) return null;
  const board: Board = [];
  for (let r = 0; r < 9; r++) {
    const row: (number | null)[] = [];
    for (let c = 0; c < 9; c++) {
      const ch = str[r * 9 + c];
      if (ch === '.') row.push(null);
      else if (ch >= '1' && ch <= '9') row.push(Number(ch));
      else return null;
    }
    board.push(row);
  }
  return board;
}

function encodeBase64(data: string): string {
  if (typeof btoa !== 'undefined') return btoa(data);
  // Fallback for environments with Buffer
  // eslint-disable-next-line no-undef
  return Buffer.from(data, 'utf-8').toString('base64');
}

function decodeBase64(data: string): string | null {
  try {
    if (typeof atob !== 'undefined') return atob(data);
    // eslint-disable-next-line no-undef
    return Buffer.from(data, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

export function encodePuzzleCode(puzzle: Board, solution: Board, difficulty: Difficulty): string {
  const payload = JSON.stringify({
    v: 1,
    d: difficulty,
    p: boardToString(puzzle),
    s: boardToString(solution),
  });
  return encodeBase64(payload);
}

export function decodePuzzleCode(code: string): { puzzle: Board; solution: Board; difficulty: Difficulty } | null {
  const decoded = decodeBase64(code.trim());
  if (!decoded) return null;
  try {
    const data = JSON.parse(decoded);
    if (data?.v !== 1 || typeof data?.d !== 'string') return null;
    const puzzle = stringToBoard(data.p);
    const solution = stringToBoard(data.s);
    if (!puzzle || !solution) return null;
    const difficulty = data.d as Difficulty;
    return { puzzle, solution, difficulty };
  } catch {
    return null;
  }
}
