import { Button } from "@/components/ui/button";

interface GameOverProps {
  winningTeam: "alpha" | "bravo";
  playerWon: boolean;
  onRestart: () => void;
}

const GameOver = ({ winningTeam, playerWon, onRestart }: GameOverProps) => {
  const teamColor = winningTeam === "alpha" ? "hsl(var(--team-alpha))" : "hsl(var(--team-bravo))";
  const teamName = winningTeam === "alpha" ? "ALPHA" : "BRAVO";

  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center animate-slide-up">
      <div className="text-center space-y-8">
        <div>
          <h1
            className="text-8xl font-bold mb-4"
            style={{ color: teamColor, textShadow: `0 0 40px ${teamColor}` }}
          >
            {playerWon ? "VICTORY" : "DEFEAT"}
          </h1>
          <p className="text-3xl text-muted-foreground">
            Team <span style={{ color: teamColor }}>{teamName}</span> Wins!
          </p>
          <p className="text-xl text-muted-foreground mt-2">20 Eliminations</p>
        </div>

        <Button
          onClick={onRestart}
          size="lg"
          className="text-xl px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
        >
          PLAY AGAIN
        </Button>
      </div>
    </div>
  );
};

export default GameOver;
