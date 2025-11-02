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

    // Create humanoid player mesh
    this.mesh = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.4);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2196F3 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    body.castShadow = true;
    this.mesh.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBAC });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    head.castShadow = true;
    this.mesh.add(head);
    
    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBAC });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.5, 0.6, 0);
    leftArm.castShadow = true;
    this.mesh.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.5, 0.6, 0);
    rightArm.castShadow = true;
    this.mesh.add(rightArm);
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.9, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x1976D2 });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.25, -0.45, 0);
    leftLeg.castShadow = true;
    this.mesh.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.25, -0.45, 0);
    rightLeg.castShadow = true;
    this.mesh.add(rightLeg);
    
    // Weapon
    const weaponGroup = new THREE.Group();
    const weaponBody = new THREE.BoxGeometry(0.15, 0.15, 0.8);
    const weaponMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    this.weaponMesh = new THREE.Mesh(weaponBody, weaponMaterial);
    this.weaponMesh.castShadow = true;
    weaponGroup.add(this.weaponMesh);
    
    // Weapon barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
    const barrel = new THREE.Mesh(barrelGeometry, weaponMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.6;
    weaponGroup.add(barrel);
    
    weaponGroup.position.set(0.35, 0.8, 0.3);
    weaponGroup.rotation.y = -Math.PI / 4;
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
