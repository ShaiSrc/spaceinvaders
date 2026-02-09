/**
 * Space Invaders Example
 * A classic Space Invaders game with keyboard and gamepad support
 *
 * Controls:
 * - Keyboard: Arrow keys to move, Space to shoot, P to pause
 * - Gamepad: D-pad/Left stick to move, A button to shoot, Start to pause
 *
 * Run this example:
 * 1. Build the library: npm run build
 * 2. Create an HTML file with a canvas element
 * 3. Import and run this code
 */

import {
  Renderer,
  GameLoop,
  KeyboardManager,
  GamepadManager,
  Point,
} from "@shaisrc/tty";

const GRID_WIDTH = 60;
const GRID_HEIGHT = 40;

interface Bullet extends Point {
  isPlayerBullet: boolean;
}

interface Invader extends Point {
  type: number; // 0, 1, 2 for different alien types
  alive: boolean;
}

interface Barrier extends Point {
  health: number;
}

class SpaceInvadersGame {
  private renderer: Renderer;
  private keyboard: KeyboardManager;
  private gamepad: GamepadManager;
  private gameLoop: GameLoop;

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

  // Game timing
  private invaderMoveTimer = 0;
  private invaderMoveInterval = 800; // ms
  private invaderDirection = 1; // 1 for right, -1 for left
  private invaderDropDistance = 2;
  private shootCooldown = 0;
  private shootInterval = 300; // ms
  private enemyShootTimer = 0;
  private enemyShootInterval = 1500; // ms

  // Invader patterns
  private readonly invaderChars = ["▀", "▄", "█"];

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = Renderer.forCanvas(canvas, {
      grid: { width: GRID_WIDTH, height: GRID_HEIGHT },
      cell: { width: 12, height: 16 },
      font: { family: "monospace" },
      colors: { fg: "white", bg: "black" },
      autoClear: true,
    });

    this.keyboard = new KeyboardManager();
    this.gamepad = new GamepadManager({ deadzone: 0.2 });

    this.setupInput();
    this.initGame();

    this.gameLoop = new GameLoop(
      this.update.bind(this),
      this.render.bind(this),
      { fps: 60 },
    );

    // Show gamepad connection status
    this.gamepad.onConnected(() => {
      console.log("🎮 Gamepad connected!");
    });

