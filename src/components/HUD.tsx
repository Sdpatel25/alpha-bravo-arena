import { cn } from "@/lib/utils";

interface HUDProps {
  health: number;
  ammo: number;
  reserve: number;
  alphaScore: number;
  bravoScore: number;
  isReloading: boolean;
  isDead: boolean;
}

const HUD = ({
  health,
  ammo,
  reserve,
  alphaScore,
  bravoScore,
  isReloading,
  isDead,
}: HUDProps) => {
  const healthPercentage = (health / 100) * 100;
  const healthColor =
    health > 70
      ? "hsl(var(--health-high))"
      : health > 30
      ? "hsl(var(--health-medium))"
      : "hsl(var(--health-low))";

  return (
    <>
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative w-8 h-8">
          <div className="absolute top-1/2 left-0 w-3 h-0.5 bg-foreground -translate-y-1/2" />
          <div className="absolute top-1/2 right-0 w-3 h-0.5 bg-foreground -translate-y-1/2" />
          <div className="absolute top-0 left-1/2 w-0.5 h-3 bg-foreground -translate-x-1/2" />
          <div className="absolute bottom-0 left-1/2 w-0.5 h-3 bg-foreground -translate-x-1/2" />
        </div>
      </div>

      {/* Team Scores */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-black/80 rounded-lg backdrop-blur-sm border border-border shadow-[var(--shadow-hud)]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[hsl(var(--team-alpha))] shadow-[var(--shadow-glow-alpha)]" />
          <span className="text-[hsl(var(--team-alpha))] font-bold text-lg">
            ALPHA: {alphaScore}
          </span>
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[hsl(var(--team-bravo))] shadow-[var(--shadow-glow-bravo)]" />
          <span className="text-[hsl(var(--team-bravo))] font-bold text-lg">
            BRAVO: {bravoScore}
          </span>
        </div>
      </div>

      {/* Health Bar */}
      <div className="absolute bottom-8 left-8 flex flex-col gap-2">
        <div className="px-4 py-3 bg-black/80 rounded-lg backdrop-blur-sm border border-border shadow-[var(--shadow-hud)]">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">HP</span>
            <div className="w-48 h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${healthPercentage}%`,
                  backgroundColor: healthColor,
                }}
              />
            </div>
            <span
              className="text-lg font-bold tabular-nums min-w-[3ch]"
              style={{ color: healthColor }}
            >
              {health}
            </span>
          </div>
        </div>
      </div>

      {/* Ammo Counter */}
      <div className="absolute bottom-8 right-8">
        <div className="px-6 py-4 bg-black/80 rounded-lg backdrop-blur-sm border border-border shadow-[var(--shadow-hud)]">
          <div className="flex flex-col items-end">
            {isReloading ? (
              <span className="text-2xl font-bold text-accent animate-pulse-slow">
                RELOADING...
              </span>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground tabular-nums">
                    {ammo}
                  </span>
                  <span className="text-xl text-muted-foreground">/</span>
                  <span className="text-2xl text-muted-foreground tabular-nums">
                    {reserve}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  ASSAULT RIFLE
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Death Overlay */}
      {isDead && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none animate-slide-up">
          <div className="text-center">
            <h2 className="text-6xl font-bold text-destructive mb-2">
              ELIMINATED
            </h2>
            <p className="text-xl text-muted-foreground">Respawning...</p>
          </div>
        </div>
      )}

      {/* Controls Help */}
      <div className="absolute top-8 right-8 px-4 py-3 bg-black/60 rounded-lg backdrop-blur-sm border border-border text-xs text-muted-foreground">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span>WASD:</span>
          <span className="text-foreground">Move</span>
          <span>Mouse:</span>
          <span className="text-foreground">Aim</span>
          <span>LClick:</span>
          <span className="text-foreground">Shoot</span>
          <span>R:</span>
          <span className="text-foreground">Reload</span>
          <span>Space:</span>
          <span className="text-foreground">Jump</span>
          <span>C:</span>
          <span className="text-foreground">Camera</span>
        </div>
      </div>
    </>
  );
};

export default HUD;
