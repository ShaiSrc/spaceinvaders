# Create Your First Game in TypeScript: Space Invaders with Sound

Ever wanted to build a real game from scratch? In this tutorial, we'll create a fully-functional Space Invaders clone using TypeScript, complete with retro ASCII graphics and immersive sound effects. No game engines required—just clean, typed code and modern web APIs!

## What You'll Build

By the end of this tutorial, you'll have:

- ✨ A playable Space Invaders game with classic gameplay
- 🎮 Keyboard AND gamepad support
- 🔊 Full sound effects (shooting, explosions, movement)
- 📊 Score tracking, lives, and level progression
- 🎨 Retro ASCII/terminal-style graphics
- 💪 Type-safe TypeScript code

[Play the finished game here](#) | [Get the complete code on GitHub](https://github.com/ShaiSrc/spaceinvaders)

## What You'll Learn

- How to structure a game loop in TypeScript
- Managing game state and entities
- Collision detection fundamentals
- Generating retro sound effects with ZzFX
- Using the @shaisrc/tty library for ASCII rendering
- Handling player input (keyboard + gamepad)
- Game mathematics: movement, timing, and physics

## Prerequisites

**You should know:**

- Basic TypeScript/JavaScript
- HTML/CSS basics
- How to use npm/yarn

**You'll need installed:**

- Node.js (v18+)
- A code editor (VS Code recommended)
- A modern web browser

**Time to complete:** ~60-90 minutes

---

## Part 1: Project Setup

Let's start by creating our project structure.

### 1.1 Create the Project

```bash
mkdir spaceinvaders
cd spaceinvaders
npm init -y
```

### 1.2 Install Dependencies

We'll use three main libraries:

```bash
npm install @shaisrc/tty zzfx
npm install -D typescript vite
```

**What each does:**

- `@shaisrc/tty` - My own lightweight ASCII/grid-based rendering library (no canvas complexity!)
- `zzfx` - Tiny procedural sound generator (~1KB, no files needed!)
- `vite` - Fast development server and build tool
- `typescript` - Type safety and modern JavaScript features

### 1.3 Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

**Why strict mode?** It catches bugs at compile time, not runtime. Game bugs are hard to debug—let TypeScript help!

### 1.4 Create Project Structure

```bash
mkdir -p src
touch src/main.ts src/game.ts src/SynthManager.ts
touch index.html
```

Your structure should look like:

```
spaceinvaders/
├── src/
│   ├── main.ts          # Entry point
│   ├── game.ts          # Game logic
│   └── SynthManager.ts  # Sound synthesis
├── index.html
├── package.json
└── tsconfig.json
```

### 1.5 Create the HTML Template

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Space Invaders</title>
    <style>
      body {
        margin: 0;
        padding: 20px;
        background: #000;
        color: #0f0;
        font-family: monospace;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
      }
      h1 {
        font-size: 2rem;
        text-shadow: 0 0 10px #0f0;
        margin-bottom: 20px;
      }
      #game-canvas {
        border: 2px solid #0f0;
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
      }
    </style>
  </head>
  <body>
    <h1>▼ SPACE INVADERS ▼</h1>
    <canvas id="game-canvas"></canvas>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### 1.6 Add Scripts to package.json

Add these scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

### 1.7 Test the Setup

```bash
npm run dev
```

You should see a dev server start. Open the URL in your browser—you'll see a canvas (though it won't do anything yet).

---

## Part 2: Game Foundation

Now let's set up the game structure. We'll create the basic framework, render loop, and entry point so we can see something on the screen quickly.

### 2.1 Define Game Constants

Create `src/game.ts`:

```typescript
import {
  Renderer,
  GameLoop,
  KeyboardManager,
  GamepadManager,
  Point,
} from "@shaisrc/tty";

// Grid dimensions
const GRID_WIDTH = 60;
const GRID_HEIGHT = 40;
```

### 2.2 Define Game Entities

```typescript
/**
 * Represents a bullet
 */
interface Bullet extends Point {
  isPlayerBullet: boolean; // true = player, false = enemy
}

/**
 * Represents an invader enemy
 */
interface Invader extends Point {
  type: number; // 0 (basic), 1 (medium), 2 (advanced)
  alive: boolean;
}

/**
 * Represents a defensive barrier
 */
interface Barrier extends Point {
  health: number; // 0-3
}
```

**Why interfaces?** They document our data shapes and give us IntelliSense. TypeScript knows what properties each entity has!

### 2.3 Create the Game Class

