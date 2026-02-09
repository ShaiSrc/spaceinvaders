/**
 * SynthManager - Manages game sound effects using ZzFX
 *
 * Features:
 * - Type-safe sound effect management
 * - Procedural sound generation (no files needed!)
 * - Volume control and mute functionality
 * - Instant playback (no loading required)
 * - Tiny bundle size (~1KB)
 *
 * @example
 * ```ts
 * const synthManager = new SynthManager();
 * synthManager.play('playerShoot');
 * ```
 */

import { zzfx } from "zzfx";

/**
 * All available sound effects in the game
 */
export type SoundEffect =
  | "playerShoot"
  | "enemyShoot"
  | "explosion"
  | "barrierHit"
  | "playerHit"
  | "invaderMove"
  | "levelComplete"
  | "gameOver";

/**
 * ZzFX sound parameters
 * Format: [volume, randomness, frequency, attack, sustain, release, shape, shapeCurve, vibrato, vibratoFrequency, dissonance, echo, reverb, noise]
 * Parameters can be undefined to use ZzFX defaults
 */
type ZzFXParams = (number | undefined)[];

/**
 * Configuration for a single sound effect
 */
interface SoundConfig {
  /** ZzFX parameter array */
  params: ZzFXParams;
  /** Volume multiplier (0.0 to 1.0) */
  volume?: number;
}

/**
 * Manages all game sound effects with procedural synthesis
 */
export class SynthManager {
  private sounds: Map<SoundEffect, SoundConfig> = new Map();
  private globalVolume: number = 1.0;
  private muted: boolean = false;

  /**
   * Sound effect configurations using ZzFX parameters
   * Each array defines the characteristics of the sound
   */
  private readonly soundConfigs: Record<SoundEffect, SoundConfig> = {
    // Player shoot - bright laser "pew"
    playerShoot: {
      params: [, , 925, 0.04, 0.3, 0.6, 1, 0.3, , 6.27, -184, 0.09, 0.17],
      volume: 0.3,
    },
    // Enemy shoot - lower, more menacing laser
    enemyShoot: {
      params: [, , 520, 0.02, 0.25, 0.5, 1, 0.5, , 4, -150, 0.05, 0.1],
      volume: 0.25,
    },
    // Explosion - classic arcade explosion
    explosion: {
      params: [, , 462, , 0.4, 0.63, 4, 2.7, , , , , , 0.5, , 0.6, 0.04],
      volume: 0.4,
    },
    // Barrier hit - short impact/crack
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
    // Level complete - ascending victory notes
    levelComplete: {
      params: [, , 523, 0.05, 0.2, 0.3, , 0.5, 20, , , , , , , , 0.02],
      volume: 0.6,
    },
    // Game over - descending doom sound
    gameOver: {
      params: [, , 600, 0.1, 0.5, 1.2, 2, 1.2, -20, , , , , 0.2],
      volume: 0.5,
    },
  };

  constructor() {
    // Initialize the sounds map
    for (const [key, config] of Object.entries(this.soundConfigs)) {
      this.sounds.set(key as SoundEffect, config);
    }
  }

  /**
   * Play a sound effect
   * @param effect - The sound effect to play
   */
  play(effect: SoundEffect): void {
    if (this.muted) return;

    const config = this.sounds.get(effect);
    if (!config) {
      console.warn(`Sound not found: ${effect}`);
      return;
    }

    // Apply volume to the first parameter (volume)
    const adjustedParams = [...config.params];
    const effectVolume = config.volume ?? 1.0;
    adjustedParams[0] = effectVolume * this.globalVolume;

    // Play the sound using ZzFX
    zzfx(...adjustedParams);
  }

  /**
   * Set the global volume level
   * @param volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.globalVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Mute all sounds
   */
  mute(): void {
    this.muted = true;
  }

  /**
   * Unmute all sounds
   */
  unmute(): void {
    this.muted = false;
  }

  /**
   * Toggle mute on/off
   * @returns Current mute state
   */
  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  /**
   * Check if sounds are muted
   * @returns True if muted
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * No cleanup needed for ZzFX (no resources to unload)
   */
  destroy(): void {
    // ZzFX has no resources to clean up
    this.sounds.clear();
  }
}
