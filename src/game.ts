/**
 * Space Invaders Game
 * A classic Space Invaders implementation with sound effects
 *
 * Built with:
 * - @shaisrc/tty for rendering and input
 * - ZzFX for procedural sound effects
 * - TypeScript for type safety
 */

import {
  Renderer,
  GameLoop,
  KeyboardManager,
  GamepadManager,
  Point,
} from "@shaisrc/tty";
import { SynthManager } from "./SynthManager";

/** Grid dimensions */
const GRID_WIDTH = 60;
const GRID_HEIGHT = 40;

/** Game entity interfaces */

/**
 * Represents a bullet in the game
 */
interface Bullet extends Point {
  /** True if fired by player, false if fired by enemy */
  isPlayerBullet: boolean;
}

/**
 * Represents an invader enemy
 */
interface Invader extends Point {
  /** Invader type: 0 (basic), 1 (medium), 2 (advanced) */
  type: number;
  /** Whether the invader is still alive */
  alive: boolean;
}

/**
 * Represents a defensive barrier
 */
interface Barrier extends Point {
  /** Current health (0-3) */
  health: number;
}

/**
 * Main game class for Space Invaders
 */
export class SpaceInvadersGame {
  private renderer: Renderer;
  private keyboard: KeyboardManager;
  private gamepad: GamepadManager;
  private gameLoop: GameLoop;
  private synthManager: SynthManager;

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

  // Game timing
  private invaderMoveTimer = 0;
  private invaderMoveInterval = 800; // ms
  private invaderDirection = 1; // 1 for right, -1 for left
  private invaderDropDistance = 2;
  private shootCooldown = 0;
  private shootInterval = 300; // ms
  private enemyShootTimer = 0;
  private enemyShootInterval = 1500; // ms

  // Invader visual patterns
  private readonly invaderChars = ["▀", "▄", "█"];

  /**
   * Create a new Space Invaders game instance
   *
   * @param canvas - HTML Canvas element for rendering
   */
  constructor(canvas: HTMLCanvasElement) {
    // Initialize renderer with retro terminal style
    this.renderer = Renderer.forCanvas(canvas, {
      grid: { width: GRID_WIDTH, height: GRID_HEIGHT },
      cell: { width: 12, height: 16 },
      font: { family: "monospace" },
      colors: { fg: "white", bg: "black" },
      autoClear: true,
    });

    // Initialize input managers
    this.keyboard = new KeyboardManager();
    this.gamepad = new GamepadManager({ deadzone: 0.2 });

    // Initialize synth manager
    this.synthManager = new SynthManager();

    // Setup input handlers
    this.setupInput();

    // Initialize game state
    this.initGame();

    // Create game loop (60 FPS)
    this.gameLoop = new GameLoop(
      this.update.bind(this),
      this.render.bind(this),
      { fps: 60 },
    );

    // Log gamepad connection status
    this.gamepad.onConnected(() => {
      console.log("🎮 Gamepad connected!");
    });

    this.gamepad.onDisconnected(() => {
      console.log("🎮 Gamepad disconnected!");
    });
  }

  /**
   * Initialize/reset the game state
   */
  private initGame(): void {
    // Reset player position to bottom center
    this.player = {
      x: Math.floor(GRID_WIDTH / 2),
      y: GRID_HEIGHT - 3,
    };

    // Reset game state
    this.lives = 3;
    this.score = 0;
    this.level = 1;
    this.gameOver = false;
    this.paused = false;
    this.started = false;
    this.bullets = [];

    // Spawn initial enemies and barriers
    this.spawnInvaders();
    this.spawnBarriers();
  }

