import * as THREE from "three";
import * as CANNON from "cannon-es";

export class Player {
  public position: THREE.Vector3;
  public body: CANNON.Body;
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private velocity: THREE.Vector3;
  private moveSpeed: number = 10;
  private jumpForce: number = 8;
  private isGrounded: boolean = false;
  private viewMode: "fpp" | "tpp" = "fpp";
  private mesh: THREE.Group;
  private weaponMesh: THREE.Mesh;
  private events: Map<string, Function[]> = new Map();

  // Input states
  private keys: { [key: string]: boolean } = {};
  private mouseMovement: THREE.Vector2 = new THREE.Vector2();
  private mousePressed: boolean = false;

  constructor(
    scene: THREE.Scene,
    world: CANNON.World,
    camera: THREE.Camera,
    domElement: HTMLElement
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.velocity = new THREE.Vector3();
    this.position = new THREE.Vector3(0, 2, 0);

    // Create humanoid player mesh - more realistic
    this.mesh = new THREE.Group();
    
    const bodyColor = 0x2196F3;
    const pantsColor = 0x1565C0;
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
    
    // Weapon - detailed assault rifle
    const weaponGroup = new THREE.Group();
    const weaponMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222222,
      roughness: 0.5,
      metalness: 0.8
    });
    
    // Main body
    const weaponBody = new THREE.BoxGeometry(0.12, 0.12, 0.7);
    this.weaponMesh = new THREE.Mesh(weaponBody, weaponMaterial);
    this.weaponMesh.castShadow = true;
    weaponGroup.add(this.weaponMesh);
    
    // Stock
    const stockGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.3);
    const stock = new THREE.Mesh(stockGeometry, weaponMaterial);
    stock.position.z = -0.5;
    stock.castShadow = true;
    weaponGroup.add(stock);
    
    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8);
    const barrel = new THREE.Mesh(barrelGeometry, weaponMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.575;
    barrel.castShadow = true;
    weaponGroup.add(barrel);
    
    // Magazine
    const magGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.06);
    const magMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const magazine = new THREE.Mesh(magGeometry, magMaterial);
    magazine.position.set(0, -0.15, 0.15);
    magazine.castShadow = true;
    weaponGroup.add(magazine);
    
    // Scope
    const scopeGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8);
    const scope = new THREE.Mesh(scopeGeometry, weaponMaterial);
    scope.rotation.z = Math.PI / 2;
    scope.position.set(0, 0.08, 0.1);
    scope.castShadow = true;
    weaponGroup.add(scope);
    
    // Position weapon in hands
    weaponGroup.position.set(0.3, 0.3, 0.35);
    weaponGroup.rotation.set(-0.2, -Math.PI / 6, 0);
    this.mesh.add(weaponGroup);
    
    scene.add(this.mesh);

    // Create physics body
    const shape = new CANNON.Cylinder(0.5, 0.5, 1.8, 8);
    this.body = new CANNON.Body({
      mass: 80,
      shape: shape,
      position: new CANNON.Vec3(0, 2, 0),
      linearDamping: 0.9,
      angularDamping: 0.9,
    });
    world.addBody(this.body);

    // Lock pointer on click
    this.domElement.addEventListener("click", () => {
      this.domElement.requestPointerLock();
    });

    // Input listeners
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("mouseup", this.onMouseUp);

    this.updateCameraPosition();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = true;

    if (e.key.toLowerCase() === "r") {
      this.emit("reload");
    }

    if (e.key.toLowerCase() === "c") {
      this.viewMode = this.viewMode === "fpp" ? "tpp" : "fpp";
      this.updateCameraPosition();
    }

    if (e.key === " " && this.isGrounded) {
      this.body.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement === this.domElement) {
      this.mouseMovement.x += e.movementX * 0.002;
      this.mouseMovement.y += e.movementY * 0.002;
      this.mouseMovement.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.mouseMovement.y));
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mousePressed = true;
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mousePressed = false;
    }
  };

  public update(delta: number) {
    // Check if grounded
    this.isGrounded = Math.abs(this.body.velocity.y) < 0.1;

    // Calculate movement direction
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);

    forward.applyEuler(new THREE.Euler(0, this.mouseMovement.x, 0));
    right.applyEuler(new THREE.Euler(0, this.mouseMovement.x, 0));

    const moveDirection = new THREE.Vector3();

    if (this.keys["w"]) moveDirection.add(forward);
    if (this.keys["s"]) moveDirection.sub(forward);
    if (this.keys["a"]) moveDirection.sub(right);
    if (this.keys["d"]) moveDirection.add(right);

    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      this.body.velocity.x = moveDirection.x * this.moveSpeed;
      this.body.velocity.z = moveDirection.z * this.moveSpeed;
    } else {
      this.body.velocity.x *= 0.9;
      this.body.velocity.z *= 0.9;
    }

    // Shooting
    if (this.mousePressed) {
      this.emit("shoot");
      this.mousePressed = false; // Single shot per click
    }

    // Update position
    this.position.set(this.body.position.x, this.body.position.y, this.body.position.z);
    this.mesh.position.copy(this.position);

    // Update camera
    this.updateCameraPosition();
  }

  private updateCameraPosition() {
    const eyeHeight = 1.6;
    
    if (this.viewMode === "fpp") {
      this.camera.position.set(
        this.position.x,
        this.position.y + eyeHeight,
        this.position.z
      );
      this.mesh.visible = false;
    } else {
      // TPP camera behind player
      const offset = new THREE.Vector3(0, 2, 5);
      offset.applyEuler(new THREE.Euler(0, this.mouseMovement.x, 0));
      this.camera.position.set(
        this.position.x + offset.x,
        this.position.y + offset.y,
        this.position.z + offset.z
      );
      this.mesh.visible = true;
    }

    this.camera.rotation.set(this.mouseMovement.y, this.mouseMovement.x, 0);
  }

  public on(event: string, callback: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  private emit(event: string, ...args: any[]) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(...args));
    }
  }

  public dispose() {
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("mouseup", this.onMouseUp);
  }
}
