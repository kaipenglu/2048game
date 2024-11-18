"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dayjs_1 = __importDefault(require("dayjs"));
const selenium_webdriver_1 = require("selenium-webdriver");
const utils_1 = require("./utils");
const play_1 = require("./play");
function isGameOver(driver) {
    return __awaiter(this, void 0, void 0, function* () {
        const gameOver = yield driver.findElements(selenium_webdriver_1.By.className("game-over"));
        return gameOver.length != 0;
    });
}
function isGameWon(driver) {
    return __awaiter(this, void 0, void 0, function* () {
        const gameWon = yield driver.findElements(selenium_webdriver_1.By.className("game-won"));
        return gameWon.length != 0;
    });
}
function getTileGrids(driver) {
    return __awaiter(this, void 0, void 0, function* () {
        const ans = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ];
        const tiles = yield driver.findElements(selenium_webdriver_1.By.className("tile"));
        for (const tile of tiles) {
            //   tile tile-4 tile-position-1-2 tile-merged
            const classes = yield tile.getAttribute("class");
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
    });
}
function sendMoveInstructions(driver, direction) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (direction) {
            case play_1.Direction.Up:
                yield driver.actions().sendKeys(selenium_webdriver_1.Key.UP).perform();
                break;
            case play_1.Direction.Down:
                yield driver.actions().sendKeys(selenium_webdriver_1.Key.DOWN).perform();
                break;
            case play_1.Direction.Left:
                yield driver.actions().sendKeys(selenium_webdriver_1.Key.LEFT).perform();
                break;
            case play_1.Direction.Right:
                yield driver.actions().sendKeys(selenium_webdriver_1.Key.RIGHT).perform();
                break;
            default:
                break;
        }
        yield (0, utils_1.sleep)(300);
    });
}
function saveScreenshot(driver) {
    return __awaiter(this, void 0, void 0, function* () {
        const picStr = yield driver.takeScreenshot();
        const fileName = `2024game-${(0, dayjs_1.default)().format("YYYY-MM-DD-HH-mm-ss")}.png`;
        fs_1.default.writeFileSync(path_1.default.join(process.cwd(), fileName), picStr, "base64");
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let driver = yield new selenium_webdriver_1.Builder().forBrowser(selenium_webdriver_1.Browser.CHROME).build();
        try {
            yield driver.get("https://2048game.com/");
            yield (0, utils_1.sleep)(5000);
            while (true) {
                const tileGrids = yield getTileGrids(driver);
                if (yield isGameOver(driver)) {
                    console.log("Game over!");
                    break;
                }
                if (yield isGameWon(driver)) {
                    console.log("You win!");
                    break;
                }
                yield sendMoveInstructions(driver, (0, play_1.nextMoveDirection)(tileGrids));
            }
            yield saveScreenshot(driver);
        }
        finally {
            yield (0, utils_1.sleep)(5000);
            yield driver.quit();
        }
    });
}
main();
