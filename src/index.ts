import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import { Builder, Browser, By, Key, until, WebDriver } from "selenium-webdriver";
import { sleep } from "./utils";
import { Direction, nextMoveDirection } from "./play";

async function isGameOver(driver: WebDriver) {
  const gameOver = await driver.findElements(By.className("game-over"));
  return gameOver.length != 0;
}

async function isGameWon(driver: WebDriver) {
  const gameWon = await driver.findElements(By.className("game-won"));
  return gameWon.length != 0;
}

async function getTileGrids(driver: WebDriver) {
  const ans = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];

  const tiles = await driver.findElements(By.className("tile"));
  for (const tile of tiles) {
    //   tile tile-4 tile-position-1-2 tile-merged
    const classes = await tile.getAttribute("class");
    const ss = classes.split(" ");

    const row = parseInt(ss[2].split("-")[3]) - 1;
    const col = parseInt(ss[2].split("-")[2]) - 1;
    const val = parseInt(ss[1].split("-")[1]);

    if (ans[row][col] !== 0 && ss[3] !== "tile-merged") {
      continue;
    }

    ans[row][col] = val;
  }

  console.log("Current tile grids:");
  for (let i = 0; i < 4; i++) {
    console.log(`${ans[i][0]} ${ans[i][1]} ${ans[i][2]} ${ans[i][3]}`);
  }
  console.log("");

  return ans;
}

async function sendMoveInstructions(driver: WebDriver, direction: Direction) {
  switch (direction) {
    case Direction.Up:
      await driver.actions().sendKeys(Key.UP).perform();
      break;
    case Direction.Down:
      await driver.actions().sendKeys(Key.DOWN).perform();
      break;
    case Direction.Left:
      await driver.actions().sendKeys(Key.LEFT).perform();
      break;
    case Direction.Right:
      await driver.actions().sendKeys(Key.RIGHT).perform();
      break;
    default:
      break;
  }

  await sleep(300);
}

async function saveScreenshot(driver: WebDriver) {
  const picStr = await driver.takeScreenshot();
  const fileName = `2024game-${dayjs().format("YYYY-MM-DD-HH-mm-ss")}.png`;
  fs.writeFileSync(path.join(process.cwd(), fileName), picStr, "base64");
}

async function main() {
  let driver = await new Builder().forBrowser(Browser.CHROME).build();
  try {
    await driver.get("https://2048game.com/");
    await sleep(5000);

    while (true) {
      const tileGrids = await getTileGrids(driver);

      if (await isGameOver(driver)) {
        console.log("Game over!");
        break;
      }

      if (await isGameWon(driver)) {
        console.log("You win!");
        break;
      }

      await sendMoveInstructions(driver, nextMoveDirection(tileGrids));
    }

    await saveScreenshot(driver);
  } finally {
    await sleep(5000);
    await driver.quit();
  }
}

main();
