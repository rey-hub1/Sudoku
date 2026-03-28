import type { Difficulty } from "../utils/sudoku";
import { generatePuzzle } from "../utils/sudoku";

type PuzzleRequest = {
    id: number;
    difficulty: Difficulty;
    seed?: string;
};

type PuzzleResponse = {
    id: number;
    puzzle: (number | null)[][];
    solution: (number | null)[][];
};

self.onmessage = (event: MessageEvent<PuzzleRequest>) => {
    const { id, difficulty, seed } = event.data;
    const { puzzle, solution } = generatePuzzle(difficulty, seed);
    const response: PuzzleResponse = { id, puzzle, solution };
    self.postMessage(response);
};
