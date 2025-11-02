import { useEffect, useRef, useState } from "react";
import { GameEngine } from "@/lib/game/GameEngine";
import HUD from "./HUD";
import GameOver from "./GameOver";

const Game = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState({
    health: 100,
    ammo: 30,
    reserve: 90,
    alphaScore: 0,
    bravoScore: 0,
    isReloading: false,
    isDead: false,
    gameOver: false,
    winningTeam: null as "alpha" | "bravo" | null,
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const gameEngine = new GameEngine(canvasRef.current, (state) => {
      setGameState(state);
    });

    gameEngineRef.current = gameEngine;
    gameEngine.start();

    return () => {
      gameEngine.dispose();
    };
  }, []);

  const handleRestart = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.restart();
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <div ref={canvasRef} className="w-full h-full" />
      
      {!gameState.gameOver && (
        <HUD
          health={gameState.health}
          ammo={gameState.ammo}
          reserve={gameState.reserve}
          alphaScore={gameState.alphaScore}
          bravoScore={gameState.bravoScore}
          isReloading={gameState.isReloading}
          isDead={gameState.isDead}
        />
      )}

      {gameState.gameOver && gameState.winningTeam && (
        <GameOver
          winningTeam={gameState.winningTeam}
          playerWon={gameState.winningTeam === "alpha"}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
};

export default Game;
