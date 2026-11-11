/**
 * 棋盤核心繪圖與互動模組
 * 負責 Canvas 15x15 棋盤渲染、星位繪製、棋子立體感渲染與座標換算
 */
class ChessBoard {
  static BOARD_SIZE = 15;
  static STAR_POINTS = [
    { x: 3, y: 3 },
    { x: 11, y: 3 },
    { x: 7, y: 7 }, // 天元
    { x: 3, y: 11 },
    { x: 11, y: 11 }
  ];

  constructor(canvas) {
    if (typeof canvas === 'string') {
      this.canvas = document.getElementById(canvas);
    } else {
      this.canvas = canvas;
    }
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    // 計算格線與邊距：14 個格子，計算整除或最貼合之格寬
    this.margin = 20;
    this.cellSize = (this.width - this.margin * 2) / (ChessBoard.BOARD_SIZE - 1);
    this.pieceRadius = this.cellSize * 0.42;
  }

  /**
   * 清除畫布
   */
  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * 繪製棋盤底色、格線與星位
   */
  drawGrid() {
    const ctx = this.ctx;
    const margin = this.margin;
    const cellSize = this.cellSize;
    const size = ChessBoard.BOARD_SIZE;

    // 繪製背景底色
    ctx.fillStyle = '#f1ebd8';
    ctx.fillRect(0, 0, this.width, this.height);

    // 繪製格線
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 1;

    for (let i = 0; i < size; i++) {
      // 橫線
      ctx.beginPath();
      ctx.moveTo(margin, margin + i * cellSize);
      ctx.lineTo(this.width - margin, margin + i * cellSize);
      ctx.stroke();

      // 直線
      ctx.beginPath();
      ctx.moveTo(margin + i * cellSize, margin);
      ctx.lineTo(margin + i * cellSize, this.height - margin);
      ctx.stroke();
    }

    // 繪製外邊框加粗
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 2;
    ctx.strokeRect(margin, margin, this.width - margin * 2, this.height - margin * 2);

    // 繪製 5 個星位基準點
    ctx.fillStyle = '#57534e';
    for (const pt of ChessBoard.STAR_POINTS) {
      const cx = margin + pt.x * cellSize;
      const cy = margin + pt.y * cellSize;
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * 繪製單顆棋子（具備光影半徑漸變立體感）
   * @param {number} x 網格 x 座標 (0~14)
   * @param {number} y 網格 y 座標 (0~14)
   * @param {number} role 1: 黑子, 2: 白子
   * @param {number} opacity 透明度 (0~1)
   */
  drawPiece(x, y, role, opacity = 1) {
    if (!role) return;

    const ctx = this.ctx;
    const cx = this.margin + x * this.cellSize;
    const cy = this.margin + y * this.cellSize;
    const r = this.pieceRadius;

    ctx.save();
    ctx.globalAlpha = opacity;

    // 棋子投影陰影
    if (opacity >= 0.8) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);

    // 光影漸變 (Radial Gradient)
    const lightOffsetX = cx - r * 0.3;
    const lightOffsetY = cy - r * 0.3;
    const grad = ctx.createRadialGradient(lightOffsetX, lightOffsetY, r * 0.1, cx, cy, r);

    if (role === 1) {
      // 黑棋：微光澤金屬深墨色
      grad.addColorStop(0, '#475569');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fill();
    } else {
      // 白棋：象牙白微光
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.85, '#e2e8f0');
      grad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 標註最新落子位置（高亮標記）
   * @param {number} x 網格 x 座標
   * @param {number} y 網格 y 座標
   */
  drawLastMoveMark(x, y) {
    const ctx = this.ctx;
    const cx = this.margin + x * this.cellSize;
    const cy = this.margin + y * this.cellSize;

    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * 滑鼠移動時於合法空位交叉點顯示半透明預覽棋子
   * @param {number} x 網格 x 座標
   * @param {number} y 網格 y 座標
   * @param {number} role 1: 黑子, 2: 白子
   */
  drawHoverPiece(x, y, role) {
    if (x == null || y == null) return;
    this.drawPiece(x, y, role, 0.45);
  }

  /**
   * 將滑鼠在 Canvas 上的偏移座標轉換為網格交叉點座標 (0~14)
   * @param {number} offsetX 
   * @param {number} offsetY 
   * @returns {{x: number, y: number} | null}
   */
  getGridPosition(offsetX, offsetY) {
    const col = Math.round((offsetX - this.margin) / this.cellSize);
    const row = Math.round((offsetY - this.margin) / this.cellSize);

    // 邊界防呆
    if (col < 0 || col >= ChessBoard.BOARD_SIZE || row < 0 || row >= ChessBoard.BOARD_SIZE) {
      return null;
    }

    // 計算點擊位置與交叉點中心的距離差，避免點在格線中間偏遠處判定
    const targetX = this.margin + col * this.cellSize;
    const targetY = this.margin + row * this.cellSize;
    const dist = Math.hypot(offsetX - targetX, offsetY - targetY);

    if (dist <= this.cellSize * 0.48) {
      return { x: col, y: row };
    }
    return null;
  }

  /**
   * 完整重繪棋盤狀態
   * @param {Array<Array<number>>} boardMatrix 15x15 棋盤二維陣列 (0: 空, 1: 黑, 2: 白)
   * @param {{x: number, y: number} | null} lastMove 最後落子座標
   */
  render(boardMatrix, lastMove = null) {
    this.clear();
    this.drawGrid();

    if (!boardMatrix) return;

    for (let r = 0; r < ChessBoard.BOARD_SIZE; r++) {
      for (let c = 0; c < ChessBoard.BOARD_SIZE; c++) {
        const piece = boardMatrix[r][c];
        if (piece === 1 || piece === 2) {
          this.drawPiece(c, r, piece);
        }
      }
    }

    if (lastMove && lastMove.x != null && lastMove.y != null) {
      this.drawLastMoveMark(lastMove.x, lastMove.y);
    }
  }
}

// 供瀏覽器全域或模組化使用
if (typeof window !== 'undefined') {
  window.ChessBoard = ChessBoard;
}
