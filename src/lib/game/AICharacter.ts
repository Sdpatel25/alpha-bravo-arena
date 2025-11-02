import * as THREE from "three";
import * as CANNON from "cannon-es";

export class AICharacter {
  public position: THREE.Vector3;
  public mesh: THREE.Group;
  public body: CANNON.Body;
  private weaponMesh: THREE.Group;
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

    // Create humanoid mesh
    this.mesh = new THREE.Group();
    
    const bodyColor = team === "alpha" ? 0x2196F3 : 0xF44336;
    const pantsColor = team === "alpha" ? 0x1565C0 : 0xB71C1C;
    const skinColor = 0xFFDBAC;
    
    // Torso
    const torsoGeometry = new THREE.BoxGeometry(0.6, 1.0, 0.35);
    const torsoMaterial = new THREE.MeshStandardMaterial({ 
      color: bodyColor,
      roughness: 0.7,
      metalness: 0.2
    });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.y = 0.5;
    torso.castShadow = true;
    this.mesh.add(torso);
    
    // Head with better proportions
    const headGeometry = new THREE.BoxGeometry(0.35, 0.4, 0.35);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: skinColor,
      roughness: 0.8
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.3;
    head.castShadow = true;
    this.mesh.add(head);
    
    // Neck
    const neckGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8);
    const neck = new THREE.Mesh(neckGeometry, headMaterial);
    neck.position.y = 1.05;
    neck.castShadow = true;
    this.mesh.add(neck);
    
    // Arms with shoulders
    const upperArmGeometry = new THREE.CylinderGeometry(0.1, 0.08, 0.5, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ 
      color: bodyColor,
      roughness: 0.7
    });
    const forearmGeometry = new THREE.CylinderGeometry(0.08, 0.07, 0.5, 8);
    const handMaterial = new THREE.MeshStandardMaterial({ color: skinColor });
    
    // Left arm
    const leftShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), armMaterial);
    leftShoulder.position.set(-0.45, 0.8, 0);
    leftShoulder.castShadow = true;
    this.mesh.add(leftShoulder);
    
    const leftUpperArm = new THREE.Mesh(upperArmGeometry, armMaterial);
    leftUpperArm.position.set(-0.45, 0.5, 0);
    leftUpperArm.castShadow = true;
    this.mesh.add(leftUpperArm);
    
    const leftForearm = new THREE.Mesh(forearmGeometry, handMaterial);
    leftForearm.position.set(-0.45, 0.05, 0.1);
    leftForearm.rotation.x = -0.3;
    leftForearm.castShadow = true;
    this.mesh.add(leftForearm);
    
    // Right arm
    const rightShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), armMaterial);
    rightShoulder.position.set(0.45, 0.8, 0);
    rightShoulder.castShadow = true;
    this.mesh.add(rightShoulder);
    
    const rightUpperArm = new THREE.Mesh(upperArmGeometry, armMaterial);
    rightUpperArm.position.set(0.45, 0.5, 0);
    rightUpperArm.castShadow = true;
    this.mesh.add(rightUpperArm);
    
    const rightForearm = new THREE.Mesh(forearmGeometry, handMaterial);
    rightForearm.position.set(0.45, 0.05, 0.1);
    rightForearm.rotation.x = -0.3;
    rightForearm.castShadow = true;
    this.mesh.add(rightForearm);
    
    // Legs with hips
    const upperLegGeometry = new THREE.CylinderGeometry(0.13, 0.11, 0.55, 8);
    const lowerLegGeometry = new THREE.CylinderGeometry(0.11, 0.09, 0.55, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ 
      color: pantsColor,
      roughness: 0.8
    });
    
    // Left leg
    const leftHip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), legMaterial);
    leftHip.position.set(-0.2, 0, 0);
    leftHip.castShadow = true;
    this.mesh.add(leftHip);
    
    const leftUpperLeg = new THREE.Mesh(upperLegGeometry, legMaterial);
    leftUpperLeg.position.set(-0.2, -0.3, 0);
    leftUpperLeg.castShadow = true;
    this.mesh.add(leftUpperLeg);
    
    const leftLowerLeg = new THREE.Mesh(lowerLegGeometry, legMaterial);
    leftLowerLeg.position.set(-0.2, -0.85, 0);
    leftLowerLeg.castShadow = true;
    this.mesh.add(leftLowerLeg);
    
    // Right leg
    const rightHip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), legMaterial);
    rightHip.position.set(0.2, 0, 0);
    rightHip.castShadow = true;
    this.mesh.add(rightHip);
    
    const rightUpperLeg = new THREE.Mesh(upperLegGeometry, legMaterial);
    rightUpperLeg.position.set(0.2, -0.3, 0);
    rightUpperLeg.castShadow = true;
    this.mesh.add(rightUpperLeg);
    
    const rightLowerLeg = new THREE.Mesh(lowerLegGeometry, legMaterial);
    rightLowerLeg.position.set(0.2, -0.85, 0);
    rightLowerLeg.castShadow = true;
    this.mesh.add(rightLowerLeg);
    
    // Weapon - more detailed assault rifle
    this.weaponMesh = new THREE.Group();
    const weaponMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222222,
      roughness: 0.5,
      metalness: 0.8
    });
    
    // Main body
    const weaponBody = new THREE.BoxGeometry(0.12, 0.12, 0.7);
    const weapon = new THREE.Mesh(weaponBody, weaponMaterial);
    weapon.castShadow = true;
    this.weaponMesh.add(weapon);
    
    // Stock
    const stockGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.3);
    const stock = new THREE.Mesh(stockGeometry, weaponMaterial);
    stock.position.z = -0.5;
    stock.castShadow = true;
    this.weaponMesh.add(stock);
    
    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8);
    const barrel = new THREE.Mesh(barrelGeometry, weaponMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.575;
    barrel.castShadow = true;
    this.weaponMesh.add(barrel);
    
    // Magazine
    const magGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.06);
    const magMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const magazine = new THREE.Mesh(magGeometry, magMaterial);
    magazine.position.set(0, -0.15, 0.15);
    magazine.castShadow = true;
    this.weaponMesh.add(magazine);
    
    // Scope
    const scopeGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8);
    const scope = new THREE.Mesh(scopeGeometry, weaponMaterial);
    scope.rotation.z = Math.PI / 2;
    scope.position.set(0, 0.08, 0.1);
    scope.castShadow = true;
    this.weaponMesh.add(scope);
    
    // Position weapon in hands
    this.weaponMesh.position.set(0.3, 0.3, 0.35);
    this.weaponMesh.rotation.set(-0.2, -Math.PI / 6, 0);
    this.mesh.add(this.weaponMesh);
    
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
