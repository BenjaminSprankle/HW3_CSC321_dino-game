import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Dino, { newGame, moveGame, shieldScore } from "./Dino";

beforeEach(() => jest.spyOn(Math, "random").mockReturnValue(0.5));

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  localStorage.clear();
});

test("pause freezes the run, resume continues, and restart keeps the saved high score", () => {
  jest.useFakeTimers();
  const { container, unmount } = render(<Dino />);
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByText("Score: 100")).toBeInTheDocument();
  const position = container.querySelector("#cactus").style.left;
  fireEvent.click(screen.getByRole("button", { name: "Pause", exact: true }));
  act(() => jest.advanceTimersByTime(1000));
  expect(container.querySelector("#cactus").style.left).toBe(position);
  expect(screen.getAllByText("Score: 100")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));
  act(() => jest.advanceTimersByTime(100));
  expect(screen.getByText("Score: 110")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Pause", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Restart" }));
  expect(screen.getByText("Score: 0")).toBeInTheDocument();
  expect(screen.getByText("High score: 110")).toBeInTheDocument();
  expect(screen.queryByText("Paused")).not.toBeInTheDocument();
  unmount();
  render(<Dino />);
  expect(screen.getByText("High score: 110")).toBeInTheDocument();
});

test("Down gives one timed duck per press, without release or holding changing its length", () => {
  jest.useFakeTimers();
  const { container } = render(<Dino />);
  fireEvent.keyDown(document, { code: "ArrowDown" });
  expect(container.querySelector("#dino")).toHaveClass("ducking");
  fireEvent.keyUp(document, { code: "ArrowDown" });
  expect(container.querySelector("#dino")).toHaveClass("ducking");
  act(() => jest.advanceTimersByTime(300));
  fireEvent.keyDown(document, { code: "ArrowDown", repeat: true });
  fireEvent.keyDown(document, { code: "ArrowDown" });
  act(() => jest.advanceTimersByTime(300));
  expect(container.querySelector("#dino")).not.toHaveClass("ducking");
  fireEvent.keyDown(document, { code: "ArrowDown", repeat: true });
  expect(container.querySelector("#dino")).not.toHaveClass("ducking");
  fireEvent.keyUp(document, { code: "ArrowDown" });
  fireEvent.keyDown(document, { code: "ArrowDown" });
  expect(container.querySelector("#dino")).toHaveClass("ducking");
  fireEvent.click(screen.getByRole("button", { name: "Pause", exact: true }));
  act(() => jest.advanceTimersByTime(1000));
  expect(container.querySelector("#dino")).toHaveClass("ducking");
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));
  act(() => jest.advanceTimersByTime(600));
  expect(container.querySelector("#dino")).not.toHaveClass("ducking");
  fireEvent.keyDown(document, { code: "ArrowUp" });
  act(() => jest.advanceTimersByTime(10));
  expect(Number.parseFloat(container.querySelector("#dino").style.top)).toBeLessThan(150);
});

test("ducking avoids birds but still hits cacti", () => {
  const bird = { ...newGame(), obstacleLeft: 72, bird: true };
  expect(moveGame({ ...bird, duckTicks: 60 }).gameOver).toBe(false);
  expect(moveGame(bird).gameOver).toBe(true);
  expect(moveGame({ ...bird, bird: false, duckTicks: 60 }).gameOver).toBe(true);
});

test("the lower jump keeps its 0.6-second airtime", () => {
  jest.useFakeTimers();
  const { container } = render(<Dino />);
  fireEvent.keyDown(document, { code: "ArrowUp" });
  let frames = 0;
  let highestTop = 150;
  let top;
  do {
    act(() => jest.advanceTimersByTime(10));
    top = Number.parseFloat(container.querySelector("#dino").style.top);
    highestTop = Math.min(highestTop, top);
    frames++;
  } while (top < 150 && frames < 100);
  expect(frames).toBeGreaterThanOrEqual(58);
  expect(frames).toBeLessThanOrEqual(64);
  expect(150 - highestTop).toBeGreaterThan(55);
  expect(150 - highestTop).toBeLessThan(65);
  expect(top).toBe(150);
});

test("birds cannot be cleared at any point in a jump", () => {
  let game = { ...newGame(), jumpSpeed: -8 };
  for (let frame = 0; frame < 61; frame++) {
    expect(moveGame({ ...game, bird: true, obstacleLeft: 72 }).gameOver).toBe(true);
    game = moveGame(game);
  }
});

test("single cacti forgive earlier jumps, while pairs need tighter timing", () => {
  function clearsCactus(left, doubleCactus) {
    let game = { ...newGame(), jumpSpeed: -8, obstacleLeft: left, doubleCactus };
    const width = doubleCactus ? 80 : 20;
    while (game.obstacleLeft + width > 20 && !game.gameOver) {
      game = moveGame(game);
    }
    return !game.gameOver;
  }
  expect(clearsCactus(140, false)).toBe(true);
  expect(clearsCactus(200, false)).toBe(false);
  expect(clearsCactus(100, true)).toBe(true);
  expect(clearsCactus(140, true)).toBe(false);
  expect(moveGame({ ...newGame(), doubleCactus: true, obstacleLeft: -45 }).gameOver).toBe(true);
  const passedCactus = { ...newGame(), obstacleLeft: -81 };
  jest.spyOn(Math, "random").mockReturnValueOnce(0.8).mockReturnValueOnce(0.1);
  expect(moveGame(passedCactus).doubleCactus).toBe(true);
});

test("speed increases at 1000 and 2000 points", () => {
  const before = { ...newGame(), score: 998, obstacleLeft: 500 };
  const at999 = moveGame(before);
  const at1000 = moveGame(at999);
  expect(before.obstacleLeft - at999.obstacleLeft).toBeCloseTo(3);
  expect(at999.obstacleLeft - at1000.obstacleLeft).toBeCloseTo(3.6);
  const at2000 = moveGame({ ...before, score: 1999 });
  expect(before.obstacleLeft - at2000.obstacleLeft).toBeCloseTo(4.2);
});

test("a collected shield absorbs exactly one collision", () => {
  const collected = moveGame({ ...newGame(), shields: [72], obstacleLeft: 500 });
  expect(collected.hasShield).toBe(true);
  expect(collected.shields).toHaveLength(0);
  const protectedRun = moveGame({ ...collected, obstacleLeft: 72 });
  expect(protectedRun.hasShield).toBe(false);
  expect(protectedRun.gameOver).toBe(false);
  expect(moveGame({ ...protectedRun, obstacleLeft: 72 }).gameOver).toBe(true);
});

test("shields can spawn at 500 and 501, then wait for the next section", () => {
  const random = jest.spyOn(Math, "random").mockReturnValue(0.999);
  expect(shieldScore(0)).toBe(500);
  let game = { ...newGame(), score: 499 };
  random.mockReturnValue(0);
  game = moveGame(game);
  expect(game.shields).toHaveLength(1);
  expect(game.nextShield).toBe(501);
  game = moveGame(game);
  expect(game.shields).toHaveLength(2);
  expect(game.nextShield).toBe(1001);
  for (let score = 502; score <= 1000; score++) {
    game = moveGame({ ...game, obstacleLeft: 580 });
    expect(game.shields).not.toContain(580);
  }
  game = moveGame({ ...game, obstacleLeft: 580 });
  expect(game.shields).toContain(580);
  expect(game.nextShield).toBe(1501);
});
