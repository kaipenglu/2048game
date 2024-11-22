import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import { Builder, Browser, By, Key, WebDriver } from "selenium-webdriver";
import { Options } from "selenium-webdriver/chrome";
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

  return ans;
}

async function sendMoveInstruction(driver: WebDriver, direction: Direction) {
  const keyMap = new Map([
    [Direction.Up, Key.UP],
    [Direction.Down, Key.DOWN],
    [Direction.Left, Key.LEFT],
    [Direction.Right, Key.RIGHT],
  ]);

  const key = keyMap.get(direction);
  if (key) {
    for (let i = 0; i < 10; i++) {
      let isSucceed = true;
      try {
        await driver.actions().sendKeys(key).perform();
      } catch (e: any) {
        isSucceed = false;
        console.error(`sendMoveInstruction error: ${e.message}`);
      }
      if (isSucceed) break;
    }
    await sleep(100);
  }
}

async function saveScreenshot(driver: WebDriver) {
  const picStr = await driver.takeScreenshot();
  const fileName = `2024game-${dayjs().format("YYYY-MM-DD-HH-mm-ss")}.png`;
  fs.writeFileSync(path.join(process.cwd(), fileName), picStr, "base64");
}

enum ButtonType {
  RetryButton = "retry-button",
  KeepPlayingButton = "keep-playing-button",
}

async function clickButton(driver: WebDriver, buttonType: ButtonType) {
  for (let i = 0; i < 10; i++) {
    let isSucceed = true;
    try {
      const button = await driver.findElement(By.className(buttonType));
      await button.click();
    } catch (e: any) {
      isSucceed = false;
      console.error(`clickButton error: ${e.message}`);
    }
    if (isSucceed) break;

    await sleep(100);
  }
}

async function getBestScore(driver: WebDriver) {
  const bestContainer = await driver.findElement(By.className("best-container"));
  const txt = await bestContainer.getText();
  return parseInt(txt);
}

async function main(n: number) {
  const options = new Options();
  options.addArguments("--headless=new");
  const driver = await new Builder().forBrowser(Browser.CHROME).setChromeOptions(options).build();
  try {
    await driver.get("https://2048game.com/");
    await sleep(5000);

    let winCnt = 0;
    for (let i = 0; i < n; i++) {
      while (true) {
        const tileGrids = await getTileGrids(driver);

        if (await isGameOver(driver)) {
          console.log("Game over!");
          break;
        }

        if (await isGameWon(driver)) {
          console.log("You win!");
          winCnt++;
          await clickButton(driver, ButtonType.KeepPlayingButton);
          // break;
        }

        await sendMoveInstruction(driver, nextMoveDirection(tileGrids));
      }

      await saveScreenshot(driver);
      await clickButton(driver, ButtonType.RetryButton);
    }

    console.log(`Win/Total play times: ${winCnt}/${n}`);
    const bestScore = await getBestScore(driver);
    console.log(`Best score: ${bestScore}`);
  } finally {
    await driver.quit();
  }
}

main(100);
