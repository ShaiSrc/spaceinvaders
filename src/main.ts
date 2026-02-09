/**
 * Main entry point for Space Invaders
 *
 * This file initializes the game and starts the game loop
 */

import { SpaceInvadersGame } from "./game";

/**
 * Initialize and start the game
 */
function main(): void {
  // Get the canvas element
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;

  if (!canvas) {
    console.error("Canvas element not found!");
    return;
  }

  // Create the game instance
  const game = new SpaceInvadersGame(canvas);

  // Start the game loop (sounds are ready immediately with ZzFX!)
  console.log("Game ready!");
  game.start();

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    game.stop();
  });
}

// Start the game when the DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
