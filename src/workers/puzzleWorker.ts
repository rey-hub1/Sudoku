import type { Difficulty } from "../utils/sudoku";
import { generatePuzzle } from "../utils/sudoku";

type PuzzleRequest = {
    id: number;
    difficulty: Difficulty;
};

type PuzzleResponse = {
    id: number;
    puzzle: (number | null)[][];
    solution: (number | null)[][];
};

self.onmessage = (event: MessageEvent<PuzzleRequest>) => {
    const { id, difficulty } = event.data;
    const { puzzle, solution } = generatePuzzle(difficulty);
    const response: PuzzleResponse = { id, puzzle, solution };
    self.postMessage(response);
};
