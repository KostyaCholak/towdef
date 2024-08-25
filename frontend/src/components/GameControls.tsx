import React, { useEffect } from "react";
import { Bullet, towerConfigs, type Deposit, type Tower } from "../../../types";
import { useGameState } from "../storage";
import { init, onMessage, onOpen } from "../utils/api";


const BuildTowerButton = (props: {
  tower_id: string;
  title: string;
  activeId: string;
  onActivate: (id: string) => void;
}) => {
  const isActive = props.activeId === props.tower_id;
  return (
    <button
      onClick={() => props.onActivate(props.tower_id)}
      className={`${isActive ? "bg-blue-500" : "bg-slate-400"} text-white p-2`}
    >
      {props.title}
    </button>
  );
};


const GameControls: React.FC = () => {
  const [
    money,
    setMoney,
    buildTower,
    destroyTower,
    activeTowerType, 
    setTowerType,
    setDeposits,
    addBullets,
  ] = useGameState((state) => [
    state.money,
    state.setMoney,
    state.buildTower,
    state.destroyTower,
    state.activeTowerType,
    state.setTowerType,
    state.setDeposits,
    state.addBullets,
  ]);

  useEffect(() => {
    onOpen("send_init", () => {
      console.log("Sending init");
      init();
    });
    onMessage("player.joined", (message: any) => {
      console.log("Player joined:", message);
    });
    onMessage("game.build", (tower: Tower) => {
      buildTower(tower);
    });
    onMessage("game.destroy", (message: any) => {
      console.log("Game destroy:", message);
      destroyTower(message);
    });
    onMessage("game.setup", (setup: { deposits: Deposit[] }) => {
      setDeposits(setup.deposits);
    });

    onMessage("you.state", (message: any) => {
      setMoney(message.money);
    });
    onMessage("game.bullets", (bullets: Bullet[]) => {
      addBullets(bullets);
    });
  }, []);

  return (
    <div className="fixed bottom-0 left-0 bg-slate-400 w-full p-0 text-white flex justify-between gap-2">
      <div className="flex gap-2">
        {Array.from(towerConfigs).map(([key, value]) => (
          <BuildTowerButton
            key={key}
            tower_id={key}
            title={value.name}
            activeId={activeTowerType}
            onActivate={setTowerType}
          />
        ))}
        
      </div>
      {/* Add more controls as needed */}
      <div className="flex flex-col justify-center px-2">
        <p>{money}$</p>
      </div>
    </div>
  );
};

export default GameControls;
