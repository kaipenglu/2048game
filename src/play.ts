import { getRandomIntInclusive } from "./utils";

export enum Direction {
  None,
  Up,
  Down,
  Left,
  Right,
}

export function nextMoveDirection(tileGrids: number[][]): Direction {
  let ans = Direction.None;
  ans = getRandomIntInclusive(1, 4);
  return ans;
}
