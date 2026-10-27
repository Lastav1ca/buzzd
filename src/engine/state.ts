import type { Color, Piece } from "./pieces/types.js";

type GameState = {
  board: Map<string, Piece[]>;   // ključ "q,r" → stek figura (zbog bube)
  hands: Record<Color, Piece[]>;     // figure koje još nisu postavljene
  turn: number;
};