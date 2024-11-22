export enum Direction {
  None,
  Up,
  Down,
  Left,
  Right,
}

function moveUp(gridsBefore: number[][], isFirstMove: boolean) {
  const gridsAfter = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];

  for (let col = 0; col <= 3; col++) {
    const values = [];
    for (let row = 0; row <= 3; row++) {
      if (!isFirstMove && gridsBefore[row][col] == 0) {
        break;
      }
      if (gridsBefore[row][col] > 0) {
        values.push(gridsBefore[row][col]);
      }
    }

    let row = 0;
    while (values.length > 0) {
      if (values.length > 1 && values[0] == values[1]) {
        gridsAfter[row][col] = values[0] * 2;
        values.shift();
        values.shift();
      } else {
        gridsAfter[row][col] = values[0];
        values.shift();
      }
      row++;
    }
  }

  return gridsAfter;
}

function moveDown(gridsBefore: number[][], isFirstMove: boolean) {
  const gridsAfter = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];

  for (let col = 0; col <= 3; col++) {
    const values = [];
    for (let row = 3; row >= 0; row--) {
      if (!isFirstMove && gridsBefore[row][col] == 0) {
        break;
      }
      if (gridsBefore[row][col] > 0) {
        values.push(gridsBefore[row][col]);
      }
    }

    let row = 3;
    while (values.length > 0) {
      if (values.length > 1 && values[0] == values[1]) {
        gridsAfter[row][col] = values[0] * 2;
        values.shift();
        values.shift();
      } else {
        gridsAfter[row][col] = values[0];
        values.shift();
      }
      row--;
    }
  }

  return gridsAfter;
}

function moveLeft(gridsBefore: number[][], isFirstMove: boolean) {
  const gridsAfter = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];

  for (let row = 0; row <= 3; row++) {
    const values = [];
    for (let col = 0; col <= 3; col++) {
      if (!isFirstMove && gridsBefore[row][col] == 0) {
        break;
      }
      if (gridsBefore[row][col] > 0) {
        values.push(gridsBefore[row][col]);
      }
    }

    let col = 0;
    while (values.length > 0) {
      if (values.length > 1 && values[0] == values[1]) {
        gridsAfter[row][col] = values[0] * 2;
        values.shift();
        values.shift();
      } else {
        gridsAfter[row][col] = values[0];
        values.shift();
      }
      col++;
    }
  }

  return gridsAfter;
}

function moveRight(gridsBefore: number[][], isFirstMove: boolean) {
  const gridsAfter = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];

  for (let row = 0; row <= 3; row++) {
    const values = [];
    for (let col = 3; col >= 0; col--) {
      if (!isFirstMove && gridsBefore[row][col] == 0) {
        break;
      }
      if (gridsBefore[row][col] > 0) {
        values.push(gridsBefore[row][col]);
      }
    }

    let col = 3;
    while (values.length > 0) {
      if (values.length > 1 && values[0] == values[1]) {
        gridsAfter[row][col] = values[0] * 2;
        values.shift();
        values.shift();
      } else {
        gridsAfter[row][col] = values[0];
        values.shift();
      }
      col--;
    }
  }

  return gridsAfter;
}

function tileGridsGreaterThan(a: number[][], b: number[][]) {
  const priority = [
    [3, 3],
    [3, 2],
    [3, 1],
    [3, 0],
    [2, 3],
    [2, 2],
    [2, 1],
    [2, 0],
    [1, 3],
    [1, 2],
    [1, 1],
    [1, 0],
    [0, 3],
    [0, 2],
    [0, 1],
    [0, 0],
  ];

  for (const p of priority) {
    if (a[p[0]][p[1]] > b[p[0]][p[1]]) {
      return true;
    }

    if (a[p[0]][p[1]] < b[p[0]][p[1]]) {
      return false;
    }
  }
  return false;
}

let bestDirection = Direction.None;
let bestGrids = [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
];

let gridsSet = new Set<string>();

function dfs(directions: Direction[], grids: number[][]) {
  const gridsJSONStr = JSON.stringify(grids);
  if (gridsSet.has(gridsJSONStr)) {
    return;
  }

  gridsSet.add(gridsJSONStr);

  if (directions.length > 0 && tileGridsGreaterThan(grids, bestGrids)) {
    bestDirection = directions[0];
    bestGrids = grids;
  }

  const moveFuncs = [moveUp, moveDown, moveLeft, moveRight];
  const moveDirections = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];

  for (let i = 0; i <= 3; i++) {
    const newGrids = moveFuncs[i](grids, directions.length === 0);
    if (JSON.stringify(newGrids) !== gridsJSONStr) {
      const newDirections = directions.slice();
      newDirections.push(moveDirections[i]);
      dfs(newDirections, newGrids);
    }
  }
}

export function nextMoveDirection(tileGrids: number[][]): Direction {
  bestDirection = Direction.None;
  bestGrids = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  gridsSet.clear();

  dfs([], tileGrids);

  return bestDirection;
}
