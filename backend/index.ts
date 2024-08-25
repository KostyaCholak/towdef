import { v4 as uuid } from 'uuid';
import { Bullet, Deposit, GRID_CELLS_X, GRID_CELLS_Y, Player, Tower, towerConfigs } from '../types';
import { WebSocketServer } from 'ws';
import https from 'https';
import fs from 'fs';

// Load the self-signed certificate and key
const server = https.createServer({
  cert: fs.readFileSync('keys/cert.pem'),
  key: fs.readFileSync('keys/key.pem'),
});

// Create a WebSocket server using the HTTPS server
const ws = new WebSocketServer({ server });

const gameStarted = false;
const wss = new WebSocketServer({ port: 3001 });

const players = new Map<string, Player>();
const deposits: Deposit[] = [];

const callbacks = new Map<string, (ws: WebSocket, message: any) => void>();
const wsToId = new Map<WebSocket, string>();
const idToWs = new Map<string, WebSocket>();

function setCallback(message_type: string, callback: (ws: WebSocket, message: any) => void) {
  if (callbacks.has(message_type)) {
    throw new Error(`Callback for message type ${message_type} already exists`);
  }
  callbacks.set(message_type, callback);
}

const broadcast = (message_type: string, message: any) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: message_type, message: message }));
    }
  });
};

const send = (client: WebSocket, message_type: string, message: any) => {
  client.send(JSON.stringify({ type: message_type, message: message }));
};

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data: string) {
    console.log('received: %s', data);
    const message = JSON.parse(data);
    const callback = callbacks.get(message.type);
    if (callback) {
      callback(ws, message.message);
    } else {
      console.log(`No callback for message type ${message.type}`);
    }
  });

  ws.on('close', () => {
    const playerId = wsToId.get(ws);
    if (!playerId) {
      return;
    }
    console.log('Player disconnected:', playerId);
    wsToId.delete(ws);
    idToWs.delete(playerId);
    players.delete(playerId);
    broadcast('player.left', playerId);
  });
});

setCallback('player.join', (ws, player: Player) => {
  if (!players.has(player.id) || gameStarted) {
    players.set(player.id, player);
  } else {
    console.log("Player already exists");
    return;
  }

  towers.length = 0;
  deposits.length = 0;

  // const player2 = {
  //   id: "second",
  //   name: "second",
  //   money: 100,
  //   wins: 0,
  //   losses: 0,
  //   towers: [],
  // };
  // players.set("second", player2);

  broadcast('game.setup', {
    deposits: deposits,
  });

  player.money = 30;

  wsToId.set(ws, player.id);
  idToWs.set(player.id, ws);
  broadcast('player.joined', player);
  send(ws, 'you.state', player);

  if (players.size >= 2) {
    startGame();
  }
});

const startGame = () => {
  // take the first player
  const vals = players.values();
  const player1 = vals.next().value;
  const player2 = vals.next().value;

  const depositsCount = 200;
  for (let i = 0; i < depositsCount; i++) {
    let x = Math.floor(Math.random() * GRID_CELLS_X / 2);
    const y = Math.floor(Math.random() * GRID_CELLS_Y);
    console.log(x, 0.5 * GRID_CELLS_X / 2);
    if (x < 0.5 * GRID_CELLS_X / 2) {
      x += Math.floor(Math.random() * GRID_CELLS_X / 2);
    }
    if (deposits.find((deposit) => deposit.x === x && deposit.y === y)) {
      continue;
    }
    deposits.push({ x, y });
    deposits.push({ x: GRID_CELLS_X - x - 1, y });
  }

  broadcast('game.setup', {
    deposits: deposits,
  });

  const towerConfig = towerConfigs.get("basic");
  const [x, y] = [30, 20];
  if (!towerConfig) {
    return;
  }

  towers.push({
    id: uuid(),
    x: x,
    y: y,
    type: "basic",
    owner: player1.id,
    captured_cells: getSurroundingCells(x, y, towerConfig.territory_capture),
    health: towerConfig.health,
  });
  broadcast('game.build', towers[towers.length - 1]);

  towers.push({
    id: uuid(),
    x: GRID_CELLS_X - x - 1,
    y: y,
    type: "basic",
    owner: player2.id,
    captured_cells: getSurroundingCells(GRID_CELLS_X - x - 1, y, towerConfig.territory_capture),
    health: towerConfig.health,
  });
  broadcast('game.build', towers[towers.length - 1]);
};

const towers: Tower[] = [];

