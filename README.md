# Dino Game

CSC321 HW3. Uses the provided React starter.

## Run

Install Node.js, then run:

```sh
npm install
npm start
```

## Controls

- Space or Up: jump.
- Down: duck for 0.6 seconds. Press again for the next bird.
- Esc: pause or resume.
- Restart is in the pause and game-over menus.

## Added features

1. High score saved in the browser.
2. Pause/resume menu with restart.
3. Speed increases 20% every 1,000 points.
4. One random shield per 500-point section. Blocks one hit.
5. Birds that require a timed duck.
6. Double-cactus obstacles.

## Check

```sh
npm test -- --watchAll=false
npm run build
```
