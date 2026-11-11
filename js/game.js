/**
 * 遊戲流程控制器與全域狀態管理模組
 * 負責組裝協調 ChessBoard, GameRules, GomokuAI 並與 DOM 事件綁定
 */
class GameManager {
  constructor() {
    // 核心模組實例
    this.board = new ChessBoard('chessBoard');
    this.canvas = document.getElementById('chessBoard');

    // DOM 控制項參照
    this.domGameMode = document.getElementById('gameMode');
    this.domDifficultyGroup = document.getElementById('difficultyGroup');
    this.domDifficulty = document.getElementById('difficulty');
    this.domBtnRestart = document.getElementById('btnRestart');
    this.domBtnUndo = document.getElementById('btnUndo');
    this.domCurrentTurn = document.getElementById('currentTurn');
    this.domMoveCount = document.getElementById('moveCount');
    this.domModalWinner = document.getElementById('modalWinner');
    this.domWinnerText = document.getElementById('winnerText');
    this.domBtnPlayAgain = document.getElementById('btnPlayAgain');

    // 遊戲狀態屬性
    this.boardMatrix = GameRules.createEmptyBoard();
    this.moveHistory = []; // 元素格式: { x, y, role }
    this.currentRole = GameRules.ROLE_BLACK;
    this.gameMode = this.domGameMode.value || 'pve';
    this.difficulty = this.domDifficulty.value || 'normal';
    this.isGameOver = false;
    this.isAiThinking = false;
    this.hoverPos = null;

    this.bindEvents();
    this.resetGame();
  }

  /**
   * 綁定使用者介面與 Canvas 互動事件
   */
  bindEvents() {
    // Canvas 點擊落子 (滑鼠)
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

    // Canvas 觸控落子 (支援行動裝置 / iOS Safari)
    this.canvas.addEventListener('touchend', (e) => this.handleCanvasTouch(e), { passive: false });

    // Canvas 游標移動即時預覽
    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this.handleCanvasMouseLeave());

    // 頂部控制列事件
    this.domGameMode.addEventListener('change', () => this.handleModeChange());
    this.domDifficulty.addEventListener('change', (e) => {
      this.difficulty = e.target.value;
    });
    this.domBtnRestart.addEventListener('click', () => this.resetGame());
    this.domBtnUndo.addEventListener('click', () => this.handleUndo());

