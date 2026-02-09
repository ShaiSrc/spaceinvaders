/**
 * Type definitions for ZzFX
 * ZzFX - Zuper Zmall Zound Zynth
 */

declare module "zzfx" {
  /**
   * ZzFX sound parameters
   * Parameters can be undefined to use defaults
   */
  export type ZzFXParams = (number | undefined)[];

  /**
   * Play a sound using ZzFX
   * @param params - Array of sound parameters
   */
  export function zzfx(...params: (number | undefined)[]): void;
}