```typescript
export class SpaceInvadersGame {
  private renderer: Renderer;
  private keyboard: KeyboardManager;
  private gamepad: GamepadManager;
  private gameLoop: GameLoop;

  // Game state
  public player: Point = { x: 0, y: 0 };
  public invaders: Invader[] = [];
  public bullets: Bullet[] = [];
  private barriers: Barrier[] = [];
  public score = 0;
  public lives = 3;
  public gameOver = false;
  public paused = false;
  public started = false;
  public level = 1;
  public highScore = 0;

  // Timing
  private invaderMoveTimer = 0;
  private invaderMoveInterval = 800;
  private invaderDirection = 1;
  private shootCooldown = 0;
  private shootInterval = 300;
  private enemyShootTimer = 0;
  private enemyShootInterval = 1500;

  // Visuals
  private readonly invaderChars = ["▀", "▄", "█"];

  constructor(canvas: HTMLCanvasElement) {
    // Initialize renderer with @shaisrc/tty
    this.renderer = Renderer.forCanvas(canvas, {
      grid: { width: GRID_WIDTH, height: GRID_HEIGHT },
      cell: { width: 12, height: 16 },
      font: { family: "monospace" },
      colors: { fg: "white", bg: "black" },
      autoClear: true,
    });

    this.keyboard = new KeyboardManager();
    this.gamepad = new GamepadManager({ deadzone: 0.2 });

    // Note: We'll add initialization logic in Part 4!

    // Create game loop at 60 FPS
    this.gameLoop = new GameLoop(
      this.update.bind(this),
      this.render.bind(this),
      { fps: 60 },
    );
  }

  start(): void {
    this.gameLoop.start();
  }

  stop(): void {
    this.gameLoop.stop();
  }

  // Placeholder update method
  private update(deltaTime: number): void {
    // Logic comes later
  }

  // Placeholder render method
  private render(): void {
    this.renderer.clear();
    // Drawing comes later
    this.renderer.render();
  }
}
```

**What's happening here?**

- `Renderer.forCanvas()` creates an ASCII renderer that draws to our canvas
- `GameLoop` calls `update()` and `render()` 60 times per second
- We initialize the managers but defer the logic for now

### 2.4 Create the Entry Point

Let's hook this up to the DOM so we can run the game (even if it's blank for now).

Update `src/main.ts`:

```typescript
import { SpaceInvadersGame } from "./game";

function main(): void {
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;

  if (!canvas) {
    console.error("Canvas element not found!");
    return;
  }

  const game = new SpaceInvadersGame(canvas);

  // Start the game loop
  // Note: AudioContext will remain suspended until the user interacts
  // (presses a key) in the Start Screen due to browser autoplay policies.
  console.log("Game ready!");
  game.start();

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    game.stop();
  });
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
```

Now if you run `npm run dev`, you should see a black screen. It works! Now let's draw something.

---

## Part 3: Rendering

It's time to get some pixels on the screen so we can see what we're doing.

### 3.1 Main Render Function

Update the `render()` method in `src/game.ts`:

```typescript
private render(): void {
  this.renderer.clear();

  // Draw title
  this.renderer.drawText(
    Math.floor(GRID_WIDTH / 2) - 7,
    1,
    'SPACE INVADERS',
    { fg: 'cyan', bold: true }
  );

  // Route to appropriate screen
  if (!this.started) {
    this.renderStartScreen();
  } else if (this.gameOver) {
    this.renderGameOver();
  } else {
    this.renderGame();
  }

  this.renderer.render();
}
```

### 3.2 Render the Start Screen

Add this method to your class:

```typescript
private renderStartScreen(): void {
  const centerX = Math.floor(GRID_WIDTH / 2);

  this.renderer
    .drawText(centerX - 12, 10, 'Press SPACE or A to start', { fg: 'white' })
    .drawText(centerX - 8, 12, 'Controls:', { fg: 'yellow', bold: true })
    .drawText(centerX - 15, 14, 'Keyboard: ← → move, SPACE shoot', { fg: 'white' })
    .drawText(centerX - 15, 15, 'Gamepad:  D-pad/stick, A shoot', { fg: 'white' })
    .drawText(centerX - 6, 17, 'P or START to pause', { fg: 'white' })
    .drawText(centerX - 4, 18, 'M or Y to mute', { fg: 'white' });

  // Show gamepad status
  const gamepadStatus = this.gamepad.isConnected()
    ? '🎮 Gamepad Connected'
    : 'No gamepad detected';
  this.renderer.drawText(centerX - 10, 20, gamepadStatus, {
    fg: this.gamepad.isConnected() ? 'green' : 'gray',
  });

  // Decorative invaders
  for (let i = 0; i < 3; i++) {
    const char = this.invaderChars[2 - i];
    const color = ['red', 'magenta', 'yellow'][2 - i];
    this.renderer.drawText(centerX - 10 + i * 10, 26, char + char, { fg: color });
  }
}
```

