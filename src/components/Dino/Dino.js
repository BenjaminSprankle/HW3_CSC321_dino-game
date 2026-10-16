import React, { useEffect, useState } from "react";
import "./Dino.css";

const SHIELD_SECTION_POINTS = 500;
const SPEED_STEP_POINTS = 1000;
const DUCK_DURATION_TICKS = 60;
const JUMP_STRENGTH = -8;
const GRAVITY = 0.27;

// Pick one random score in each 500-point section.
export function shieldScore(section) {
  const sectionStart = section * SHIELD_SECTION_POINTS;
  const randomPoint = Math.floor(Math.random() * SHIELD_SECTION_POINTS) + 1;
  return sectionStart + randomPoint;
}

// Lower the top of the arc while keeping the same cactus-clearance timing.
function jumpTop(top) {
  const cactusClearTop = 110;
  if (top >= cactusClearTop) return top;
  const extraHeight = cactusClearTop - top;
  return cactusClearTop - extraHeight / 4;
}

function speedMultiplier(score) {
  const level = Math.floor(score / SPEED_STEP_POINTS);
  return 1 + level * 0.2;
}

function resetObstacle(next) {
  next.obstacleLeft = 580;
  next.bird = Math.random() < 0.4;
  next.doubleCactus = false;
  if (!next.bird) {
    next.doubleCactus = Math.random() < 0.35;
  }
}

export function newGame() {
  return {
    score: 0,
    dinoTop: 150,
    jumpSpeed: 0,
    duckTicks: 0,
    obstacleLeft: 580,
    bird: false,
    doubleCactus: false,
    shields: [],
    hasShield: false,
    nextShield: shieldScore(0),
    gameOver: false,
  };
}

export function moveGame(previous) {
  if (previous.gameOver) return previous;
  const next = {
    ...previous,
    score: previous.score + 1,
    duckTicks: Math.max(0, previous.duckTicks - 1),
  };
  const speed = 3 * speedMultiplier(next.score);

  if (next.jumpSpeed !== 0 || next.dinoTop < 150) {
    next.dinoTop += next.jumpSpeed;
    next.jumpSpeed += GRAVITY;
    if (next.dinoTop >= 150) {
      next.dinoTop = 150;
      next.jumpSpeed = 0;
    }
  }

  next.obstacleLeft -= speed;
  if (next.obstacleLeft < -(next.doubleCactus ? 80 : 40)) {
    resetObstacle(next);
  }

  const isDucking = next.duckTicks > 0 && next.dinoTop === 150;
  const dinoTop = isDucking ? 175 : jumpTop(next.dinoTop);
  const dinoHeight = isDucking ? 25 : 50;
  next.shields = [];
  for (const oldLeft of previous.shields) {
    const left = oldLeft - speed;
    if (left < -28) continue;
    const touchingDino =
      left < 70 && left + 28 > 20 &&
      dinoTop < 190 && dinoTop + dinoHeight > 162;
    if (touchingDino) {
      next.hasShield = true;
    } else {
      next.shields.push(left);
    }
  }

  if (next.score >= next.nextShield) {
    next.shields.push(580);
    const nextSection = Math.ceil(next.nextShield / SHIELD_SECTION_POINTS);
    next.nextShield = shieldScore(nextSection);
  }

  let obstacleTop = 160;
  let obstacleHeight = 40;
  let obstacleWidth = 20;
  if (next.bird) {
    obstacleTop = 130;
    obstacleHeight = 36;
    obstacleWidth = 40;
  } else if (next.doubleCactus) {
    obstacleWidth = 80;
  }
  if (
    next.obstacleLeft < 70 && next.obstacleLeft + obstacleWidth > 20 &&
    dinoTop < obstacleTop + obstacleHeight && dinoTop + dinoHeight > obstacleTop
  ) {
    if (next.hasShield) {
      next.hasShield = false;
      resetObstacle(next);
    } else {
      next.gameOver = true;
    }
  }
  return next;
}