setCallback('game.build', (ws, tower: Tower) => {
  tower.x = Math.floor(tower.x);
  tower.y = Math.floor(tower.y);

  const player = players.get(wsToId.get(ws) ?? "");
  if (!player) {
    console.log("player not found");
    return;
  }

  const towerConfig = towerConfigs.get(tower.type);
  if (!towerConfig) {
    console.log("tower config not found");
    return;
  }

  if (player.money < towerConfig.price) {
    console.log("not enough money");
    return;
  }

  // check if there is a tower on the same position
  if (towers.find((tw) => tw.x === tower.x && tw.y === tower.y)) {
    console.log("tower already exists");
    return;
  }

  if (tower.type === "miner") {
    const deposit = deposits.find((deposit) => deposit.x === tower.x && deposit.y === tower.y);
    if (!deposit) {
      return;
    }
  }

  const myTowers = towers.filter((tower) => tower.owner === player.id);
  const allCapturedCells = myTowers.map((tower) => tower.captured_cells);
  const flatCapturedCells = allCapturedCells.reduce((accumulator, value) => accumulator.concat(value), []);
  const key = tower.y * GRID_CELLS_X + tower.x;
  if (!flatCapturedCells.includes(key)) {
    return;
  }
  const notMyTowers = towers.filter((tower) => tower.owner !== player.id);
  const _allCapturedCells = notMyTowers.map((tower) => tower.captured_cells);
  const _flatCapturedCells = _allCapturedCells.reduce((accumulator, value) => accumulator.concat(value), []);
  const _key = tower.y * GRID_CELLS_X + tower.x;
  if (_flatCapturedCells.includes(_key)) {
    return;
  }

  player.money -= towerConfig.price;

  tower.id = uuid();
  tower.health = towerConfig.health;
  tower.captured_cells = getSurroundingCells(tower.x, tower.y, towerConfig.territory_capture);
  towers.push(tower);

  broadcast('game.build', tower);

  send(ws, "you.state", player);
});

setCallback('game.destroy', (ws, data: { id: string, type: string }) => {
  const player = players.get(wsToId.get(ws) ?? "");
  if (!player) {
    console.log("player not found");
    return;
  }

  const tower = towers.find((tw) => tw.id === data.id);
  if (!tower) {
    console.log("tower not found");
    return;
  }
  if (tower.owner !== player.id) {
    console.log("not your tower");
    return;
  }
  const towerConfig = towerConfigs.get(tower.type);
  if (!towerConfig) {
    console.log("tower config not found");
    return;
  }

  const myTowers = towers.filter((tower) => tower.owner === player.id && (tower.captured_cells.length > 1 || towerConfig.territory_capture <= 1));
  if (myTowers.length === 1) {
    console.log("can't destroy last tower");
    return;
  }
  towers.splice(towers.indexOf(tower), 1);
  player.money += Math.round(towerConfig.price * 0.5 * (tower.health / towerConfig.health));
  broadcast('game.destroy', tower.id);
  send(ws, "you.state", player);
});

setInterval(() => {
  players.forEach((player) => {
    // find all miners
    const miners = towers.filter((tower) => tower.type === "miner" && tower.health > 0 && tower.owner === player.id);
    // increase the money of the player
    player.money += miners.length * 1 + 1;
    const ws = idToWs.get(player.id);
    if (!ws) {
      players.delete(player.id);
      return;
    }
    send(ws, 'you.state', player);
  });
}, 1000);

setInterval(() => {
  const newBullets: Bullet[] = [];

  towers.forEach((tower) => {
    if (tower.type === "miner") {
      return;
    }
    const radius = tower.type === "basic" ? 7 : 12;
    let target: Tower | null = null;
    let minDistance = Infinity;
    for (const otherTower of towers) {
      if (otherTower.owner === tower.owner) {
        continue;
      }
      if (otherTower.id === tower.id) {
        continue;
      }
      const distance = Math.sqrt(Math.pow(otherTower.x - tower.x, 2) + Math.pow(otherTower.y - tower.y, 2));
      if (distance < radius && distance < minDistance) {
        target = otherTower;
        minDistance = distance;
      }
    }
    if (!target) {
      return;
    }

    const towerConfig = towerConfigs.get(tower.type);
    if (!towerConfig) {
      console.log("tower config not found while attacking");
      return;
    }

    if (Math.random() * towerConfig.attackSpeed < 0.3) {
      return;
    }
    // create a bullet
    const speed = 0.3;
    let dx = target.x - tower.x;
    let dy = target.y - tower.y;
    // calculate from speed
    const currentSpeed = Math.sqrt(dx * dx + dy * dy);
    if (currentSpeed < 0.01) {
      return;
    }
    dx = dx / currentSpeed * speed;
    dy = dy / currentSpeed * speed;

    target.health -= 2;

    newBullets.push({
      id: uuid(),
      x: tower.x + dx,
      y: tower.y + dy,
      dx,
      dy,
      target: {
        x: target.x,
        y: target.y,
      }
    });
  });
  if (newBullets.length > 0) {
    broadcast('game.bullets', newBullets);
  }

  setTimeout(() => {
    // check if any towers are dead
    towers.forEach((tower) => {
      if (tower.health <= 0) {
        broadcast('game.destroy', tower.id);
        towers.splice(towers.indexOf(tower), 1);
      }
    });
  }, 400);
}, 1000);


function getSurroundingCells(x: number, y: number, radius: number) {
  const cells = [];
  for (let i = y - radius; i <= y + radius; i++) {
    for (let j = x - radius; j <= x + radius; j++) {
      const distance = Math.sqrt(Math.pow(i - y, 2) + Math.pow(j - x, 2));
      if (distance <= radius) {
        cells.push(i * GRID_CELLS_X + j);
      }
    }
  } 
  return cells;
}