### 3.3 Render the Game

This draws the actual gameplay state (Player, Invaders, Bullets).

```typescript
private renderGame(): void {
  // HUD
  this.renderer
    .drawText(2, GRID_HEIGHT - 1, `Score: ${this.score}`, { fg: 'white' })
    .drawText(GRID_WIDTH - 15, GRID_HEIGHT - 1, `Lives: ${this.lives}`, {
      fg: this.lives <= 1 ? 'red' : 'white',
    })
    .drawText(
      Math.floor(GRID_WIDTH / 2) - 5,
      GRID_HEIGHT - 1,
      `Level: ${this.level}`,
      { fg: 'cyan' }
    );

  // Pause indicator
  if (this.paused) {
    this.renderer.drawText(Math.floor(GRID_WIDTH / 2) - 3, 3, 'PAUSED', {
      fg: 'yellow',
      bold: true,
    });
  }

  // Player ship
  this.renderer.drawText(this.player.x, this.player.y, '▲', {
    fg: 'green',
    bold: true,
  });

  // Invaders
  for (const invader of this.invaders) {
    if (!invader.alive) continue;

    const char = this.invaderChars[invader.type];
    const color = ['yellow', 'magenta', 'red'][invader.type];

    this.renderer.drawText(invader.x, invader.y, char, { fg: color });
  }

  // Bullets
  for (const bullet of this.bullets) {
    const char = bullet.isPlayerBullet ? '│' : '┃';
    const color = bullet.isPlayerBullet ? 'cyan' : 'red';
    this.renderer.drawText(bullet.x, bullet.y, char, { fg: color });
  }

  // Barriers (with health degradation)
  for (const barrier of this.barriers) {
    let char = '█';
    let color = 'green';

    if (barrier.health === 2) {
      char = '▓';
      color = 'yellow';
    } else if (barrier.health === 1) {
      char = '▒';
      color = 'red';
    }

    this.renderer.drawText(barrier.x, barrier.y, char, { fg: color });
  }
}
```

### 3.4 Render Game Over

```typescript
private renderGameOver(): void {
  this.renderGame(); // Draw game state in background

  const centerX = Math.floor(GRID_WIDTH / 2);
  const centerY = Math.floor(GRID_HEIGHT / 2);

  this.renderer
    .box(centerX - 15, centerY - 5, 30, 10, {
      style: 'double',
      fg: 'red',
      fill: true,
      fillChar: ' ',
    })
    .drawText(centerX - 5, centerY - 3, 'GAME OVER', { fg: 'red', bold: true })
    .drawText(centerX - 8, centerY - 1, `Final Score: ${this.score}`, { fg: 'white' })
    .drawText(centerX - 9, centerY + 1, `High Score: ${this.highScore}`, { fg: 'yellow' })
    .drawText(centerX - 11, centerY + 3, 'Press R or B to restart', { fg: 'white' });
}
```

Now if you check your browser, you should see the **Start Screen**! The game loop is running and rendering, waiting for input.

---

## Part 4: Player Controls and Logic

Let's make the game interactive!

### 4.1 Initialize Game State

First, we need a way to setup or reset the game. Add this to `SpaceInvadersGame`:

```typescript
private initGame(): void {
  // Reset player to bottom center
  this.player = {
    x: Math.floor(GRID_WIDTH / 2),
    y: GRID_HEIGHT - 3,
  };

  this.lives = 3;
  this.score = 0;
  this.level = 1;
  this.gameOver = false;
  this.paused = false;
  this.started = false;
  this.bullets = [];

  this.spawnInvaders();
  this.spawnBarriers();
}
```

**Important:** Now that `initGame` is defined, add this line to your **constructor** in `SpaceInvadersGame` (before creating the game loop):

```typescript
this.setupInput(); // We are about to add this
this.initGame(); // Call the method we just made
```

### 4.2 Spawn Entities

We need helper methods to create the enemy grid and shields.

