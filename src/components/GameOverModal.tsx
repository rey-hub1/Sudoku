import React from "react";

interface GameOverModalProps {
    onRestart: () => void;
    onNewGame: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({
    onRestart,
    onNewGame,
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal */}
            <div className="animate-pop-in relative bg-amber-50 border-4 border-gray-900 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] max-w-sm w-[90%]">
                {/* Header stripe */}
                <div className="bg-red-500 border-b-4 border-gray-900 px-8 py-5 text-center">
                    <div className="text-5xl mb-2">💥</div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                        Game Over
                    </h2>
                    <p className="text-red-200 text-sm font-medium mt-0.5">
                        Too many mistakes!
                    </p>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col gap-3">
                    <p className="text-center text-gray-500 text-sm mb-2">
                        Don't give up — every Sudoku master started somewhere.
                    </p>
                    <button
                        onClick={onRestart}
                        className="w-full py-3.5 bg-blue-600 text-white font-black text-base tracking-wide border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-700 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all cursor-pointer uppercase"
                    >
                        Try Again →
                    </button>
                    <button
                        onClick={onNewGame}
                        className="w-full py-3 bg-amber-50 text-gray-800 font-black border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all cursor-pointer uppercase text-sm"
                    >
                        New Game
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GameOverModal;
