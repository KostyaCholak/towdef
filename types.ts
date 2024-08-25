export const GRID_CELLS_X = 100;
export const GRID_CELLS_Y = 50;

// Define the configuration for different types of towers
export type TowerConfig = {
  price: number;
  name: string;
  description: string;
  territory_capture: number; // Amount of territory captured by this tower
  health: number;
  attackSpeed: number;
};

// Define a player with a unique ID, name, money, and a list of towers they own
export type Player = {
  id: string;
  name: string;
  money: number;
  wins: number;
  losses: number;
  towers: Tower[]; // List of towers owned by the player
};

// Define a tower with its position on the grid and type
export type Tower = {
  id: string;
  x: number; // X-coordinate of the tower on the grid
  y: number; // Y-coordinate of the tower on the grid
  type: string; // Type of the tower (references TowerConfig)
  owner: string; // ID of the player who owns the tower
  captured_cells: number[];
  health: number;
};

export type Deposit = {
  x: number;
  y: number;
};

// Define a bullet with its position and movement direction
export type Bullet = {
  id: string;
  x: number; // X-coordinate of the bullet
  y: number; // Y-coordinate of the bullet
  dx: number; // Change in X per update (direction/speed)
  dy: number; // Change in Y per update (direction/speed)
  target: {
    x: number;
    y: number;
  }
};

// Define the overall game state
export type GameState = {
  players: Map<string, Player>; // Map of player IDs to Player objects
  bullets: Bullet[]; // List of active bullets in the game
  towerConfig: Map<string, TowerConfig>; // Configuration for different tower types
};

export const towerConfigs = new Map<string, TowerConfig>([
  ["basic", { price: 20, name: "Basic", description: "Basic tower", territory_capture: 4, health: 20, attackSpeed: 0.5 }],
  ["advanced", { price: 40, name: "Advanced", description: "Advanced tower", territory_capture: 7, health: 30, attackSpeed: 1.0 }],
  ["miner", { price: 20, name: "Miner", description: "Miner tower", territory_capture: 1, health: 10, attackSpeed: 0.0 }],
  ["wall", { price: 20, name: "Wall", description: "Wall tower", territory_capture: 1, health: 50, attackSpeed: 0.0 }],
]);