```typescript
private spawnInvaders(): void {
  this.invaders = [];
  const rows = 5;
  const cols = 11;
  const startX = 10;
  const startY = 5;
  const spacingX = 4;
  const spacingY = 3;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      this.invaders.push({
        x: startX + col * spacingX,
        y: startY + row * spacingY,
        // Top row = type 2, middle = type 1, bottom = type 0
        type: row < 1 ? 2 : row < 3 ? 1 : 0,
        alive: true,
      });
    }
  }

  // Increase speed each level
  this.invaderMoveInterval = Math.max(300, 800 - this.level * 100);
}

private spawnBarriers(): void {
  this.barriers = [];
  const barrierY = GRID_HEIGHT - 10;
  const barrierPositions = [10, 22, 34, 46];

  for (const baseX of barrierPositions) {
    // Create a 6×3 barrier
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 6; x++) {
        this.barriers.push({
          x: baseX + x,
          y: barrierY + y,
          health: 3,
        });
      }
    }
  }
}
```

### 4.3 Setup Keyboard Controls

```typescript
private setupInput(): void {
  const startGame = (): void => {
    if (!this.started && !this.gameOver) this.started = true;
  };

  // Movement
  this.keyboard.onKeyDown('ArrowLeft', () => {
    if (this.player.x > 1) this.player.x -= 2;
    startGame();
  });

  this.keyboard.onKeyDown('ArrowRight', () => {
    if (this.player.x < GRID_WIDTH - 2) this.player.x += 2;
    startGame();
  });

  // Shooting
  this.keyboard.onKeyDown('Space', (event) => {
    event?.preventDefault();
    if (this.started && !this.gameOver && !this.paused) {
      this.shootBullet();
    }
    startGame();
  });

  // Pause
  this.keyboard.onKeyDown(['p', 'P'], () => {
    if (this.started && !this.gameOver) {
      this.paused = !this.paused;
    }
  });

  // Restart
  this.keyboard.onKeyDown(['r', 'R'], () => {
    if (this.gameOver) this.initGame();
  });
}
```

**Input design:** We use the `onKeyDown` event for responsive controls. Holding arrow keys moves continuously!

### 4.4 Add Gamepad Support

Update your `update()` method to call this helper:

```typescript
private handleGamepadInput(): void {
  this.gamepad.update(); // Must call every frame

  if (!this.gamepad.isConnected()) return;

  const leftStick = this.gamepad.getLeftStick();
  const dpad = this.gamepad.getDPad();

  // Movement
  if (leftStick.x < -0.5 || dpad.left) {
    if (this.player.x > 1) this.player.x -= 2;
  } else if (leftStick.x > 0.5 || dpad.right) {
    if (this.player.x < GRID_WIDTH - 2) this.player.x += 2;
  }

  // A button to shoot
  if (this.gamepad.justPressed(0)) {
    if (this.started && !this.gameOver && !this.paused) {
      this.shootBullet();
    }
  }

  // Start button to pause
  if (this.gamepad.justPressed(9)) {
    if (this.started && !this.gameOver) {
      this.paused = !this.paused;
    }
  }
}
```

### 4.5 Implement Shooting

```typescript
private shootBullet(): void {
  if (this.shootCooldown <= 0) {
    this.bullets.push({
      x: this.player.x,
      y: this.player.y - 1,
      isPlayerBullet: true,
    });
    this.shootCooldown = this.shootInterval;
  }
}
```

---

## Part 5: Adding Sound

The game works, but it's silent. Let's create a procedural sound system using ZzFX. No sound files needed—we'll generate all sounds using code!

### 5.1 Understanding ZzFX

**What is ZzFX?**

ZzFX is a tiny JavaScript synthesizer that generates retro game sounds procedurally. Instead of loading WAV files, you define sounds with parameter arrays.

**Why ZzFX over audio files?**

- ✅ **Tiny** - Only ~1KB (vs ~30KB for Howler.js + sound files)
- ✅ **No loading** - Instant playback, no async needed
- ✅ **No files** - Zero external dependencies
- ✅ **Retro aesthetic** - Perfect for arcade-style games

### 5.2 Create Type Definitions for ZzFX

Since `zzfx` is a tiny library often used as a snippet, it might not include TypeScript definitions. Let's create a shim to make TypeScript happy.

Create `src/zzfx.d.ts`:

```typescript
declare module "zzfx" {
  /**
   * ZzFX - Zuper Zmall Zound Zynth
   * @param params Sound parameters
   * @returns The AudioBufferSourceNode
   */
  export function zzfx(...params: (number | undefined)[]): any;
}
```

