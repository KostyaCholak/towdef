import { create } from "zustand";
import { immer } from 'zustand/middleware/immer'
import type { Bullet, Deposit, Tower } from "../../types";

type GameState = {
  money: number;
  towers: Tower[];
  activeTowerType: string;
  deposits: Deposit[];
  bullets: Bullet[];
  setMoney: (money: number) => void;
  clearTowers: () => void;
  buildTower: (tower: Tower) => void;
  destroyTower: (id: string) => void;
  setTowerType: (tower: string) => void;
  setDeposits: (deposits: Deposit[]) => void;
  addBullets: (bullets: Bullet[]) => void;
  setBullets: (bullets: Bullet[]) => void;
  setTowerHealth: (id: string, health: number) => void;
};

export const useGameState = create<GameState>()(immer((set) => ({
  money: 0,
  towers: [],
  deposits: [],
  activeTowerType: "basic",
  bullets: [],
  setMoney: (money: number) => set({ money }),
  clearTowers: () => {
    set((state) => {
      state.towers = [];
    });
  },
  buildTower: (tower: Tower) => {
    set((state) => {
      state.towers.push(tower);
    });
  },
  destroyTower: (id: string) => {
    set((state) => {
      console.log("destroying", id);
      console.log(state.towers.length);
      state.towers = state.towers.filter((tower: Tower) => tower.id !== id);
      console.log(state.towers.length);
    });
  },
  setTowerType: (tower: string) => {
    set({ activeTowerType: tower });
  },
  setDeposits: (deposits: Deposit[]) => {
    set({ deposits });
  },
  addBullets: (bullets: Bullet[]) => {
    set((state) => {
      state.bullets.push(...bullets);
    });
  },
  setBullets: (bullets: Bullet[]) => {
    set({ bullets });
  },
  setTowerHealth: (id: string, health: number) => {
    set((state) => {
      const tower = state.towers.find((tower) => tower.id === id);
      if (!tower) {
        return;
      }
      tower.health = health;
    });
  },
})));