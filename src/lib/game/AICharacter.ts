import * as THREE from "three";
import * as CANNON from "cannon-es";

export class AICharacter {
  public position: THREE.Vector3;
  public mesh: THREE.Mesh;
  public body: CANNON.Body;
  public team: "alpha" | "bravo";
  public health: number = 100;
  public isDead: boolean = false;
  private state: "idle" | "patrol" | "chase" | "attack" = "patrol";
  private patrolPoints: THREE.Vector3[] = [];
  private currentPatrolIndex: number = 0;
  private stateTimer: number = 0;
  private moveSpeed: number = 3;

  constructor(scene: THREE.Scene, world: CANNON.World, team: "alpha" | "bravo") {
    this.team = team;
    this.position = new THREE.Vector3();

    // Create mesh
    const geometry = new THREE.CapsuleGeometry(0.5, 1.5, 4, 8);
    const color = team === "alpha" ? 0x4a90e2 : 0xe24a4a;
    const material = new THREE.MeshStandardMaterial({ color });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    // Create physics body
    const shape = new CANNON.Cylinder(0.5, 0.5, 1.8, 8);
    this.body = new CANNON.Body({
      mass: 80,
      shape: shape,
      linearDamping: 0.9,
    });
    world.addBody(this.body);

    // Generate patrol points
    this.generatePatrolPoints();
  }

  private generatePatrolPoints() {
    const baseZ = this.team === "alpha" ? 20 : -20;
    const spread = 20;

    for (let i = 0; i < 4; i++) {
      const x = (Math.random() - 0.5) * spread;
      const z = baseZ + (Math.random() - 0.5) * 10;
      this.patrolPoints.push(new THREE.Vector3(x, 2, z));
    }
  }

  public update(delta: number, playerPos: THREE.Vector3, allAI: AICharacter[]) {
    if (this.isDead) {
      return;
    }

    this.stateTimer += delta;

    // Find nearest enemy
    let nearestEnemy: THREE.Vector3 | null = null;
    let nearestDistance = Infinity;

    // Check player if on opposite team
    const distToPlayer = this.position.distanceTo(playerPos);
    if (distToPlayer < 40) {
      nearestEnemy = playerPos;
      nearestDistance = distToPlayer;
    }

    // Check other AI
    for (const ai of allAI) {
      if (ai !== this && ai.team !== this.team && !ai.isDead) {
        const dist = this.position.distanceTo(ai.position);
        if (dist < nearestDistance && dist < 40) {
          nearestEnemy = ai.position;
          nearestDistance = dist;
        }
      }
    }

    // State machine
    if (nearestEnemy && nearestDistance < 30) {
      this.state = "attack";
    } else if (nearestEnemy && nearestDistance < 40) {
      this.state = "chase";
    } else if (this.stateTimer > 5) {
      this.state = "patrol";
      this.stateTimer = 0;
    }

    // Execute state behavior
    switch (this.state) {
      case "patrol":
        this.patrol();
        break;
      case "chase":
        if (nearestEnemy) this.moveTowards(nearestEnemy);
        break;
      case "attack":
        if (nearestEnemy) this.lookAt(nearestEnemy);
        break;
    }

    // Update position
    this.position.set(this.body.position.x, this.body.position.y, this.body.position.z);
    this.mesh.position.copy(this.position);
  }

  private patrol() {
    const target = this.patrolPoints[this.currentPatrolIndex];
    const distance = this.position.distanceTo(target);

    if (distance < 2) {
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
    } else {
      this.moveTowards(target);
    }
  }

  private moveTowards(target: THREE.Vector3) {
    const direction = new THREE.Vector3()
      .subVectors(target, this.position)
      .normalize();

    this.body.velocity.x = direction.x * this.moveSpeed;
    this.body.velocity.z = direction.z * this.moveSpeed;

    this.lookAt(target);
  }

  private lookAt(target: THREE.Vector3) {
    const direction = new THREE.Vector3().subVectors(target, this.position);
    const angle = Math.atan2(direction.x, direction.z);
    this.mesh.rotation.y = angle;
  }

  public canShoot(target: THREE.Vector3): boolean {
    if (this.isDead) return false;

    const distance = this.position.distanceTo(target);
    if (distance > 30) return false;

    // Simple line of sight check
    const direction = new THREE.Vector3().subVectors(target, this.position).normalize();
    const dot = direction.dot(this.getForwardVector());

    return dot > 0.7; // Within ~45 degree cone
  }

  private getForwardVector(): THREE.Vector3 {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyEuler(this.mesh.rotation);
    return forward;
  }

  public takeDamage(amount: number) {
    if (this.isDead) return;

    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }

  private die() {
    this.isDead = true;
    this.mesh.visible = false;
    this.body.collisionResponse = false;
  }

  public reset() {
    this.health = 100;
    this.isDead = false;
    this.mesh.visible = true;
    this.body.collisionResponse = true;
    this.state = "patrol";
    this.stateTimer = 0;
    this.currentPatrolIndex = 0;
  }
}
