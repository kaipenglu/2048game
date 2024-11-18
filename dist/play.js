"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Direction = void 0;
exports.nextMoveDirection = nextMoveDirection;
const utils_1 = require("./utils");
var Direction;
(function (Direction) {
    Direction[Direction["None"] = 0] = "None";
    Direction[Direction["Up"] = 1] = "Up";
    Direction[Direction["Down"] = 2] = "Down";
    Direction[Direction["Left"] = 3] = "Left";
    Direction[Direction["Right"] = 4] = "Right";
})(Direction || (exports.Direction = Direction = {}));
function nextMoveDirection(tileGrids) {
    let ans = Direction.None;
    ans = (0, utils_1.getRandomIntInclusive)(1, 4);
    return ans;
}
