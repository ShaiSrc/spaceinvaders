# Space Invaders Tutorial

A complete Space Invaders game built with TypeScript, [@shaisrc/tty](https://github.com/ShaiSrc/tty), and ZzFX for procedural sound.

This project accompanies the tutorial **"Create your first Game in TypeScript"** on dev.to.

## Features

- 🎮 Classic Space Invaders gameplay
- 🎹 Keyboard and gamepad support
- 🔊 Procedural sound effects with ZzFX (zero assets)
- 📱 Responsive ASCII/grid-based rendering
- 🎨 Retro terminal-style graphics
- 📊 Score tracking and level progression

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/ShaiSrc/spaceinvaders.git
   cd space-invaders
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

### Running the Game

Development mode with hot reload:

```bash
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

Type check:

```bash
npm run type-check
```

## Controls

### Keyboard

- **Arrow Left/Right**: Move ship
- **Space**: Shoot
- **P**: Pause game
- **R**: Restart (when game over)

### Gamepad

- **D-pad / Left Stick**: Move ship
- **A Button**: Shoot
- **Start Button**: Pause game
- **B Button**: Restart (when game over)

## Project Structure

```
SpaceInvaders/
├── src/
│   ├── SynthManager.ts  # ZzFX sound generation
│   ├── game.ts          # Main game logic
│   └── main.ts          # Entry point
├── index.html           # HTML template
├── package.json
├── tsconfig.json
└── vite.config.ts       # Build configuration
```

## Learning Resources

- **Tutorial**: [Create your first Game in TypeScript](./tutorial.md)
- **@shaisrc/tty Documentation**: [https://github.com/ShaiSrc/tty](https://tty.shaitern.dev)
- **ZzFX**: [https://github.com/KilledByAPixel/ZzFX](https://github.com/KilledByAPixel/ZzFX)

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Original Space Invaders by Tomohiro Nishikado (1978)
- Built with [@shaisrc/tty](https://github.com/ShaiSrc/tty)
- Sound chips generated with [ZzFX](https://github.com/KilledByAPixel/ZzFX)
