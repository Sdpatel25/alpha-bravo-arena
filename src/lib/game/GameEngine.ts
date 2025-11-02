import * as THREE from "three";
import * as CANNON from "cannon-es";
import { Player } from "./Player";
import { AICharacter } from "./AICharacter";
import { GameMap } from "./GameMap";

interface GameState {
  health: number;
  ammo: number;
  reserve: number;
  alphaScore: number;
  bravoScore: number;
  isReloading: boolean;
  isDead: boolean;
  gameOver: boolean;
  winningTeam: "alpha" | "bravo" | null;
}

export class GameEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private world: CANNON.World;
  private player: Player;
  private aiCharacters: AICharacter[] = [];
  private gameMap: GameMap;
  private animationId: number | null = null;
  private clock: THREE.Clock;
  private updateCallback: (state: GameState) => void;
  private gameState: GameState;

  constructor(container: HTMLElement, updateCallback: (state: GameState) => void) {
    this.updateCallback = updateCallback;
    this.clock = new THREE.Clock();

    // Initialize game state
    this.gameState = {
      health: 100,
      ammo: 30,
      reserve: 90,
      alphaScore: 0,
      bravoScore: 0,
      isReloading: false,
      isDead: false,
      gameOver: false,
      winningTeam: null,
    };

    // Setup Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a0033);
    this.scene.fog = new THREE.Fog(0x1a0033, 50, 200);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Setup Cannon.js physics
    this.world = new CANNON.World();
    this.world.gravity.set(0, -20, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();

    // Setup lighting
    this.setupLighting();

    // Create map
    this.gameMap = new GameMap(this.scene, this.world);

    // Create player
    this.player = new Player(this.scene, this.world, this.camera, this.renderer.domElement);
    this.player.position.set(0, 2, 30);

    // Create AI characters
    this.createAICharacters();

    // Handle window resize
    window.addEventListener("resize", this.handleResize);

    // Setup player event listeners
    this.setupPlayerEvents();
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    // Colorful atmospheric point lights
    const pointLight1 = new THREE.PointLight(0x00D9FF, 1.0, 60);
    pointLight1.position.set(-20, 10, -20);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xFF00E5, 1.0, 60);
    pointLight2.position.set(20, 10, 20);
    this.scene.add(pointLight2);
    
    const pointLight3 = new THREE.PointLight(0xFFE600, 0.8, 50);
    pointLight3.position.set(0, 15, 0);
    this.scene.add(pointLight3);
  }

  private createAICharacters() {
    // Create 4 Alpha team AI (player's teammates)
    const alphaPositions = [
      new THREE.Vector3(-10, 2, 25),
      new THREE.Vector3(10, 2, 25),
      new THREE.Vector3(-15, 2, 20),
      new THREE.Vector3(15, 2, 20),
    ];

    alphaPositions.forEach((pos) => {
      const ai = new AICharacter(this.scene, this.world, "alpha");
      ai.position.copy(pos);
      this.aiCharacters.push(ai);
    });

    // Create 5 Bravo team AI (enemies)
    const bravoPositions = [
      new THREE.Vector3(0, 2, -30),
      new THREE.Vector3(-12, 2, -25),
      new THREE.Vector3(12, 2, -25),
      new THREE.Vector3(-18, 2, -30),
      new THREE.Vector3(18, 2, -30),
    ];

    bravoPositions.forEach((pos) => {
      const ai = new AICharacter(this.scene, this.world, "bravo");
      ai.position.copy(pos);
      this.aiCharacters.push(ai);
    });
  }

  private setupPlayerEvents() {
    this.player.on("shoot", () => {
      this.handlePlayerShoot();
    });

    this.player.on("reload", () => {
      this.handlePlayerReload();
    });

    this.player.on("hit", (damage: number) => {
      this.gameState.health = Math.max(0, this.gameState.health - damage);
      if (this.gameState.health <= 0 && !this.gameState.isDead) {
        this.handlePlayerDeath();
      }
      this.notifyStateUpdate();
    });
  }

  private handlePlayerShoot() {
    if (this.gameState.isDead || this.gameState.isReloading || this.gameState.ammo <= 0) {
      return;
    }

    this.gameState.ammo--;
    this.notifyStateUpdate();

    // Get shoot direction from camera
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const startPos = this.camera.position.clone();

    // Create bullet tracer
    this.createBulletTracer(startPos, direction);

    // Raycast for hit detection
    const raycaster = new THREE.Raycaster();
    raycaster.set(startPos, direction);

    // Check if we hit any AI
    for (const ai of this.aiCharacters) {
      if (ai.team === "bravo" && !ai.isDead) {
        const intersects = raycaster.intersectObject(ai.mesh, true);
        if (intersects.length > 0 && intersects[0].distance < 150) {
          ai.takeDamage(25);
          if (ai.isDead) {
            this.gameState.alphaScore++;
            this.scheduleRespawn(ai);
            this.checkGameOver();
          }
          this.notifyStateUpdate();
          break;
        }
      }
    }
  }

  private createBulletTracer(startPos: THREE.Vector3, direction: THREE.Vector3) {
    // Create a glowing sphere as bullet
    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFF00,
      transparent: true,
      opacity: 1.0,
    });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFF00,
      transparent: true,
      opacity: 0.3,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    bullet.add(glow);
    
    bullet.position.copy(startPos);
    this.scene.add(bullet);
    
    // Create trail
    const trailGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFAA00,
      transparent: true,
      opacity: 0.6,
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.position.copy(startPos);
    const endPos = startPos.clone().add(direction.clone().multiplyScalar(0.5));
    trail.lookAt(endPos);
    trail.rotateX(Math.PI / 2);
    this.scene.add(trail);
    
    // Animate bullet
    let distance = 0;
    const speed = 100;
    const maxDistance = 150;
    const animate = () => {
      distance += speed * 0.016;
      const movement = direction.clone().multiplyScalar(speed * 0.016);
      bullet.position.add(movement);
      trail.position.copy(bullet.position);
      
      // Fade out
      (bulletMaterial as THREE.MeshBasicMaterial).opacity -= 0.02;
      (glowMaterial as THREE.MeshBasicMaterial).opacity -= 0.01;
      (trailMaterial as THREE.MeshBasicMaterial).opacity -= 0.03;
      
      if (distance < maxDistance && (bulletMaterial as THREE.MeshBasicMaterial).opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(bullet);
        this.scene.remove(trail);
        bulletGeometry.dispose();
        bulletMaterial.dispose();
        glowGeometry.dispose();
        glowMaterial.dispose();
        trailGeometry.dispose();
        trailMaterial.dispose();
      }
    };
    animate();
  }

  private handlePlayerReload() {
    if (this.gameState.isReloading || this.gameState.reserve <= 0 || this.gameState.ammo === 30) {
      return;
    }

    this.gameState.isReloading = true;
    this.notifyStateUpdate();

    setTimeout(() => {
      const ammoNeeded = 30 - this.gameState.ammo;
      const ammoToReload = Math.min(ammoNeeded, this.gameState.reserve);
      this.gameState.ammo += ammoToReload;
      this.gameState.reserve -= ammoToReload;
      this.gameState.isReloading = false;
      this.notifyStateUpdate();
    }, 2000);
  }

  private handlePlayerDeath() {
    this.gameState.isDead = true;
    this.gameState.bravoScore++;
    this.notifyStateUpdate();
    this.checkGameOver();

    if (!this.gameState.gameOver) {
      setTimeout(() => {
        this.respawnPlayer();
      }, 3000);
    }
  }

  private respawnPlayer() {
    this.gameState.health = 100;
    this.gameState.ammo = 30;
    this.gameState.reserve = 90;
    this.gameState.isDead = false;
    this.player.position.set(0, 2, 30);
    this.notifyStateUpdate();
  }

  private scheduleRespawn(ai: AICharacter) {
    setTimeout(() => {
      if (!this.gameState.gameOver) {
        const spawnZ = ai.team === "alpha" ? 20 : -20;
        const spawnX = (Math.random() - 0.5) * 30;
        ai.position.set(spawnX, 2, spawnZ);
        ai.reset();
      }
    }, 5000);
  }

  private checkGameOver() {
    if (this.gameState.alphaScore >= 20) {
      this.gameState.gameOver = true;
      this.gameState.winningTeam = "alpha";
      this.notifyStateUpdate();
    } else if (this.gameState.bravoScore >= 20) {
      this.gameState.gameOver = true;
      this.gameState.winningTeam = "bravo";
      this.notifyStateUpdate();
    }
  }

  private notifyStateUpdate() {
    this.updateCallback({ ...this.gameState });
  }

  private handleResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    if (this.gameState.gameOver) {
      return;
    }

    const delta = this.clock.getDelta();

    // Update physics
    this.world.step(1 / 60, delta, 3);

    // Update player
    this.player.update(delta);

    // Update AI characters
    const aliveCharacters = this.aiCharacters.filter((ai) => !ai.isDead);
    
    for (const ai of aliveCharacters) {
      ai.update(delta, this.player.position, aliveCharacters);
      
      // AI shooting at player (only enemies)
      if (ai.team === "bravo" && ai.canShoot(this.player.position)) {
        if (Math.random() < 0.015) {
          const direction = new THREE.Vector3()
            .subVectors(this.player.position, ai.position)
            .normalize();
          this.createBulletTracer(ai.position.clone().add(new THREE.Vector3(0, 1.5, 0)), direction);
          
          // Random accuracy
          if (Math.random() < 0.6) {
            this.gameState.health = Math.max(0, this.gameState.health - 10);
            if (this.gameState.health <= 0 && !this.gameState.isDead) {
              this.handlePlayerDeath();
            }
            this.notifyStateUpdate();
          }
        }
      }

      // Teammates shooting at enemies
      if (ai.team === "alpha") {
        for (const enemy of aliveCharacters) {
          if (enemy.team === "bravo" && ai.canShoot(enemy.position)) {
            if (Math.random() < 0.012) {
              const direction = new THREE.Vector3()
                .subVectors(enemy.position, ai.position)
                .normalize();
              this.createBulletTracer(ai.position.clone().add(new THREE.Vector3(0, 1.5, 0)), direction);
              
              // Teammates have good accuracy
              if (Math.random() < 0.7) {
                enemy.takeDamage(15);
                if (enemy.isDead) {
                  this.gameState.alphaScore++;
                  this.scheduleRespawn(enemy);
                  this.checkGameOver();
                  this.notifyStateUpdate();
                }
              }
              break;
            }
          }
        }
      }

      // Enemies shooting at teammates
      if (ai.team === "bravo") {
        for (const teammate of aliveCharacters) {
          if (teammate.team === "alpha" && ai.canShoot(teammate.position)) {
            if (Math.random() < 0.01) {
              const direction = new THREE.Vector3()
                .subVectors(teammate.position, ai.position)
                .normalize();
              this.createBulletTracer(ai.position.clone().add(new THREE.Vector3(0, 1.5, 0)), direction);
              
              if (Math.random() < 0.5) {
                teammate.takeDamage(15);
                if (teammate.isDead) {
                  this.gameState.bravoScore++;
                  this.scheduleRespawn(teammate);
                  this.checkGameOver();
                  this.notifyStateUpdate();
                }
              }
              break;
            }
          }
        }
      }
    }

    // Render
    this.renderer.render(this.scene, this.camera);
  };

  public start() {
    this.animate();
    this.notifyStateUpdate();
  }

  public restart() {
    this.gameState = {
      health: 100,
      ammo: 30,
      reserve: 90,
      alphaScore: 0,
      bravoScore: 0,
      isReloading: false,
      isDead: false,
      gameOver: false,
      winningTeam: null,
    };

    // Respawn player
    this.player.position.set(0, 2, 30);

    // Reset all AI
    this.aiCharacters.forEach((ai) => {
      ai.reset();
    });

    // Reposition AI
    let alphaIndex = 0;
    let bravoIndex = 0;
    const alphaPositions = [
      new THREE.Vector3(-10, 2, 25),
      new THREE.Vector3(10, 2, 25),
      new THREE.Vector3(-15, 2, 20),
      new THREE.Vector3(15, 2, 20),
    ];
    const bravoPositions = [
      new THREE.Vector3(0, 2, -30),
      new THREE.Vector3(-12, 2, -25),
      new THREE.Vector3(12, 2, -25),
      new THREE.Vector3(-18, 2, -30),
      new THREE.Vector3(18, 2, -30),
    ];

    this.aiCharacters.forEach((ai) => {
      if (ai.team === "alpha") {
        ai.position.copy(alphaPositions[alphaIndex++]);
      } else {
        ai.position.copy(bravoPositions[bravoIndex++]);
      }
    });

    this.notifyStateUpdate();
  }

  public dispose() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener("resize", this.handleResize);
    this.player.dispose();
    this.renderer.dispose();
  }
}