function Dino() {
  const [game, setGame] = useState(newGame);
  const [paused, setPaused] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    try {
      return Number(localStorage.getItem("dinoHighScore")) || 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (game.score > highScore) {
      setHighScore(game.score);
      try {
        localStorage.setItem("dinoHighScore", String(game.score));
      } catch {
        // Keep playing even if the browser blocks saved scores.
      }
    }
  }, [game.score, highScore]);

  useEffect(() => {
    function keyDown(event) {
      if (event.code === "Escape") {
        if (!game.gameOver && !event.repeat) {
          setPaused((previous) => !previous);
        }
        return;
      }

      const isDuckKey = event.code === "ArrowDown";
      const isJumpKey = event.code === "ArrowUp" || event.code === "Space";
      if (!isDuckKey && !isJumpKey) return;
      if (event.code === "Space" && event.target.tagName === "BUTTON") return;
      event.preventDefault();
      if (paused || game.gameOver || event.repeat) return;

      setGame((previous) => {
        const inAir = previous.dinoTop < 150 || previous.jumpSpeed !== 0;
        const ducking = previous.duckTicks > 0;
        if (inAir || ducking) return previous;
        if (isDuckKey) {
          return { ...previous, duckTicks: DUCK_DURATION_TICKS };
        }
        return { ...previous, jumpSpeed: JUMP_STRENGTH };
      });
    }
    function loseFocus() {
      setPaused(true);
    }
    document.addEventListener("keydown", keyDown);
    window.addEventListener("blur", loseFocus);
    return () => {
      document.removeEventListener("keydown", keyDown);
      window.removeEventListener("blur", loseFocus);
    };
  }, [paused, game.gameOver]);

  useEffect(() => {
    if (paused || game.gameOver) return;

    // One timer moves everything, so pause freezes the whole game.
    const timer = setInterval(() => {
      setGame((previous) => moveGame(previous));
    }, 10);
    return () => clearInterval(timer);
  }, [paused, game.gameOver]);

  function restart() {
    setGame(newGame());
    setPaused(false);
  }

  const isDucking = game.duckTicks > 0 && game.dinoTop === 150;
  const speed = speedMultiplier(game.score).toFixed(1);
  let obstacleClass = "";
  let obstacleLabel = "Cactus";
  if (game.bird) {
    obstacleClass = "bird";
    obstacleLabel = "Bird";
  } else if (game.doubleCactus) {
    obstacleClass = "double-cactus";
    obstacleLabel = "Double cactus";
  }

  return (
    <div className="dino-game">
      <h1>Dino Game</h1>
      <div className="score-bar">
        <span>Score: {game.score}</span>
        <span>High score: {highScore}</span>
        <span>Speed: {speed}x</span>
        <button disabled={game.gameOver} onClick={() => setPaused(true)}>Pause</button>
      </div>
      <div className="game">
        <div
          id="dino"
          className={`${isDucking ? "ducking" : ""} ${game.hasShield ? "shielded" : ""}`}
          style={{ top: isDucking ? 175 : jumpTop(game.dinoTop) }}
        />
        <div
          id={game.bird ? undefined : "cactus"}
          className={obstacleClass}
          style={{ left: game.obstacleLeft }}
          aria-label={obstacleLabel}
        />
        {game.shields.map((left, index) => (
          <div className="shield-pickup" key={index} style={{ left }} aria-label="Shield pickup" />
        ))}
        {(paused || game.gameOver) && (
          <div className="menu-background">
            <div className="pause-menu">
              <h2>{game.gameOver ? "Game Over" : "Paused"}</h2>
              <p>Score: {game.score}</p>
              {!game.gameOver && <button onClick={() => setPaused(false)}>Resume</button>}
              <button onClick={restart}>Restart</button>
            </div>
          </div>
        )}
      </div>
      <p className="controls">Space / Up: jump · Down: timed duck · Esc: pause / resume</p>
      <p className="shield-status">Shield: {game.hasShield ? "Ready — blocks one hit" : "None"}</p>
    </div>
  );
}

export default Dino;
