import * as THREE from "three";
import * as CANNON from "cannon-es";

export class GameMap {
  constructor(scene: THREE.Scene, world: CANNON.World) {
    this.createGround(scene, world);
    this.createWalls(scene, world);
    this.createObstacles(scene, world);
  }

  private createGround(scene: THREE.Scene, world: CANNON.World) {
    const size = 100;
    const segments = 20;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    
    // Create a checkered pattern with colors
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      const x = Math.floor((i % (segments + 1)) / 2);
      const y = Math.floor(i / ((segments + 1) * 2));
      const isEven = (x + y) % 2 === 0;
      
      if (isEven) {
        colors[i * 3] = 0.3;     // R
        colors[i * 3 + 1] = 0.5; // G
        colors[i * 3 + 2] = 0.3; // B
      } else {
        colors[i * 3] = 0.4;     // R
        colors[i * 3 + 1] = 0.4; // G
        colors[i * 3 + 2] = 0.5; // B
      }
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.7,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Physics
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);
  }

  private createWalls(scene: THREE.Scene, world: CANNON.World) {
    const wallHeight = 5;
    const wallThickness = 1;
    const arenaSize = 50;

    const wallData = [
      { x: 0, z: arenaSize / 2, width: arenaSize, depth: wallThickness },
      { x: 0, z: -arenaSize / 2, width: arenaSize, depth: wallThickness },
      { x: arenaSize / 2, z: 0, width: wallThickness, depth: arenaSize },
      { x: -arenaSize / 2, z: 0, width: wallThickness, depth: arenaSize },
    ];

    wallData.forEach((data) => {
      this.createWall(scene, world, data.x, data.z, data.width, wallHeight, data.depth);
    });
  }

  private createWall(
    scene: THREE.Scene,
    world: CANNON.World,
    x: number,
    z: number,
    width: number,
    height: number,
    depth: number
  ) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    
    // Colorful walls with gradient effect
    const wallColors = [0xFF6B6B, 0x4ECDC4, 0xFFE66D, 0x95E1D3];
    const colorIndex = Math.floor(Math.random() * wallColors.length);
    
    const material = new THREE.MeshStandardMaterial({
      color: wallColors[colorIndex],
      roughness: 0.6,
      metalness: 0.3,
      emissive: wallColors[colorIndex],
      emissiveIntensity: 0.1,
    });
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(x, height / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);

    // Physics
    const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
    const body = new CANNON.Body({ mass: 0 });
    body.addShape(shape);
    body.position.set(x, height / 2, z);
    world.addBody(body);
  }

  private createObstacles(scene: THREE.Scene, world: CANNON.World) {
    // Create cover boxes scattered around the map
    const obstacles = [
      { x: -15, z: 10, size: 3 },
      { x: 15, z: 10, size: 3 },
      { x: -15, z: -10, size: 3 },
      { x: 15, z: -10, size: 3 },
      { x: 0, z: 0, size: 4 },
      { x: -20, z: 0, size: 2.5 },
      { x: 20, z: 0, size: 2.5 },
      { x: 0, z: 15, size: 2 },
      { x: 0, z: -15, size: 2 },
    ];

    obstacles.forEach((obs) => {
      this.createBox(scene, world, obs.x, obs.z, obs.size);
    });
  }

  private createBox(scene: THREE.Scene, world: CANNON.World, x: number, z: number, size: number) {
    const height = size;
    const geometry = new THREE.BoxGeometry(size, height, size);
    
    // Vibrant obstacle colors
    const obstacleColors = [0xFF9FF3, 0xFECA57, 0x48DBFB, 0xFF6348, 0x1DD1A1, 0xEE5A6F];
    const colorIndex = Math.floor(Math.random() * obstacleColors.length);
    
    const material = new THREE.MeshStandardMaterial({
      color: obstacleColors[colorIndex],
      roughness: 0.5,
      metalness: 0.4,
      emissive: obstacleColors[colorIndex],
      emissiveIntensity: 0.15,
    });
    const box = new THREE.Mesh(geometry, material);
    box.position.set(x, height / 2, z);
    box.castShadow = true;
    box.receiveShadow = true;
    scene.add(box);

    // Physics
    const shape = new CANNON.Box(new CANNON.Vec3(size / 2, height / 2, size / 2));
    const body = new CANNON.Body({ mass: 0 });
    body.addShape(shape);
    body.position.set(x, height / 2, z);
    world.addBody(body);
  }
}