    this.gamepad.onDisconnected(() => {
      console.log("🎮 Gamepad disconnected!");
    });
  }

  private initGame(): void {
    // Initialize player at bottom center
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

    this.spawnInvaders();
    this.spawnBarriers();
  }

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
          type: row < 1 ? 2 : row < 3 ? 1 : 0,
          alive: true,
        });
      }
    }

    // Increase speed based on level
    this.invaderMoveInterval = Math.max(300, 800 - this.level * 100);
    this.invaderDirection = 1;
  }

  private spawnBarriers(): void {
    this.barriers = [];
    const barrierY = GRID_HEIGHT - 10;
    const barrierPositions = [10, 22, 34, 46];

    for (const baseX of barrierPositions) {
      // Create a 6x3 barrier
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

  private setupInput(): void {
    const startGame = () => {
      if (!this.started && !this.gameOver) this.started = true;
    };

    const togglePause = () => {
      if (this.started && !this.gameOver) this.paused = !this.paused;
    };

    const shoot = (event?: KeyboardEvent) => {
      event?.preventDefault();
      if (this.started && !this.gameOver && !this.paused) {
        this.shootBullet();
      }
      startGame();
    };

    // Keyboard controls
    this.keyboard.onKeyDown("ArrowLeft", () => {
      if (this.player.x > 1) this.player.x -= 2;
      startGame();
    });

    this.keyboard.onKeyDown("ArrowRight", () => {
      if (this.player.x < GRID_WIDTH - 2) this.player.x += 2;
      startGame();
    });

    this.keyboard.onKeyDown("Space", shoot);

    this.keyboard.onKeyDown(["p", "P"], togglePause);

    this.keyboard.onKeyDown(["r", "R"], () => {
      if (this.gameOver) this.initGame();
    });
  }

  private handleGamepadInput(): void {
    // Update gamepad state
    this.gamepad.update();

    if (!this.gamepad.isConnected()) return;

    const startGame = () => {
      if (!this.started && !this.gameOver) this.started = true;
    };

    // D-pad or left stick for movement
    const leftStick = this.gamepad.getLeftStick();
    const dpad = this.gamepad.getDPad();

    if (leftStick.x < -0.5 || dpad.left) {
      if (this.player.x > 1) this.player.x -= 2;
      startGame();
    } else if (leftStick.x > 0.5 || dpad.right) {
      if (this.player.x < GRID_WIDTH - 2) this.player.x += 2;
      startGame();
    }

    // A button (0) to shoot
    if (this.gamepad.justPressed(0)) {
      if (this.started && !this.gameOver && !this.paused) {
        this.shootBullet();
      }
      startGame();
    }

    // Start button (9) to pause
    if (this.gamepad.justPressed(9)) {
      if (this.started && !this.gameOver) this.paused = !this.paused;
    }

    // B button (1) to restart when game over
    if (this.gamepad.justPressed(1)) {
      if (this.gameOver) this.initGame();
    }
  }

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

  private enemyShoot(): void {
    // Find bottom-most invaders in random columns
    const aliveInvaders = this.invaders.filter((inv) => inv.alive);
    if (aliveInvaders.length === 0) return;

    const shooter =
      aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];

    this.bullets.push({
      x: shooter.x,
      y: shooter.y + 1,
      isPlayerBullet: false,
    });
  }

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
        // Drop down and reverse direction
        for (const invader of this.invaders) {
          if (invader.alive) {
            invader.y += this.invaderDropDistance;
          }
        }
        this.invaderDirection *= -1;
      } else {
        // Move horizontally
        for (const invader of this.invaders) {
          if (invader.alive) {
            invader.x += this.invaderDirection;
          }
        }
      }

      // Check if invaders reached the player
      for (const invader of aliveInvaders) {
        if (invader.y >= this.player.y - 1) {
          this.lives = 0;
          this.gameOver = true;
        }
      }
    }
  }

  private updateBullets(deltaTime: number): void {
    // Move bullets
    for (const bullet of this.bullets) {
      if (bullet.isPlayerBullet) {
        bullet.y -= 1;
      } else {
        bullet.y += 1;
      }
    }

    // Remove off-screen bullets
    this.bullets = this.bullets.filter((b) => b.y >= 0 && b.y < GRID_HEIGHT);

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
          break;
        }
      }
    }

    // Check bullet collisions with barriers
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];

      for (let j = this.barriers.length - 1; j >= 0; j--) {
        const barrier = this.barriers[j];
        if (bullet.x === barrier.x && bullet.y === barrier.y) {
          barrier.health--;
          if (barrier.health <= 0) {
            this.barriers.splice(j, 1);
          }
          this.bullets.splice(i, 1);
          break;
        }
      }
    }

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
        if (this.lives <= 0) {
          this.gameOver = true;
        }
      }
    }
  }

  private checkLevelComplete(): void {
    const aliveInvaders = this.invaders.filter((inv) => inv.alive);
    if (aliveInvaders.length === 0) {
      this.level++;
      this.spawnInvaders();
      this.spawnBarriers();
      this.bullets = [];
    }
  }

  private update(deltaTime: number): void {
    if (!this.started || this.gameOver || this.paused) {
      this.handleGamepadInput();
      return;
    }

    this.handleGamepadInput();

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

  private render(): void {
    this.renderer.clear();

    // Draw title
    this.renderer.drawText(
      Math.floor(GRID_WIDTH / 2) - 7,
      1,
      "SPACE INVADERS",
      {
        fg: "cyan",
        bold: true,
      },
    );

    if (!this.started) {
      this.renderStartScreen();
    } else if (this.gameOver) {
      this.renderGameOver();
    } else {
      this.renderGame();
    }

    this.renderer.render();
  }

  private renderStartScreen(): void {
    const centerX = Math.floor(GRID_WIDTH / 2);

    this.renderer
      .drawText(centerX - 12, 10, "Press SPACE or A to start", { fg: "white" })
      .drawText(centerX - 8, 12, "Controls:", { fg: "yellow", bold: true })
      .drawText(centerX - 15, 14, "Keyboard: ← → to move, SPACE to shoot", {
        fg: "white",
      })
      .drawText(centerX - 15, 15, "Gamepad:  D-pad/stick, A to shoot", {
        fg: "white",
      })
      .drawText(centerX - 6, 17, "P or START to pause", { fg: "white" });

    // Show gamepad status
    const gamepadStatus = this.gamepad.isConnected()
      ? "🎮 Gamepad Connected"
      : "No gamepad detected";
    this.renderer.drawText(centerX - 10, 20, gamepadStatus, {
      fg: this.gamepad.isConnected() ? "green" : "gray",
    });

    // Draw some decorative invaders
    const invTypes = [2, 1, 0];
    for (let i = 0; i < 3; i++) {
      const char = this.invaderChars[invTypes[i]];
      const color = ["red", "magenta", "yellow"][invTypes[i]];
      this.renderer.drawText(centerX - 10 + i * 10, 25, char + char, {
        fg: color,
      });
    }
  }

  private renderGameOver(): void {
    this.renderGame();

    const centerX = Math.floor(GRID_WIDTH / 2);
    const centerY = Math.floor(GRID_HEIGHT / 2);

    // Game over box
    this.renderer
      .box(centerX - 15, centerY - 5, 30, 10, {
        style: "double",
        fg: "red",
        fill: true,
        fillChar: " ",
      })
      .drawText(centerX - 5, centerY - 3, "GAME OVER", {
        fg: "red",
        bold: true,
      })
      .drawText(centerX - 8, centerY - 1, `Final Score: ${this.score}`, {
        fg: "white",
      })
      .drawText(centerX - 9, centerY + 1, `High Score: ${this.highScore}`, {
        fg: "yellow",
      })
      .drawText(centerX - 11, centerY + 3, "Press R or B to restart", {
        fg: "white",
      });
  }

  private renderGame(): void {
    // Draw HUD
    this.renderer
      .drawText(2, GRID_HEIGHT - 1, `Score: ${this.score}`, { fg: "white" })
      .drawText(GRID_WIDTH - 15, GRID_HEIGHT - 1, `Lives: ${this.lives}`, {
        fg: this.lives <= 1 ? "red" : "white",
      })
      .drawText(
        Math.floor(GRID_WIDTH / 2) - 5,
        GRID_HEIGHT - 1,
        `Level: ${this.level}`,
        {
          fg: "cyan",
        },
      );

    // Draw pause indicator
    if (this.paused) {
      const centerX = Math.floor(GRID_WIDTH / 2);
      this.renderer.drawText(centerX - 3, 3, "PAUSED", {
        fg: "yellow",
        bold: true,
      });
    }

    // Draw player
    this.renderer.drawText(this.player.x, this.player.y, "▲", {
      fg: "green",
      bold: true,
    });

    // Draw invaders
    for (const invader of this.invaders) {
      if (!invader.alive) continue;

      const char = this.invaderChars[invader.type];
      const color = ["yellow", "magenta", "red"][invader.type];

      this.renderer.drawText(invader.x, invader.y, char, { fg: color });
    }

    // Draw bullets
    for (const bullet of this.bullets) {
      const char = bullet.isPlayerBullet ? "│" : "┃";
      const color = bullet.isPlayerBullet ? "cyan" : "red";
      this.renderer.drawText(bullet.x, bullet.y, char, { fg: color });
    }

    // Draw barriers
    for (const barrier of this.barriers) {
      let char = "█";
      let color = "green";

      if (barrier.health === 2) {
        char = "▓";
        color = "yellow";
      } else if (barrier.health === 1) {
        char = "▒";
        color = "red";
      }

      this.renderer.drawText(barrier.x, barrier.y, char, { fg: color });
    }
  }

  start(): void {
    this.gameLoop.start();
  }

  stop(): void {
    this.gameLoop.stop();
    this.keyboard.destroy();
    this.gamepad.destroy();
  }
}

// Example usage
function startSpaceInvaders(canvas: HTMLCanvasElement) {
  const game = new SpaceInvadersGame(canvas);
  game.start();
  return game;
}

// Expose for dynamic imports
if (typeof window !== "undefined") {
  (window as any).startSpaceInvaders = startSpaceInvaders;
}

export { SpaceInvadersGame, startSpaceInvaders };
