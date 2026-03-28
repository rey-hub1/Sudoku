// ─── Types ───────────────────────────────────────────────────────────

export type Board = (number | null)[][];
export type NotesBoard = Set<number>[][];
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

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
}

// ─── Constants ───────────────────────────────────────────────────────

const CLUE_COUNTS: Record<Difficulty, number> = {
  easy: 38,
  medium: 30,
  hard: 25,
  expert: 20,
};

// ─── Helpers ─────────────────────────────────────────────────────────

function createEmptyBoard(): Board {
  return Array.from({ length: 9 }, () => Array(9).fill(null));
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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

// ─── Solver ──────────────────────────────────────────────────────────

function findBestEmptyCell(board: Board): { row: number; col: number; candidates: number[] } | null {
  let bestCell: { row: number; col: number; candidates: number[] } | null = null;
  let minCandidates = 10;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === null) {
        const candidates: number[] = [];
        for (let num = 1; num <= 9; num++) {
          if (isValid(board, r, c, num)) {
            candidates.push(num);
          }
        }
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

function generateFullBoard(): Board {
  const board = createEmptyBoard();

  function fill(pos: number): boolean {
    if (pos === 81) return true;
    const r = Math.floor(pos / 9);
    const c = pos % 9;
    const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
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

export function generatePuzzle(difficulty: Difficulty): { puzzle: Board; solution: Board } {
  const solution = generateFullBoard();
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
  const shuffledPositions = shuffleArray(positions);

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

  return { puzzle, solution };
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

  // Find cells with fewest candidates (most constrained)
  let bestCell: CellPosition | null = null;
  let bestCount = 10;
  let bestCandidates: number[] = [];

  for (const cell of emptyCells) {
    const candidates: number[] = [];
    for (let n = 1; n <= 9; n++) {
      if (isValid(board, cell.row, cell.col, n)) {
        candidates.push(n);
      }
    }
    if (candidates.length > 0 && candidates.length < bestCount) {
      bestCount = candidates.length;
      bestCell = cell;
      bestCandidates = candidates;
    }
  }

  if (!bestCell) return null;

  const value = solution[bestCell.row][bestCell.col]!;
  let message: string;

  if (bestCandidates.length === 1) {
    message = `Row ${bestCell.row + 1}, Column ${bestCell.col + 1}: There's only one number that can go here. Look at the row, column, and box constraints.`;
  } else {
    // Generate a more specific clue
    const boxNum = Math.floor(bestCell.row / 3) * 3 + Math.floor(bestCell.col / 3) + 1;
    message = `Row ${bestCell.row + 1}, Column ${bestCell.col + 1}: This cell in Box ${boxNum} can only be ${bestCandidates.join(' or ')}. Use elimination to find the answer.`;
  }

  return { cell: bestCell, value, message };
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