### 5.3 Create the SynthManager

Create a new file `src/SynthManager.ts`:

```typescript
import { zzfx } from "zzfx";

export type SoundEffect =
  | "playerShoot"
  | "enemyShoot"
  | "explosion"
  | "barrierHit"
  | "playerHit"
  | "invaderMove"
  | "levelComplete"
  | "gameOver";

type ZzFXParams = number[];

interface SoundConfig {
  params: ZzFXParams;
  volume?: number;
}

export class SynthManager {
  private sounds: Map<SoundEffect, SoundConfig> = new Map();
  private globalVolume: number = 1.0;
  private muted: boolean = false;

  private readonly soundConfigs: Record<SoundEffect, SoundConfig> = {
    // Player shoot - bright laser "pew"
    playerShoot: {
      params: [, , 925, 0.04, 0.3, 0.6, 1, 0.3, , 6.27, -184, 0.09, 0.17],
      volume: 0.3,
    },
    // Enemy shoot - lower, menacing laser
    enemyShoot: {
      params: [, , 520, 0.02, 0.25, 0.5, 1, 0.5, , 4, -150, 0.05, 0.1],
      volume: 0.25,
    },
    // Explosion - classic arcade boom
    explosion: {
      params: [, , 462, , 0.4, 0.63, 4, 2.7, , , , , , 0.5, , 0.6, 0.04],
      volume: 0.4,
    },
    // Barrier hit - short crack
    barrierHit: {
      params: [, , 300, 0.01, 0.05, 0.1, 1, , , , , , , 1],
      volume: 0.2,
    },
    // Player hit - damage with descending pitch
    playerHit: {
      params: [, , 800, 0.02, 0.15, 0.4, 2, 0.8, -10, , , , , 0.3],
      volume: 0.5,
    },
    // Invader move - low frequency blip
    invaderMove: {
      params: [, , 100, , 0.04, 0.06, 1, 1.5, , , 300],
      volume: 0.15,
    },
    // Level complete - ascending victory
    levelComplete: {
      params: [, , 523, 0.05, 0.2, 0.3, , 0.5, 20, , , , , , , , 0.02],
      volume: 0.6,
    },
    // Game over - descending doom
    gameOver: {
      params: [, , 600, 0.1, 0.5, 1.2, 2, 1.2, -20, , , , , 0.2],
      volume: 0.5,
    },
  };

  constructor() {
    for (const [key, config] of Object.entries(this.soundConfigs)) {
      this.sounds.set(key as SoundEffect, config);
    }
  }

  play(effect: SoundEffect): void {
    if (this.muted) return;

    const config = this.sounds.get(effect);
    if (!config) return;

    const adjustedParams = [...config.params];
    const effectVolume = config.volume ?? 1.0;
    adjustedParams[0] = effectVolume * this.globalVolume;

    zzfx(...adjustedParams);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  destroy(): void {
    this.sounds.clear();
  }
}
```

### 5.4 Implement Sound in Code

Now let's add the sound system to `src/game.ts`.

1. **Import it:**

```typescript
import { SynthManager } from "./SynthManager";
```

2. **Add property and initialization:**

```typescript
export class SpaceInvadersGame {
  // ... other properties
  private synthManager: SynthManager;

  constructor(canvas: HTMLCanvasElement) {
    // ...
    this.synthManager = new SynthManager();
    // ...
  }
```

3. **Add sound to Shooting:**
   Modify `shootBullet()`:

```typescript
  if (this.shootCooldown <= 0) {
    // ...
    this.bullets.push({ ... });

    // 🔊 SOUND!
    this.synthManager.play('playerShoot');
  }
```

4. **Add sound controls:**
   Modify `setupInput()` to add the mute toggle:

```typescript
// Mute
this.keyboard.onKeyDown(["m", "M"], () => {
  this.synthManager.toggleMute();
});
```

5. **Show status on Start Screen:**
   Update `renderStartScreen` to show the sound status:

```typescript
// Show sound status
const soundStatus = this.synthManager.isMuted() ? "🔇 Muted" : "🔊 Sound ON";
this.renderer.drawText(centerX - 7, 22, soundStatus, {
  fg: this.synthManager.isMuted() ? "red" : "green",
});
```

Now try shooting—you should hear a satisfying pew-pew!

---

## Part 6: Enemy AI and Movement

Time to make the invaders move and shoot back!

### 6.1 Move Invaders