  /**
   * Spawn a grid of invader enemies
   */
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
          // Top row = type 2, middle rows = type 1, bottom rows = type 0
          type: row < 1 ? 2 : row < 3 ? 1 : 0,
          alive: true,
        });
      }
    }

    // Increase speed based on level (gets harder!)
    this.invaderMoveInterval = Math.max(300, 800 - this.level * 100);
    this.invaderDirection = 1;
  }

  /**
   * Spawn defensive barriers for the player
   */
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

  /**
   * Setup keyboard input handlers
   */
  private setupInput(): void {
    const startGame = (): void => {
      if (!this.started && !this.gameOver) this.started = true;
    };

    const togglePause = (): void => {
      if (this.started && !this.gameOver) this.paused = !this.paused;
    };

    const shoot = (event?: KeyboardEvent): void => {
      event?.preventDefault();
      if (this.started && !this.gameOver && !this.paused) {
        this.shootBullet();
      }
      startGame();
    };

    // Shooting
    this.keyboard.onKeyDown("Space", shoot);

    // Pause
    this.keyboard.onKeyDown(["p", "P"], togglePause);

    // Restart
    this.keyboard.onKeyDown(["r", "R"], () => {
      if (this.gameOver) this.initGame();
    });

    // Mute toggle
    this.keyboard.onKeyDown(["m", "M"], () => {
      this.synthManager.toggleMute();
    });
  }

  /**
   * Handle gamepad input
   */
  private handleGamepadInput(): void {
    this.gamepad.update();

    if (!this.gamepad.isConnected()) return;

    const startGame = (): void => {
      if (!this.started && !this.gameOver) this.started = true;
    };

    // Movement with D-pad or left stick
    const leftStick = this.gamepad.getLeftStick();
    const dpad = this.gamepad.getDPad();

    if (leftStick.x < -0.5 || dpad.x < -0.5) {
      if (this.player.x > 1) this.player.x -= 2;
      startGame();
    } else if (leftStick.x > 0.5 || dpad.x > 0.5) {
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

    // B button (1) to restart
    if (this.gamepad.justPressed(1)) {
      if (this.gameOver) this.initGame();
    }

    // Y button (3) to toggle mute
    if (this.gamepad.justPressed(3)) {
      this.synthManager.toggleMute();
    }
  }

  /**
   * Fire a bullet from the player's ship
   */
  private shootBullet(): void {
    if (this.shootCooldown <= 0) {
      this.bullets.push({
        x: this.player.x,
        y: this.player.y - 1,
        isPlayerBullet: true,
      });
      this.shootCooldown = this.shootInterval;

      // Play shoot sound
      this.synthManager.play("playerShoot");
    }
  }

  /**
   * Random invader shoots at the player
   */
  private enemyShoot(): void {
    const aliveInvaders = this.invaders.filter((inv) => inv.alive);
    if (aliveInvaders.length === 0) return;

    // Pick a random invader to shoot
    const shooter =
      aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];

    this.bullets.push({
      x: shooter.x,
      y: shooter.y + 1,
      isPlayerBullet: false,
    });

    // Play enemy shoot sound
    this.synthManager.play("enemyShoot");
  }

  /**
   * Move invaders in formation
   *
   * @param deltaTime - Time since last frame in milliseconds
   */
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

      // Play movement sound
      if (aliveInvaders.length > 0) {
        this.synthManager.play("invaderMove");
      }

      // Check if invaders reached the player (game over)
      for (const invader of aliveInvaders) {
        if (invader.y >= this.player.y - 1) {
          this.lives = 0;
          this.gameOver = true;
          this.synthManager.play("gameOver");
        }
      }
    }
  }

  /**
   * Update bullet positions and handle collisions
   */
  private updateBullets(): void {
    // Move bullets
    for (const bullet of this.bullets) {
      if (bullet.isPlayerBullet) {
        bullet.y -= 1; // Player bullets move up
      } else {
        bullet.y += 1; // Enemy bullets move down
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
          // Invader destroyed!
          invader.alive = false;
          this.bullets.splice(i, 1);
          this.score += (invader.type + 1) * 10;

          // Play explosion sound
          this.synthManager.play("explosion");
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

          // Play barrier hit sound
          this.synthManager.play("barrierHit");

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

        // Play player hit sound
        this.synthManager.play("playerHit");

        if (this.lives <= 0) {
          this.gameOver = true;
          this.synthManager.play("gameOver");
        }
      }
    }
  }

  /**
   * Check if level is complete and advance to next level
   */
  private checkLevelComplete(): void {
    const aliveInvaders = this.invaders.filter((inv) => inv.alive);
    if (aliveInvaders.length === 0) {
      // Level complete!
      this.level++;
      this.synthManager.play("levelComplete");

      // Spawn new wave
      this.spawnInvaders();
      this.spawnBarriers();
      this.bullets = [];
    }
  }

  /**
   * Main update loop - called every frame
   *
   * @param deltaTime - Time since last frame in milliseconds
   */
  private update(deltaTime: number): void {
    // Always handle gamepad input
    this.handleGamepadInput();

    // Handle keyboard movement
    const dir = this.keyboard.getDirection();
    if (dir.x !== 0) {
      if (!this.started && !this.gameOver) this.started = true;

      // Move player
      if (dir.x < 0 && this.player.x > 1) this.player.x -= 2;
      if (dir.x > 0 && this.player.x < GRID_WIDTH - 2) this.player.x += 2;
    }

    // Don't update game logic if not started, paused, or game over
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
    this.updateBullets();

    // Check level complete
    this.checkLevelComplete();

    // Update high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
  }

  /**
   * Main render loop - called every frame
   */
  private render(): void {
    this.renderer.clear();

    // Draw title
    this.renderer.drawText(
      Math.floor(GRID_WIDTH / 2) - 7,
      1,
      "SPACE INVADERS",
      {
        fg: "cyan",
      },
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

  /**
   * Render the start screen
   */
  private renderStartScreen(): void {
    const centerX = Math.floor(GRID_WIDTH / 2);

    this.renderer
      .drawText(centerX - 12, 10, "Press SPACE or A to start", { fg: "white" })
      .drawText(centerX - 8, 12, "Controls:", { fg: "yellow" })
      .drawText(
        centerX - 15,
        14,
        "Keyboard: WASD/Arrows to move, SPACE to shoot",
        {
          fg: "white",
        },
      )
      .drawText(centerX - 15, 15, "Gamepad:  D-pad/stick, A to shoot", {
        fg: "white",
      })
      .drawText(centerX - 6, 17, "P or START to pause", { fg: "white" })
      .drawText(centerX - 4, 18, "M or Y to mute", { fg: "white" });

    // Show gamepad status
    const gamepadStatus = this.gamepad.isConnected()
      ? "🎮 Gamepad Connected"
      : "No gamepad detected";
    this.renderer.drawText(centerX - 10, 20, gamepadStatus, {
      fg: this.gamepad.isConnected() ? "green" : "gray",
    });

    // Show sound status
    const soundStatus = this.synthManager.isMuted()
      ? "🔇 Sound: MUTED"
      : "🔊 Sound: ON";
    this.renderer.drawText(centerX - 7, 22, soundStatus, {
      fg: this.synthManager.isMuted() ? "red" : "green",
    });

    // Draw decorative invaders
    const invTypes = [2, 1, 0];
    for (let i = 0; i < 3; i++) {
      const char = this.invaderChars[invTypes[i]];
      const colors = ["red", "magenta", "yellow"] as const;
      this.renderer.drawText(centerX - 10 + i * 10, 26, char + char, {
        fg: colors[invTypes[i]],
      });
    }
  }

  /**
   * Render the game over screen
   */
  private renderGameOver(): void {
    // Render the game state in background
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

  /**
   * Render the main game screen
   */
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
      });
    }

    // Draw player ship
    this.renderer.drawText(this.player.x, this.player.y, "▲", {
      fg: "green",
    });

    // Draw invaders
    for (const invader of this.invaders) {
      if (!invader.alive) continue;

      const char = this.invaderChars[invader.type];
      const colors = ["yellow", "magenta", "red"] as const;

      this.renderer.drawText(invader.x, invader.y, char, {
        fg: colors[invader.type],
      });
    }

    // Draw bullets
    for (const bullet of this.bullets) {
      const char = bullet.isPlayerBullet ? "│" : "┃";
      const color = bullet.isPlayerBullet ? "cyan" : "red";
      this.renderer.drawText(bullet.x, bullet.y, char, { fg: color });
    }

    // Draw barriers with degradation
    for (const barrier of this.barriers) {
      let char = "█";
      let color: "green" | "yellow" | "red" = "green";

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

  /**
   * Start the game loop
   */
  start(): void {
    this.gameLoop.start();
  }

  /**
   * Stop the game and clean up resources
   */
  stop(): void {
    this.gameLoop.stop();
    this.keyboard.destroy();
    this.gamepad.destroy();
    this.synthManager.destroy();
  }
}
