/**
 * 五子棋遊戲規則與勝負判定模組
 * 負責落子合法性驗證、四向連珠勝負判定、和局判定與棋盤資料結構工具
 */
class GameRules {
  static BOARD_SIZE = 15;
  static ROLE_EMPTY = 0;
  static ROLE_BLACK = 1;
  static ROLE_WHITE = 2;

  // 四個檢查軸向：水平、垂直、正斜線、反斜線
  static DIRECTIONS = [
    { dx: 1, dy: 0 },   // 水平
    { dx: 0, dy: 1 },   // 垂直
    { dx: 1, dy: 1 },   // 正斜線 (左上到右下)
    { dx: 1, dy: -1 }   // 反斜線 (左下到右上)
  ];

  /**
   * 建立預設 15x15 全 0 之棋盤二維陣列
   * @returns {Array<Array<number>>}
   */
  static createEmptyBoard() {
    const size = GameRules.BOARD_SIZE;
    const board = new Array(size);
    for (let r = 0; r < size; r++) {
      board[r] = new Array(size).fill(GameRules.ROLE_EMPTY);
    }
    return board;
  }

  /**
   * 深拷貝棋盤資料
   * @param {Array<Array<number>>} boardMatrix 
   * @returns {Array<Array<number>>}
   */
  static cloneBoard(boardMatrix) {
    if (!boardMatrix) return GameRules.createEmptyBoard();
    const size = boardMatrix.length;
    const cloned = new Array(size);
    for (let r = 0; r < size; r++) {
      cloned[r] = boardMatrix[r].slice();
    }
    return cloned;
  }

  /**
   * 驗證落子是否合法
   * @param {Array<Array<number>>} boardMatrix 
   * @param {number} x 網格 x 座標 (0~14)
   * @param {number} y 網格 y 座標 (0~14)
   * @returns {boolean}
   */
  static isValidMove(boardMatrix, x, y) {
    const size = GameRules.BOARD_SIZE;
    if (x == null || y == null) return false;
    if (x < 0 || x >= size || y < 0 || y >= size) return false;
    return boardMatrix[y][x] === GameRules.ROLE_EMPTY;
  }

  /**
   * 檢查最新落子是否達成五連珠獲勝
   * @param {Array<Array<number>>} boardMatrix 
   * @param {number} lastX 
   * @param {number} lastY 
   * @param {number} role 1: 黑子, 2: 白子
   * @returns {{win: boolean, winner?: number, line?: Array<{x: number, y: number}>}}
   */
  static checkWin(boardMatrix, lastX, lastY, role) {
    if (!role || lastX == null || lastY == null) {
      return { win: false };
    }

    const size = GameRules.BOARD_SIZE;

    for (let d = 0; d < GameRules.DIRECTIONS.length; d++) {
      const { dx, dy } = GameRules.DIRECTIONS[d];
      const winningLine = [{ x: lastX, y: lastY }];

      // 正向搜尋 (例如右、下、右下、右上)
      let step = 1;
      while (true) {
        const nx = lastX + dx * step;
        const ny = lastY + dy * step;
        if (nx < 0 || nx >= size || ny < 0 || ny >= size) break;
        if (boardMatrix[ny][nx] !== role) break;
        winningLine.push({ x: nx, y: ny });
        step++;
      }

      // 反向搜尋 (例如左、上、左上、左下)
      step = 1;
      while (true) {
        const nx = lastX - dx * step;
        const ny = lastY - dy * step;
        if (nx < 0 || nx >= size || ny < 0 || ny >= size) break;
        if (boardMatrix[ny][nx] !== role) break;
        winningLine.unshift({ x: nx, y: ny });
        step++;
      }

      // 連續達到 5 顆（或以上）即判定獲勝
      if (winningLine.length >= 5) {
        return {
          win: true,
          winner: role,
          line: winningLine
        };
      }
    }

    return { win: false };
  }

  /**
   * 檢查是否和局（棋盤 225 格全滿且無人勝出）
   * @param {Array<Array<number>>} boardMatrix 
   * @returns {boolean}
   */
  static checkDraw(boardMatrix) {
    const size = GameRules.BOARD_SIZE;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (boardMatrix[r][c] === GameRules.ROLE_EMPTY) {
          return false;
        }
      }
    }
    return true;
  }
}

// 供全域或腳本直接存取
if (typeof window !== 'undefined') {
  window.GameRules = GameRules;
  window.ROLE_EMPTY = GameRules.ROLE_EMPTY;
  window.ROLE_BLACK = GameRules.ROLE_BLACK;
  window.ROLE_WHITE = GameRules.ROLE_WHITE;
}
