import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import { Builder, Browser, By, Key, WebDriver, until } from "selenium-webdriver";
import { Options } from "selenium-webdriver/chrome";
import { sleep } from "./utils";
import { Direction, nextMoveDirection, CURRENT_SEARCH_STRENGTH } from "./play";

/**
 * 每次移动后的间隔延时 (毫秒)
 * 25ms 约对应 1~2 帧动画渲染，既能确保浏览器 DOM 及时刷新，
 * 又能达到每秒 20~30 步的高速自动化体验。
 */
const MOVE_DELAY_MS = 25;

/**
 * 游戏完整状态接口 (单次浏览器端脚本即可一次性获取全部数据)
 */
interface GameState {
  grids: number[][];
  isGameOver: boolean;
  isGameWon: boolean;
  score: number;
  bestScore: number;
}

/**
 * 在浏览器端直接执行 JS 提取完整游戏状态
 * 
 * 【性能优化要点】：
 * 原有实现每次循环调用 `driver.findElements(By.className("tile"))`，
 * 并对每个方块分别执行 `tile.getAttribute("class")`，单步需要进行 15~25 次 WebDriver IPC 往返（耗时 200~300ms）。
 * 优化后：将全部 DOM 解析、游戏结束检测、胜利检测与分数获取合并为一次 `driver.executeScript`，
 * 单次往返（~2ms）完成全部数据提取，速度提升近 100 倍！
 */
async function getGameState(driver: WebDriver): Promise<GameState> {
  return await driver.executeScript<GameState>(`
    const ans = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];

    const tiles = document.getElementsByClassName("tile");
    for (let i = 0; i < tiles.length; i++) {
      const cl = tiles[i].className;
      const posMatch = cl.match(/tile-position-(\\d+)-(\\d+)/);
      const valMatch = cl.match(/\\btile-(\\d+)\\b/);
      const isMerged = cl.indexOf("tile-merged") !== -1;

      if (posMatch && valMatch) {
        const col = parseInt(posMatch[1], 10) - 1;
        const row = parseInt(posMatch[2], 10) - 1;
        const val = parseInt(valMatch[1], 10);

        if (row >= 0 && row < 4 && col >= 0 && col < 4 && val > 0) {
          // 若同一格子有重叠旧块与合并后新块，以合并新块 (tile-merged) 为准
          if (ans[row][col] === 0 || isMerged) {
            ans[row][col] = val;
          }
        }
      }
    }

    const gameOverEl = document.querySelector(".game-message.game-over");
    const gameWonEl = document.querySelector(".game-message.game-won");
    const scoreEl = document.querySelector(".score-container");
    const bestEl = document.querySelector(".best-container");

    function parseScore(el) {
      if (!el) return 0;
      const text = el.childNodes[0] ? el.childNodes[0].textContent : el.textContent;
      return parseInt(text.replace(/[^\\d]/g, ""), 10) || 0;
    }

    return {
      grids: ans,
      isGameOver: !!gameOverEl,
      isGameWon: !!gameWonEl,
      score: parseScore(scoreEl),
      bestScore: parseScore(bestEl)
    };
  `);
}

/**
 * 判断两个 4x4 棋盘是否完全相同
 */
function areGridsEqual(a: number[][], b: number[][]): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

/**
 * 获取棋盘当前最大方块数值
 */
function getMaxTile(grids: number[][]): number {
  let max = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grids[r][c] > max) max = grids[r][c];
    }
  }
  return max;
}

/**
 * 移动方向对应 Selenium 键盘常量映射
 */
const KEY_MAP = new Map<Direction, string>([
  [Direction.Up, Key.UP],
  [Direction.Down, Key.DOWN],
  [Direction.Left, Key.LEFT],
  [Direction.Right, Key.RIGHT],
]);

/**
 * 向浏览器发送按键滑动指令
 */
async function sendMoveInstruction(driver: WebDriver, direction: Direction): Promise<boolean> {
  const key = KEY_MAP.get(direction);
  if (!key) return false;

  try {
    await driver.actions().sendKeys(key).perform();
    return true;
  } catch (e: any) {
    console.error(`sendMoveInstruction error: ${e.message}`);
    return false;
  }
}

/**
 * 保存游戏对局截图
 */
async function saveScreenshot(driver: WebDriver, round: number) {
  try {
    const picStr = await driver.takeScreenshot();
    const fileName = `2048game-${dayjs().format("YYYY-MM-DD-HH-mm-ss")}-round${round}.png`;
    fs.writeFileSync(path.join(process.cwd(), fileName), picStr, "base64");
    console.log(`📸 截图已保存: ${fileName}`);
  } catch (e: any) {
    console.error(`saveScreenshot error: ${e.message}`);
  }
}