```typescript
private moveInvaders(deltaTime: number): void {
  this.invaderMoveTimer += deltaTime;

  if (this.invaderMoveTimer >= this.invaderMoveInterval) {
    this.invaderMoveTimer = 0;

    let shouldDrop = false;
    const aliveInvaders = this.invaders.filter((inv) => inv.alive);

    // Check if any invader hits the edge
    for (const invader of aliveInvaders) {
      if (
        (this.invaderDirection === 1 && invader.x >= GRID_WIDTH - 3) ||
        (this.invaderDirection === -1 && invader.x <= 1)
      ) {
        shouldDrop = true;
        break;
      }
    }

    if (shouldDrop) {
      // Drop down and reverse
      for (const invader of this.invaders) {
        if (invader.alive) invader.y += 2;
      }
      this.invaderDirection *= -1;
    } else {
      // Move horizontally
      for (const invader of this.invaders) {
        if (invader.alive) invader.x += this.invaderDirection;
      }
    }

    // 🔊 Movement sound
    if (aliveInvaders.length > 0) {
      this.synthManager.play('invaderMove');
    }

    // Check if invaders reached player
    for (const invader of aliveInvaders) {
      if (invader.y >= this.player.y - 1) {
        this.lives = 0;
        this.gameOver = true;
        this.synthManager.play('gameOver');
      }
    }
  }
}
```

**Note on deltaTime:**
We use `deltaTime` to accumulate time in `invaderMoveTimer`. This ensures the _cadence_ of movement is consistent regardless of framerate (time-based logic). However, the _distance_ moved is always exactly 1 grid unit (discrete movement). This gives us the best of both worlds: consistent speed + precise grid alignment.

### 6.2 Enemy Shooting

```typescript
private enemyShoot(): void {
  const aliveInvaders = this.invaders.filter((inv) => inv.alive);
  if (aliveInvaders.length === 0) return;

  // Random invader shoots
  const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];

  this.bullets.push({
    x: shooter.x,
    y: shooter.y + 1,
    isPlayerBullet: false,
  });

  // 🔊 Enemy shoot sound
  this.synthManager.play('enemyShoot');
}
```

---

## Part 7: Collision Detection

The most critical part of any game!

### 7.1 Update Bullets

```typescript
private updateBullets(deltaTime: number): void {
  // Move bullets
  for (const bullet of this.bullets) {
    if (bullet.isPlayerBullet) {
      bullet.y -= 1; // Player bullets go up
    } else {
      bullet.y += 1; // Enemy bullets go down
    }
  }

  // Remove off-screen bullets
  this.bullets = this.bullets.filter((b) => b.y >= 0 && b.y < GRID_HEIGHT);

  // ... collision checks below
}
```

### 7.2 Bullet vs Invader Collisions

Add this inside `updateBullets` (or in checking logic):

```typescript
// Check bullet collisions with invaders
for (let i = this.bullets.length - 1; i >= 0; i--) {
  const bullet = this.bullets[i];
  if (!bullet.isPlayerBullet) continue;

  for (const invader of this.invaders) {
    if (
      invader.alive &&
      Math.abs(bullet.x - invader.x) <= 1 &&
      bullet.y === invader.y
    ) {
      invader.alive = false;
      this.bullets.splice(i, 1);
      this.score += (invader.type + 1) * 10;

      // 🔊 Explosion!
      this.synthManager.play("explosion");
      break;
    }
  }
}
```

### 7.3 Bullet vs Barrier Collisions

```typescript
// Check bullet collisions with barriers
for (let i = this.bullets.length - 1; i >= 0; i--) {
  const bullet = this.bullets[i];

  for (let j = this.barriers.length - 1; j >= 0; j--) {
    const barrier = this.barriers[j];
    if (bullet.x === barrier.x && bullet.y === barrier.y) {
      barrier.health--;

      // 🔊 Barrier hit
      this.synthManager.play("barrierHit");

      if (barrier.health <= 0) {
        this.barriers.splice(j, 1);
      }
      this.bullets.splice(i, 1);
      break;
    }
  }
}
```

**Why strict equality?**
Since our game uses a **strict grid system**, objects always occupy integer coordinates (`x: 10, y: 20`). We don't need complex bounding box intersection (AABB) math here. If the coordinates match exactly, it's a hit! This simplicity is one of the joys of working with grid/ASCII games.

### 7.4 Bullet vs Player Collisions

