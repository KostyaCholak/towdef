"use client";

import React, { useEffect, useRef, useState } from "react";
import { Circle, Layer, Line, Rect, Stage } from "react-konva";
// import { joinGameRoom, room } from "../utils/colyseusClient";
import { Deposit, GRID_CELLS_X, GRID_CELLS_Y, Tower } from "../../../types";
import { useGameState } from "../storage";
import { playerId, send } from "../utils/api";

const CELL_SIZE = 20;


const Grid = (props: {
  offset: { x: number, y: number },
  deposits: Deposit[],
}) => {
  const lines = [];

  for (let i = 0; i < GRID_CELLS_Y + 1; i++) {
    lines.push(<Line key={`h-${i}`} points={[0, i * CELL_SIZE, CELL_SIZE * GRID_CELLS_X, i * CELL_SIZE]} stroke="#ff758f32" strokeWidth={1} />);
  }

  for (let i = 0; i < GRID_CELLS_X + 1; i++) {
    lines.push(<Line key={`v-${i}`} points={[i * CELL_SIZE, 0, i * CELL_SIZE, CELL_SIZE * GRID_CELLS_Y]} stroke="#ff758f32" strokeWidth={1} />);
  }

  const deposits = props.deposits.map((deposit, index) => (
    <Line 
      points={[
        (deposit.x + 0.25) * CELL_SIZE,
        (deposit.y + 0.35) * CELL_SIZE,
        (deposit.x + 0.7) * CELL_SIZE, 
        (deposit.y + 0.3) * CELL_SIZE,
        (deposit.x + 0.5) * CELL_SIZE, 
        (deposit.y + 0.7) * CELL_SIZE,
      ]}
      key={index}
      closed={true}
      stroke="#ffca3a90"
      fill="#ffca3a53" />
  ));

  return (
    <Layer offset={props.offset}>
      {lines}
      {deposits}
    </Layer>
  )
}

const getPlayerCells = (towers: Tower[], plrId: string) => {
  const playerTowers = towers.filter((tower) => tower.owner === plrId);
  const allCapturedCells = playerTowers.map((tower) => tower.captured_cells);
  const flatCapturedCells = allCapturedCells.reduce((accumulator, value) => accumulator.concat(value), []);
  const cells = [];
  const color = plrId === playerId ? "#a1c18167" : "#e6394640";
  
  for (let i = 0; i < GRID_CELLS_Y; i++) {
    for (let j = 0; j < GRID_CELLS_X; j++) {
      const key = i * GRID_CELLS_X + j;
      if (flatCapturedCells.includes(key)) {
        cells.push(<Rect key={`${key}`} x={j * CELL_SIZE} y={i * CELL_SIZE} width={CELL_SIZE} height={CELL_SIZE} fill={color} />);
      }
    }
  }
  return cells;
}

const TowerComponent = (props: { tower: Tower }) => {
  if (props.tower.type === "miner") {
    return (
      <Rect
        x={props.tower.x * CELL_SIZE + CELL_SIZE / 6 }
        y={props.tower.y * CELL_SIZE + CELL_SIZE / 6 }
        width={CELL_SIZE / 1.5}
        height={CELL_SIZE / 1.5}
        fill="green"
      />
    );
  }
  return (
    <Circle
      x={props.tower.x * CELL_SIZE + CELL_SIZE / 2}
      y={props.tower.y * CELL_SIZE + CELL_SIZE / 2}
      radius={CELL_SIZE / 3}
      fill="red"
    />
  );
};

