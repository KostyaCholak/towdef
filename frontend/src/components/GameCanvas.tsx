"use client";

import React, { useEffect, useRef, useState } from "react";
import { Circle, Layer, Line, Rect, Stage } from "react-konva";
// import { joinGameRoom, room } from "../utils/colyseusClient";
import { Deposit, GRID_CELLS_X, GRID_CELLS_Y, Tower, towerConfigs } from "../../../types";
import { useGameState } from "../storage";
import { playerId, send } from "../utils/api";

const CELL_SIZE = 20;

const maxHealthMap = new Map<string, number>(
  Array.from(towerConfigs).map(([key, value]) => ([ key, value.health ]))
);

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
  const maxHealth = maxHealthMap.get(props.tower.type) ?? 0;
  const isFullHealth = props.tower.health === maxHealth;

  let healthBar = null;

  if (!isFullHealth) {
    healthBar = (
      <Rect
        x={props.tower.x * CELL_SIZE}
        y={props.tower.y * CELL_SIZE + CELL_SIZE - 4}
        width={CELL_SIZE * props.tower.health / maxHealth}
        height={2}
        fill="red"
        stroke="red"
      />
    );
  }

  if (props.tower.type === "wall") {
    return (
      <>
      <Rect
        x={props.tower.x * CELL_SIZE + CELL_SIZE * 0.1}
        y={props.tower.y * CELL_SIZE + CELL_SIZE * 0.1}
        width={CELL_SIZE * 0.8}
        height={CELL_SIZE * 0.8}
        fill="#3d405b"
      />
      {healthBar}
      </>
    );
  }

  if (props.tower.type === "miner") {
    return (
      <>
      <Rect
        x={props.tower.x * CELL_SIZE + CELL_SIZE / 6 }
        y={props.tower.y * CELL_SIZE + CELL_SIZE / 6 }
        width={CELL_SIZE / 1.5}
        height={CELL_SIZE / 1.5}
        fill="green"
      />
      {healthBar}
      </>
    );
  }
  return (
    <>
    <Circle
      x={props.tower.x * CELL_SIZE + CELL_SIZE / 2}
      y={props.tower.y * CELL_SIZE + CELL_SIZE / 2}
      radius={CELL_SIZE / 3}
      fill="blue"
    />
    {healthBar}
    </>
  );
};

const Towers = (props: { towers: Tower[], offset: { x: number, y: number } }) => {
  const allPlayers = [...new Set(props.towers.map((tower) => tower.owner))];
  allPlayers.sort((a, b) => a === playerId ? 1 : b === playerId ? -1 : 0);
  const allCells: JSX.Element[] = [];
  const allKeys: Set<string> = new Set();
  allPlayers.forEach((plrId) => {
    const plrCells = getPlayerCells(props.towers, plrId);
    for (const cell of plrCells) {
      if (allKeys.has(cell.key ?? "")) {
        continue;
      }
      allKeys.add(cell.key ?? "");
      allCells.push(cell);
    }
  });

  return (
  <Layer offset={props.offset}>
    {allCells}
    {props.towers.map((tower, index) => (
      <TowerComponent key={index} tower={tower} />
    ))}
  </Layer>
 )
}

const Bullets = (props: { offset: { x: number, y: number } }) => {
  const [bullets, towers, setBullets, setTowerHealth] = useGameState((state) => [
    state.bullets,
    state.towers,
    state.setBullets,
    state.setTowerHealth,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newBullets = bullets.filter((bullet) => {
        if (bullet.x < -1 || bullet.x > GRID_CELLS_X + 1 || bullet.y < -1 || bullet.y > GRID_CELLS_Y + 1) {
          return false;
        }
        // if bullet is getting away from the target, return false
        if (Math.sign(bullet.dx) !== Math.sign(bullet.target.x - bullet.x) || Math.sign(bullet.dy) !== Math.sign(bullet.target.y - bullet.y)) {
          // find the closest cell to the target
          const tower = towers.find((tower) => tower.x === bullet.target.x && tower.y === bullet.target.y);
          if (!tower) {
            console.log("no tower found on bullet impact");
            return false;
          }
          setTowerHealth(tower.id, Math.max(0, tower.health - 1));
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
  const [towers, deposits, activeTowerType, setTowerType] = useGameState((state) => [
    state.towers,
    state.deposits,
    state.activeTowerType,
    state.setTowerType,
  ]);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragStartPosition = useRef({ x: 0, y: 0 });

  const [offset, setOffset] = useState({ 
    x: CELL_SIZE * GRID_CELLS_X / 2 - window.innerWidth / 2,
    y: CELL_SIZE * GRID_CELLS_Y / 2 - window.innerHeight / 2,
  });
  const divRef = useRef<HTMLDivElement>(null);

  const onMouseDown = (e: any) => {
    if (e.button !== 0) {
      return;
    }
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
    if (e.button !== 0) {
      return;
    }
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

  const onContextMenu = (e: any) => {
    e.preventDefault();

    const x = Math.floor((e.pageX + offset.x) / CELL_SIZE);
    const y = Math.floor((e.pageY + offset.y) / CELL_SIZE);
    const tower = towers.find((tower: Tower) => tower.x === x && tower.y === y);
    console.log('destroying tower', tower);
    if (!tower) {
      return;
    }

    send("game.destroy", {
      id: tower.id,
      type: tower.type,
    } as Tower);
  };

  const onKeyDown = (e: any) => {
    const towerTypes = Array.from(towerConfigs).map(([key, _]) => key);
    for (let i = 0; i < towerTypes.length; i++) {
      console.log(e.key, (i + 1) + "");
      if (e.key === (i + 1) + "") {
        setTowerType(towerTypes[i]);
        break;
      }
    }
  };

  useEffect(() => {
    if (divRef.current) {
      divRef.current.focus();
    }
  }, [divRef]);

  return (
    <div tabIndex={1} className="w-screen h-screen" onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseMove={onMouseMove} onContextMenu={onContextMenu} onKeyDown={onKeyDown} ref={divRef}>
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Towers offset={offset} towers={towers} />
        <Bullets offset={offset} />
        <Grid offset={offset} deposits={deposits} />
      </Stage>
    </div>
  );
};

export default GameCanvas;