```typescript
  // Check bullet collisions with player
  for (let i = this.bullets.length - 1; i >= 0; i--) {
    const bullet = this.bullets[i];
    if (
      !bullet.isPlayerBullet &&
      Math.abs(bullet.x - this.player.x) <= 1 &&
      bullet.y === this.player.y
    ) {
      this.bullets.splice(i, 1);
      this.lives--;

      // 🔊 Player hit!
      this.synthManager.play('playerHit');

      if (this.lives <= 0) {
        this.gameOver = true;
        this.synthManager.play('gameOver');
      }
    }
  }
}
```

---

## Part 8: The Game Loop

Time to wire everything together in the `update` method.

### 8.1 The Update Function Implementation

Replace your placeholder `update` method with this:

```typescript
private update(deltaTime: number): void {
  // Always handle gamepad
  this.handleGamepadInput();

  // Don't update if paused/not started/game over
  if (!this.started || this.gameOver || this.paused) {
    return;
  }

  // Update cooldowns
  if (this.shootCooldown > 0) {
    this.shootCooldown -= deltaTime;
  }

  // Move invaders
  this.moveInvaders(deltaTime);

  // Enemy shooting
  this.enemyShootTimer += deltaTime;
  if (this.enemyShootTimer >= this.enemyShootInterval) {
    this.enemyShootTimer = 0;
    this.enemyShoot();
  }

  // Update bullets
  this.updateBullets(deltaTime);

  // Check level complete
  this.checkLevelComplete();

  // Update high score
  if (this.score > this.highScore) {
    this.highScore = this.score;
  }
}
```

### 8.2 Level Progression

```typescript
private checkLevelComplete(): void {
  const aliveInvaders = this.invaders.filter((inv) => inv.alive);
  if (aliveInvaders.length === 0) {
    this.level++;

    // 🔊 Level complete!
    this.synthManager.play('levelComplete');

    this.spawnInvaders(); // Faster invaders!
    this.spawnBarriers();
    this.bullets = [];
  }
}
```

---

## Part 9: Final Polish

We already set up `main.ts` in Part 2, but let's make sure our cleanup code handles the sound manager.

Update your `stop()` method in `src/game.ts`:

```typescript
stop(): void {
  this.gameLoop.stop();
  this.keyboard.destroy();
  this.gamepad.destroy();
  this.synthManager.destroy(); // Stop sounds if needed
}
```

And that's it! Your game is complete with sound, collision, and multiple levels.

---

## Part 10: Understanding ZzFX Sounds

Your game now has sounds! But let's understand how they work and how to customize them.

### 10.1 What Are ZzFX Parameters?

Each ZzFX sound is an array of up to 20 numbers that define how it sounds:

```typescript
[volume, randomness, frequency, attack, sustain, release, shape, ...]
```

**Key parameters:**

- **frequency** (index 2) - Pitch of the sound (higher = higher pitch)
- **attack** (index 3) - How fast sound starts (0 = instant)
- **sustain** (index 4) - How long sound plays
- **release** (index 5) - How long sound fades out
- **shape** (index 6) - Waveform type (0=sine, 1=triangle, 2=sawtooth, 3=noise, 4=tangent)

**Example:** Our player shoot sound

```typescript
playerShoot: {
  params: [, , 925, 0.04, 0.3, 0.6, 1, 0.3, , 6.27, -184, 0.09, 0.17],
  //          ^   ^^^^ ^^^^  ^^^^  ^^^  ^
  //        vol   freq attk  sust  rel shape
  volume: 0.3,
}
```

Empty slots (`, ,`) use ZzFX defaults—keeps it concise!

### 10.2 Customizing Sounds

Want to tweak a sound? **Use the visual designer:**