const Towers = (props: { offset: { x: number, y: number } }) => {
  const [towers] = useGameState((state) => [
    state.towers,
  ]);
  const allPlayers = [...new Set(towers.map((tower) => tower.owner))];
  allPlayers.sort((a, b) => a === playerId ? 1 : b === playerId ? -1 : 0);
  const allCells: JSX.Element[] = [];
  const allKeys: Set<string> = new Set();
  allPlayers.forEach((plrId) => {
    const plrCells = getPlayerCells(towers, plrId);
    for (const cell of plrCells) {
      if (allKeys.has(cell.key ?? "")) {
        continue;
      }
      allKeys.add(cell.key ?? "");
      allCells.push(cell);
    }
  });

  console.log('TL', towers.length);
  console.log(towers);

  return (
  <Layer offset={props.offset}>
    {allCells}
    {towers.map((tower, index) => (
      <TowerComponent key={index} tower={tower} />
    ))}
  </Layer>
 )
}

const Bullets = (props: { offset: { x: number, y: number } }) => {
  const [bullets, setBullets] = useGameState((state) => [
    state.bullets,
    state.setBullets,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newBullets = bullets.filter((bullet) => {
        if (bullet.x < -1 || bullet.x > GRID_CELLS_X + 1 || bullet.y < -1 || bullet.y > GRID_CELLS_Y + 1) {
          return false;
        }
        // if bullet is getting away from the target, return false
        if (Math.sign(bullet.dx) !== Math.sign(bullet.target.x - bullet.x) || Math.sign(bullet.dy) !== Math.sign(bullet.target.y - bullet.y)) {
          return false;
        }
        return true;
      }).map((bullet) => {
        const new_bullet = { ...bullet };
        new_bullet.x += bullet.dx;
        new_bullet.y += bullet.dy;
        return new_bullet;
      });
      setBullets(newBullets);
    }, 25);
    return () => clearInterval(interval);
  }, [bullets]);

  return (
    <Layer offset={props.offset}>
      {bullets.map((bullet, index) => (
        <Rect
          key={index}
          x={bullet.x * CELL_SIZE + CELL_SIZE * 0.375}
          y={bullet.y * CELL_SIZE + CELL_SIZE * 0.375}
          width={CELL_SIZE / 4}
          height={CELL_SIZE / 4}
          fill="black"
        />
      ))}
    </Layer>
  )
}

const GameCanvas: React.FC = () => {
  const [deposits, activeTowerType] = useGameState((state) => [
    state.deposits,
    state.activeTowerType,
  ]);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragStartPosition = useRef({ x: 0, y: 0 });

  const [offset, setOffset] = useState({ 
    x: CELL_SIZE * GRID_CELLS_X / 2 - window.innerWidth / 2,
    y: CELL_SIZE * GRID_CELLS_Y / 2 - window.innerHeight / 2,
  });

  const onMouseDown = (e: any) => {
    setIsMouseDown(true);
    dragStart.current = { x: e.pageX, y: e.pageY };
    dragStartPosition.current = { x: offset.x, y: offset.y };
  };

  const onMouseMove = (e: any) => {
    if (!isMouseDown) return;
    const dx = e.pageX - dragStart.current.x;
    const dy = e.pageY - dragStart.current.y;
    if (Math.sqrt(dx * dx + dy * dy) < 5) return;
    setDragging(true);
    setOffset({
        x: Math.min(Math.max(dragStartPosition.current.x - dx, 0), GRID_CELLS_X * CELL_SIZE - window.innerWidth),
        y: Math.min(Math.max(dragStartPosition.current.y - dy, 0), GRID_CELLS_Y * CELL_SIZE - window.innerHeight),
    });
  };

  const onMouseUp = (e: any) => {
    if (!dragging) {
      const x = Math.floor((e.pageX + offset.x) / CELL_SIZE);
      const y = Math.floor((e.pageY + offset.y) / CELL_SIZE);
      send("game.build", { 
        id: "", 
        x, 
        y, 
        type: activeTowerType ,
        owner: playerId,
      } as Tower);
    }
    setIsMouseDown(false);
    setDragging(false);
  };

  return (
    <div tabIndex={1} className="w-screen h-screen" onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseMove={onMouseMove}>
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Towers offset={offset} />
        <Bullets offset={offset} />
        <Grid offset={offset} deposits={deposits} />
      </Stage>
    </div>
  );
};

export default GameCanvas;