    // 結算彈窗再玩一局按鈕
    this.domBtnPlayAgain.addEventListener('click', () => {
      this.closeModal();
      this.resetGame();
    });
  }

  /**
   * 重設局勢至開局狀態
   */
  resetGame() {
    this.boardMatrix = GameRules.createEmptyBoard();
    this.moveHistory = [];
    this.currentRole = GameRules.ROLE_BLACK;
    this.isGameOver = false;
    this.isAiThinking = false;
    this.hoverPos = null;

    this.closeModal();
    this.updateStatusView();
    this.renderBoard();
  }

  /**
   * 切換遊戲對戰模式
   */
  handleModeChange() {
    this.gameMode = this.domGameMode.value;
    if (this.gameMode === 'pvp') {
      this.domDifficultyGroup.style.display = 'none';
    } else {
      this.domDifficultyGroup.style.display = 'flex';
    }
    this.resetGame();
  }

  /**
   * 計算滑鼠或觸控在 Canvas 內部實際像素座標 (支援 RWD 自適應縮放換算)
   */
  getCanvasCoordinates(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      offsetX: (clientX - rect.left) * scaleX,
      offsetY: (clientY - rect.top) * scaleY
    };
  }

  /**
   * 處理 Canvas 點擊落子
   */
  handleCanvasClick(event) {
    if (this.isGameOver || this.isAiThinking) return;

    // 若為人機對局且輪到 AI 思考，禁止點擊
    if (this.gameMode === 'pve' && this.currentRole === GameRules.ROLE_WHITE) {
      return;
    }

    const { offsetX, offsetY } = this.getCanvasCoordinates(event.clientX, event.clientY);
    const pos = this.board.getGridPosition(offsetX, offsetY);
    if (!pos) return;

    if (GameRules.isValidMove(this.boardMatrix, pos.x, pos.y)) {
      this.makeMove(pos.x, pos.y, this.currentRole);
    }
  }

  /**
   * 處理 Canvas 觸控落子 (iOS Safari / 行動裝置)
   */
  handleCanvasTouch(event) {
    if (this.isGameOver || this.isAiThinking) return;
    if (this.gameMode === 'pve' && this.currentRole === GameRules.ROLE_WHITE) return;

    if (event.changedTouches && event.changedTouches.length > 0) {
      event.preventDefault(); // 阻止頁面手勢縮放與滾動干擾
      const touch = event.changedTouches[0];
      const { offsetX, offsetY } = this.getCanvasCoordinates(touch.clientX, touch.clientY);
      const pos = this.board.getGridPosition(offsetX, offsetY);
      if (!pos) return;

      if (GameRules.isValidMove(this.boardMatrix, pos.x, pos.y)) {
        this.makeMove(pos.x, pos.y, this.currentRole);
      }
    }
  }

  /**
   * 處理游標移動預覽
   */
  handleCanvasMouseMove(event) {
    if (this.isGameOver || this.isAiThinking) return;
    if (this.gameMode === 'pve' && this.currentRole === GameRules.ROLE_WHITE) return;

    const { offsetX, offsetY } = this.getCanvasCoordinates(event.clientX, event.clientY);
    const pos = this.board.getGridPosition(offsetX, offsetY);
    if (pos && GameRules.isValidMove(this.boardMatrix, pos.x, pos.y)) {
      this.hoverPos = pos;
      this.renderBoard();
      this.board.drawHoverPiece(pos.x, pos.y, this.currentRole);
    } else {
      if (this.hoverPos) {
        this.hoverPos = null;
        this.renderBoard();
      }
    }
  }

  /**
   * 處理游標離開棋盤
   */
  handleCanvasMouseLeave() {
    if (this.hoverPos) {
      this.hoverPos = null;
      this.renderBoard();
    }
  }

  /**
   * 執行實質落子
   */
  makeMove(x, y, role) {
    this.boardMatrix[y][x] = role;
    this.moveHistory.push({ x, y, role });
    this.hoverPos = null;

    // 檢查勝負
    const winResult = GameRules.checkWin(this.boardMatrix, x, y, role);
    if (winResult.win) {
      this.isGameOver = true;
      this.renderBoard();
      this.updateStatusView();
      this.showGameOverModal(winResult.winner);
      return;
    }

    // 檢查和局
    if (GameRules.checkDraw(this.boardMatrix)) {
      this.isGameOver = true;
      this.renderBoard();
      this.updateStatusView();
      this.showGameOverModal(null, true);
      return;
    }

    // 切換回合
    this.currentRole = (role === GameRules.ROLE_BLACK) ? GameRules.ROLE_WHITE : GameRules.ROLE_BLACK;
    this.renderBoard();
    this.updateStatusView();

    // 人機模式下自動觸發 AI 運算
    if (!this.isGameOver && this.gameMode === 'pve' && this.currentRole === GameRules.ROLE_WHITE) {
      this.triggerAiMove();
    }
  }

  /**
   * 觸發 AI 自動應手
   */
  triggerAiMove() {
    this.isAiThinking = true;
    this.updateStatusView();

    // 透過 setTimeout 讓出主線程以更新 UI
    setTimeout(() => {
      if (this.isGameOver) {
        this.isAiThinking = false;
        return;
      }

      const aiMove = GomokuAI.getNextMove(
        this.boardMatrix,
        GameRules.ROLE_WHITE,
        this.difficulty
      );

      this.isAiThinking = false;

      if (aiMove && GameRules.isValidMove(this.boardMatrix, aiMove.x, aiMove.y)) {
        this.makeMove(aiMove.x, aiMove.y, GameRules.ROLE_WHITE);
      }
    }, 200);
  }

  /**
   * 處理悔棋
   */
  handleUndo() {
    if (this.isAiThinking || this.moveHistory.length === 0) return;

    if (this.gameMode === 'pve') {
      // 人機對戰：通常需回退 2 步 (AI 一步 + 玩家一步)
      if (this.isGameOver) {
        // 若已結算，取消結束狀態並退 1 步或 2 步
        this.isGameOver = false;
        this.closeModal();
      }

      const stepsToUndo = this.moveHistory.length >= 2 ? 2 : 1;
      for (let i = 0; i < stepsToUndo; i++) {
        const last = this.moveHistory.pop();
        if (last) {
          this.boardMatrix[last.y][last.x] = GameRules.ROLE_EMPTY;
        }
      }
      this.currentRole = GameRules.ROLE_BLACK;
    } else {
      // 雙人對戰：回退 1 步
      if (this.isGameOver) {
        this.isGameOver = false;
        this.closeModal();
      }
      const last = this.moveHistory.pop();
      if (last) {
        this.boardMatrix[last.y][last.x] = GameRules.ROLE_EMPTY;
        this.currentRole = last.role; // 回退為該步玩家
      }
    }

    this.renderBoard();
    this.updateStatusView();
  }

  /**
   * 渲染棋盤與最後落子標記
   */
  renderBoard() {
    const lastMove = this.moveHistory.length > 0 ? this.moveHistory[this.moveHistory.length - 1] : null;
    this.board.render(this.boardMatrix, lastMove);
  }

  /**
   * 更新狀態列展示
   */
  updateStatusView() {
    this.domMoveCount.textContent = this.moveHistory.length;

    if (this.isGameOver) {
      this.domCurrentTurn.textContent = '對局結束';
      this.domCurrentTurn.className = 'status-value badge-turn turn-white';
      return;
    }

    if (this.isAiThinking) {
      this.domCurrentTurn.textContent = '電腦思考中...';
      this.domCurrentTurn.className = 'status-value badge-turn turn-thinking';
      return;
    }

    if (this.currentRole === GameRules.ROLE_BLACK) {
      this.domCurrentTurn.textContent = '黑棋落子';
      this.domCurrentTurn.className = 'status-value badge-turn turn-black';
    } else {
      if (this.gameMode === 'pve') {
        this.domCurrentTurn.textContent = '白棋 (電腦)';
      } else {
        this.domCurrentTurn.textContent = '白棋落子';
      }
      this.domCurrentTurn.className = 'status-value badge-turn turn-white';
    }
  }

  /**
   * 彈出結算視窗
   */
  showGameOverModal(winner, isDraw = false) {
    if (isDraw) {
      this.domWinnerText.textContent = '勢均力敵 · 和局！';
    } else if (winner === GameRules.ROLE_BLACK) {
      this.domWinnerText.textContent = (this.gameMode === 'pve') ? '恭喜您獲勝！(黑棋)' : '黑棋獲勝！';
    } else if (winner === GameRules.ROLE_WHITE) {
      this.domWinnerText.textContent = (this.gameMode === 'pve') ? '電腦獲勝！(白棋)' : '白棋獲勝！';
    }
    this.domModalWinner.classList.remove('hidden');
  }

  /**
   * 關閉結算彈窗
   */
  closeModal() {
    this.domModalWinner.classList.add('hidden');
  }
}

// 頁面載入完成後自動初始化五子棋對弈系統
window.addEventListener('DOMContentLoaded', () => {
  window.gameManager = new GameManager();
});