enum ButtonType {
  RetryButton = "retry-button",
  KeepPlayingButton = "keep-playing-button",
}

/**
 * 优先在浏览器内直接执行 DOM 点击，速度极快且不被遮挡阻拦
 */
async function clickButton(driver: WebDriver, buttonType: ButtonType) {
  for (let i = 0; i < 5; i++) {
    try {
      const clicked = await driver.executeScript<boolean>(`
        const btn = document.querySelector(".${buttonType}");
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      `);
      if (clicked) return;
    } catch {}

    try {
      const button = await driver.findElement(By.className(buttonType));
      await button.click();
      return;
    } catch {}

    await sleep(100);
  }
}

/**
 * 主执行函数
 * @param n 对局盘数
 */
async function main(n: number) {
  const options = new Options();
  options.addArguments("--start-maximized");
  options.addArguments("--disable-blink-features=AutomationControlled");

  const driver = await new Builder().forBrowser(Browser.CHROME).setChromeOptions(options).build();

  try {
    console.log("🚀 正在启动 Chrome 并打开 2048 页面...");
    await driver.get("https://2048game.com/");

    // 等待棋盘元素加载就绪，替代盲目长延时
    try {
      await driver.wait(until.elementLocated(By.className("grid-container")), 8000);
    } catch {
      await sleep(2000);
    }
    await sleep(500);

    let winCnt = 0;

    for (let round = 1; round <= n; round++) {
      console.log(`\n🎮 ===== 开始第 ${round} / ${n} 局 =====`);

      let moveCount = 0;
      let maxTileEver = 0;
      let keepPlayingHandled = false;
      let prevGrids: number[][] | null = null;
      const startTime = Date.now();

      while (true) {
        // 单次 IPC 极速获取完整棋盘及游戏状态
        let state = await getGameState(driver);

        // 如果棋盘状态未刷新（极少数帧率丢帧情况），短暂等待 15ms 补读一次
        if (prevGrids && areGridsEqual(state.grids, prevGrids) && !state.isGameOver) {
          await sleep(15);
          state = await getGameState(driver);
        }

        // 检测游戏结束
        if (state.isGameOver) {
          const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`\n💀 游戏结束！总步数: ${moveCount} | 最大方块: ${maxTileEver} | 最终得分: ${state.score} | 耗时: ${totalTime}s`);
          break;
        }

        // 首次达成 2048 胜利处理：自动点击 "Keep going" 继续冲击 4096+
        if (state.isGameWon && !keepPlayingHandled) {
          winCnt++;
          keepPlayingHandled = true;
          console.log(`\n🏆 恭喜！已成功达成 2048！(步数: ${moveCount}, 得分: ${state.score})`);
          console.log("⏩ 自动点击 [Keep going] 继续冲击更高分数...");
          await sleep(300);
          await clickButton(driver, ButtonType.KeepPlayingButton);
          await sleep(300);
          continue;
        }

        // 记录方块突破里程碑
        const currentMax = getMaxTile(state.grids);
        if (currentMax > maxTileEver) {
          maxTileEver = currentMax;
          if (maxTileEver >= 128) {
            console.log(`⭐ 达成里程碑方块: ${maxTileEver} (步数: ${moveCount}, 得分: ${state.score})`);
          }
        }

        // 每 100 步输出对局实时速率信息
        if (moveCount > 0 && moveCount % 100 === 0) {
          const elapsedSec = (Date.now() - startTime) / 1000;
          const speed = (moveCount / elapsedSec).toFixed(1);
          console.log(`[步数 ${moveCount}] 当前最大: ${maxTileEver} | 得分: ${state.score} | 速度: ${speed} 步/秒`);
        }

        // AI 决策下一步移动方向
        const dir = nextMoveDirection(state.grids);
        if (dir === Direction.None) {
          console.log("⚠️ 无可行移动方向，等待局势结算...");
          await sleep(100);
          continue;
        }

        // 发送按键指令并更新步数
        prevGrids = state.grids;
        await sendMoveInstruction(driver, dir);
        moveCount++;

        // 帧间微延时，给浏览器 DOM 重绘留出短暂时间
        if (MOVE_DELAY_MS > 0) {
          await sleep(MOVE_DELAY_MS);
        }
      }

      // 保存对局结算截图
      await saveScreenshot(driver, round);
      await sleep(1000);

      // 若有多轮对局，自动点击重试
      if (round < n) {
        console.log("🔄 准备重新开始下一局...");
        await clickButton(driver, ButtonType.RetryButton);
        await sleep(1000);
      }
    }

    console.log(`\n========================================`);
    console.log(`🎉 全部对局完成！达成 2048 胜率: ${winCnt}/${n}`);
    console.log(`========================================\n`);

  } finally {
    await driver.quit();
  }
}

// 默认运行 1 盘对局
main(1);
