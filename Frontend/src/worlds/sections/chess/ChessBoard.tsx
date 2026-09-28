"use client";

import { useCallback, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";

export type ChessBoardMode = "preview" | "puzzle";

export type ChessBoardConfig = {
  mode: ChessBoardMode;
  title?: string;
  startFen?: string;
  showCoordinates?: boolean;
};

const GLYPHS: Record<string, string> = {
  wk: "♔",
  wq: "♕",
  wr: "♖",
  wb: "♗",
  wn: "♘",
  wp: "♙",
  bk: "♚",
  bq: "♛",
  br: "♜",
  bb: "♝",
  bn: "♞",
  bp: "♟",
};

const PIECE_NAMES: Record<string, string> = {
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
};

const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function initialFen(config: ChessBoardConfig): string {
  return config.startFen ?? new Chess().fen();
}

function inspectTargets(fen: string, square: string, color: "w" | "b"): string[] {
  const game = new Chess(fen);
  game.setTurn(color);
  try {
    return game.moves({ square: square as Square, verbose: true }).map((move) => move.to);
  } catch {
    return [] as string[];
  }
}

function describeSquare(square: string, game: Chess): string {
  const piece = game.get(square as Square);
  if (!piece) {
    return `${square}, empty`;
  }
  return `${square}, ${piece.color === "w" ? "white" : "black"} ${PIECE_NAMES[piece.type] ?? piece.type}`;
}

export function ChessBoard({ config }: { config: ChessBoardConfig }) {
  const [fen, setFen] = useState(() => initialFen(config));
  const [selected, setSelected] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [message, setMessage] = useState("White to move");

  const play = config.mode === "puzzle";

  const game = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const targets = useMemo(() => {
    if (!selected) {
      return [] as string[];
    }
    const piece = game.get(selected as Square);
    if (!piece) {
      return [] as string[];
    }
    if (play && piece.color === game.turn()) {
      try {
        return game.moves({ square: selected as Square, verbose: true }).map((move) => move.to);
      } catch {
        return [] as string[];
      }
    }
    return inspectTargets(fen, selected, piece.color);
  }, [fen, game, play, selected]);

  const onSquareClick = useCallback(
    (square: string) => {
      const typed = square as Square;

      if (!play) {
        const inspected = game.get(typed);
        setSelected(inspected ? typed : null);
        setMessage(
          inspected
            ? `${describeSquare(typed, game)}. ${
                inspectTargets(fen, typed, inspected.color).length
              } legal destinations.`
            : `${typed} is empty.`,
        );
        return;
      }

      if (selected && targets.includes(typed)) {
        const next = new Chess(fen);
        try {
          const result = next.move({ from: selected, to: typed, promotion: "q" });
          if (result) {
            setFen(next.fen());
            setLastMove({ from: selected, to: typed });
            setHistory((prev) => [...prev, result.san]);
            setSelected(null);
            setMessage(
              next.isCheckmate()
                ? `Checkmate — ${result.san} wins the game.`
                : next.isStalemate()
                  ? "Stalemate. The game is drawn."
                  : next.isCheck()
                    ? `${result.san} gives check.`
                    : `${result.san} played. ${next.turn() === "w" ? "White" : "Black"} to move.`,
            );
            return;
          }
        } catch {
          setMessage("That move is not legal.");
        }
      }

      const piece = game.get(typed);
      const ownPiece = Boolean(piece && piece.color === game.turn());
      setSelected(ownPiece ? typed : null);
      setMessage(
        piece
          ? `Selected ${describeSquare(typed, game)}`
          : `Selected empty square ${typed}.`,
      );
    },
    [fen, game, play, selected, targets],
  );

  const undo = useCallback(() => {
    const next = new Chess(fen);
    const undone = next.undo();
    if (undone) {
      setFen(next.fen());
      setHistory((prev) => prev.slice(0, -1));
      setSelected(null);
      setMessage(`${undone.san} taken back. ${next.turn() === "w" ? "White" : "Black"} to move.`);
    }
  }, [fen]);

  const reset = useCallback(() => {
    setFen(initialFen(config));
    setSelected(null);
    setLastMove(null);
    setHistory([]);
    setMessage("White to move");
  }, [config]);

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-[#100e0c] p-6 text-foreground">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            {play ? "Playable board" : "Board preview"}
          </p>
          <h3 className="mt-2 text-2xl font-bold">{config.title ?? "Chess board"}</h3>
        </div>
        {play ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={history.length === 0}
              className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/85"
            >
              Reset
            </button>
          </div>
        ) : null}
      </div>

      <div dir="ltr" className="mt-5 flex gap-1.5">
        {config.showCoordinates === false ? null : (
          <div className="flex flex-col justify-around py-0.5 text-[0.6rem] font-semibold text-muted-foreground">
            {RANKS.map((rank) => (
              <span key={rank} className="flex h-full items-center">
                {rank}
              </span>
            ))}
          </div>
        )}

        <div className="flex-1">
          <div
            role="group"
            aria-label={play ? "Playable chess board" : "Chess board preview"}
            className="grid grid-cols-8 overflow-hidden rounded-lg border border-amber-500/20"
          >
            {RANKS.flatMap((rank, rowIndex) =>
              FILES.map((file, colIndex) => {
                const square = `${file}${rank}`;
                const piece = game.get(square as Square);
                const light = (rowIndex + colIndex) % 2 === 0;
                const isSelected = selected === square;
                const isTarget = targets.includes(square);
                const isLastMove = lastMove?.from === square || lastMove?.to === square;

                return (
                  <button
                    key={square}
                    type="button"
                    onClick={() => onSquareClick(square)}
                    aria-label={describeSquare(square, game)}
                    aria-pressed={isSelected}
                    className={`relative flex aspect-square items-center justify-center text-3xl leading-none transition sm:text-4xl ${
                      light ? "bg-[#3a342c] hover:bg-[#463f35]" : "bg-[#241f1a] hover:bg-[#2e2822]"
                    } ${isLastMove ? "ring-2 ring-inset ring-amber-400/80" : ""}`}
                  >
                    {isTarget ? (
                      <span
                        aria-hidden="true"
                        className="absolute h-2.5 w-2.5 rounded-full bg-emerald-400/80"
                      />
                    ) : null}
                    {piece ? (
                      <span
                        className={
                          piece.color === "w" ? "text-[#f0e7d8]" : "text-[#9c8f7d]"
                        }
                      >
                        {GLYPHS[`${piece.color}${piece.type}`] ?? ""}
                      </span>
                    ) : null}
                  </button>
                );
              }),
            )}
          </div>

          {config.showCoordinates === false ? null : (
            <div className="mt-1 flex justify-around text-[0.6rem] font-semibold text-muted-foreground">
              {FILES.map((file) => (
                <span key={file}>{file}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <p aria-live="polite" className="mt-4 text-sm text-muted-foreground">
        {message}
      </p>

      {play && history.length > 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">Moves: {history.join(" ")}</p>
      ) : null}
    </section>
  );
}