🎵 **[ZzFXR Sound Designer](https://zzfxr.github.io/)**

1. Open ZzFXR in your browser
2. Use the sliders to design your sound
3. Copy the generated array
4. Paste it into `SynthManager.ts`

**Example:** Make the laser sound higher-pitched

```typescript
// Original
params: [, , 925, 0.04, 0.3, 0.6, 1, 0.3, , 6.27, -184, 0.09, 0.17];

// Higher pitch - increase frequency from 925 to 1200
params: [, , 1200, 0.04, 0.3, 0.6, 1, 0.3, , 6.27, -184, 0.09, 0.17];
```

### 10.3 Creating Your Own Sounds

**Quick guide to common sound types:**

**Laser/Shoot sounds:**

- High frequency (800-1500)
- Short sustain (0.1-0.4)
- Triangle or sawtooth wave

**Explosions:**

- Low frequency (100-500)
- Noise waveform (shape = 3)
- Longer sustain (0.4-0.8)

**Beeps/Blips:**

- Medium frequency (200-600)
- Very short sustain (0.05-0.15)
- Square or triangle wave

**Power-ups:**

- Ascending frequency (use vibrato parameters)
- Medium sustain (0.2-0.5)
- Sine or triangle wave

### 10.4 No Copyright Worries!

Because sounds are procedurally generated, you own them! No licensing, no attribution required. Perfect for:

- Commercial games
- Open source projects
- Game jams
- Learning projects

### 10.5 Adjusting Volume

If a sound is too loud/quiet, adjust its `volume` property:

```typescript
playerShoot: {
  params: [, , 925, 0.04, 0.3, 0.6, 1, 0.3, , 6.27, -184, 0.09, 0.17],
  volume: 0.3, // ← Lower this to make quieter (0.0 to 1.0)
}
```

---

## Part 11: Running Your Game

Time to play!

### 11.1 Start the Dev Server

```bash
npm run dev
```

Open the URL in your browser (usually `http://localhost:5173`).

### 11.2 Build for Production

```bash
npm run build
```

This creates a `dist/` folder with optimized files. Host them on:

- GitHub Pages
- Netlify
- Vercel
- Any static host

### 11.3 Test on Different Browsers

- Chrome/Edge (recommended)
- Firefox
- Safari (may have audio restrictions)

> **⚠️ Important Audio Policy Note:**
> Modern browsers (Chrome, Firefox, Safari) strictly block audio from playing automatically. The user **MUST** interact with the page (click, keypress) before the `AudioContext` can start.
>
> This is why our game initializes in a "Start Screen" state and waits for `Space` or `A` pressed before enabling the game loop. Without this explicit user interaction step, your game would be silent!

---

## What You've Learned

Congratulations! You've built a complete game from scratch. Let's recap what you learned:

### Game Architecture

- ✅ Structuring a game with update/render loops
- ✅ Managing game state (score, lives, levels)
- ✅ Time-based movement with deltaTime
- ✅ State machines (start screen → game → game over)

### TypeScript Skills

- ✅ Interfaces for data modeling
- ✅ Type-safe APIs (can't play invalid sounds!)
- ✅ Async/await for resource loading
- ✅ Strict type checking

### Game Development Concepts

- ✅ Collision detection algorithms
- ✅ Enemy AI and pathfinding
- ✅ Input handling (keyboard + gamepad)
- ✅ Audio integration
- ✅ Progressive difficulty

### Libraries Used

- ✅ @shaisrc/tty for rendering
- ✅ ZzFX for procedural sound
- ✅ Vite for development

---

## Next Steps

Want to level up your game? Try these enhancements:

### Easy

- [ ] Add a high score leaderboard (localStorage)
- [ ] Create different invader movement patterns
- [ ] Implement power-ups (rapid fire, shields)

### Medium

- [ ] Add boss battles every 5 levels
- [ ] Create different enemy types with unique behaviors
- [ ] Add background music (use ZzFX Music or Web Audio API)
- [ ] Implement combo scoring (bonus for multi-kills)

### Advanced

- [ ] Add procedural level generation
- [ ] Create a level editor
- [ ] Implement online multiplayer (WebSockets)
- [ ] Port to mobile with touch controls

---

## Resources

**Documentation:**

- [@shaisrc/tty Docs](https://tty.shaitern.dev)
- [ZzFX GitHub](https://github.com/KilledByAPixel/ZzFX)
- [ZzFXR Sound Designer](https://zzfxr.github.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

**Game Dev Learning:**

- [Game Programming Patterns](https://gameprogrammingpatterns.com/)
- [Red Blob Games](https://www.redblobgames.com/) (amazing interactive tutorials)

**Get the Code:**

- [📦 Complete Source on GitHub](https://github.com/ShaiSrc/spaceinvaders) ← Clone, fork, and make it your own!

---

## Conclusion

You've just built a real game in TypeScript—no game engine required! You learned:

- Core game development concepts
- TypeScript best practices
- Audio integration
- Input handling
- Collision detection

But most importantly, you **shipped something**. That's what separates developers who learn from those who build.

**Now go build something amazing!** 🚀

---

_Questions? Drop them in the comments below! Found this helpful? Share it with someone learning game dev!_

_Follow me for more TypeScript game development tutorials._

---

**Tags:** #typescript #gamedev #tutorial #webdev #javascript #gaming #zzfx #ascii
