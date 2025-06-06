import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type GamePhase = "ready" | "playing" | "ended";

export interface CollectibleItem {
  id: string;
  type: 'personality' | 'hobby' | 'background' | 'skill';
  title: string;
  message: string;
  points: number;
}

interface GameState {
  phase: GamePhase;
  score: number;
  collectedItems: CollectibleItem[];
  currentMessage: string | null;
  playerPosition: { x: number; y: number };
  cameraOffset: number;
  
  // Actions
  start: () => void;
  restart: () => void;
  end: () => void;
  addScore: (points: number) => void;
  collectItem: (item: CollectibleItem) => void;
  setMessage: (message: string | null) => void;
  updatePlayerPosition: (x: number, y: number) => void;
  setCameraOffset: (offset: number) => void;
}

export const useGameState = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    phase: "ready",
    score: 0,
    collectedItems: [],
    currentMessage: null,
    playerPosition: { x: 100, y: 400 },
    cameraOffset: 0,
    
    start: () => {
      set((state) => {
        if (state.phase === "ready") {
          return { phase: "playing" };
        }
        return {};
      });
    },
    
    restart: () => {
      set(() => ({
        phase: "ready",
        score: 0,
        collectedItems: [],
        currentMessage: null,
        playerPosition: { x: 100, y: 400 },
        cameraOffset: 0,
      }));
    },
    
    end: () => {
      set((state) => {
        if (state.phase === "playing") {
          return { phase: "ended" };
        }
        return {};
      });
    },
    
    addScore: (points: number) => {
      set((state) => ({ score: state.score + points }));
    },
    
    collectItem: (item: CollectibleItem) => {
      set((state) => {
        const alreadyCollected = state.collectedItems.some(collected => collected.id === item.id);
        if (alreadyCollected) return {};
        
        return {
          collectedItems: [...state.collectedItems, item],
          score: state.score + item.points,
          currentMessage: item.message,
        };
      });
      
      // Clear message after 4 seconds
      setTimeout(() => {
        set({ currentMessage: null });
      }, 4000);
    },
    
    setMessage: (message: string | null) => {
      set({ currentMessage: message });
    },
    
    updatePlayerPosition: (x: number, y: number) => {
      set({ playerPosition: { x, y } });
    },
    
    setCameraOffset: (offset: number) => {
      set({ cameraOffset: offset });
    },
  }))
);
