/**
 * 五子棋智慧 AI 核心模組
 * 包含棋型啟發式評估、候選點鄰域剪枝、Minimax 與 Alpha-Beta 剪枝演算法
 */
class GomokuAI {
  static BOARD_SIZE = 15;

  // 棋型權重分數表
  static SCORE = {
    WIN: 1000000,       // 連五 (必勝)
    LIVE_FOUR: 100000,  // 活四 (必殺)
    RUSH_FOUR: 10000,   // 衝四 / 眠四
    LIVE_THREE: 8000,   // 活三
    SLEEP_THREE: 1000,  // 眠三
    LIVE_TWO: 800,      // 活二
    SLEEP_TWO: 100,     // 眠二
    ONE: 10             // 單子
  };

  /**
   * 取得 AI 下一步落子座標
   * @param {Array<Array<number>>} boardMatrix 15x15 棋盤二維陣列
   * @param {number} aiRole AI 執子角色 (ROLE_BLACK 或 ROLE_WHITE)
   * @param {string} difficulty 難度 ('easy' | 'normal' | 'hard')
   * @returns {{x: number, y: number}}
   */
  static getNextMove(boardMatrix, aiRole = 2, difficulty = 'normal') {
    const size = GomokuAI.BOARD_SIZE;
    const opponentRole = aiRole === 1 ? 2 : 1;

    // 1. 開局第一手：棋盤全空時，直接佔領天元 (7, 7)
    let isEmptyBoard = true;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (boardMatrix[r][c] !== 0) {
          isEmptyBoard = false;
          break;
        }
      }
      if (!isEmptyBoard) break;
    }
    if (isEmptyBoard) {
      return { x: 7, y: 7 };
    }

    // 2. 獲取候選點（鄰近現存棋子半徑 1~2 格之空位）
    const candidates = GomokuAI.getCandidateMoves(boardMatrix);
    if (candidates.length === 0) {
      return { x: 7, y: 7 };
    }

    // 若僅有一個合法點
    if (candidates.length === 1) {
      return candidates[0];
    }

    // 3. 根據難度進行策略決策
    if (difficulty === 'easy') {
      return GomokuAI.getEasyMove(boardMatrix, candidates, aiRole, opponentRole);
    } else if (difficulty === 'hard') {
      return GomokuAI.getHardMove(boardMatrix, candidates, aiRole, opponentRole);
    } else {
      // 預設 normal
      return GomokuAI.getNormalMove(boardMatrix, candidates, aiRole, opponentRole);
    }
  }

  /**
   * 生成候選落子點（以已落子點為中心擴展 1~2 格的空位）
   */
  static getCandidateMoves(boardMatrix) {
    const size = GomokuAI.BOARD_SIZE;
    const visited = Array.from({ length: size }, () => new Array(size).fill(false));
    const candidates = [];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (boardMatrix[r][c] !== 0) {
          // 遍歷周圍 1~2 範圍
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                if (boardMatrix[nr][nc] === 0 && !visited[nr][nc]) {
                  visited[nr][nc] = true;
                  candidates.push({ x: nc, y: nr });
                }
              }
            }
          }
        }
      }
    }

    return candidates;
  }

  /**
   * 評估單點落子之啟發式攻防分數
   */
  static evaluatePoint(boardMatrix, x, y, role, opponentRole) {
    // 自身進攻得分
    const attackScore = GomokuAI.evaluatePositionPattern(boardMatrix, x, y, role);
    // 阻擋對手防守得分
    const defenseScore = GomokuAI.evaluatePositionPattern(boardMatrix, x, y, opponentRole);

    // 防守權重係數提高到 1.15，優先破壞對方的連鎖
    return attackScore + defenseScore * 1.15;
  }

  /**
   * 計算特定角色在 (x, y) 落子後的型態價值
   */
  static evaluatePositionPattern(boardMatrix, x, y, role) {
    const size = GomokuAI.BOARD_SIZE;
    const directions = [
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 1, dy: 1 },
      { dx: 1, dy: -1 }
    ];

    let totalScore = 0;

    for (let i = 0; i < 4; i++) {
      const { dx, dy } = directions[i];
      let count = 1;      // 連續棋子數 (包含即將下的 (x, y))
      let openEnds = 0;   // 開放端數

      // 正向探測
      let step = 1;
      while (true) {
        const nx = x + dx * step;
        const ny = y + dy * step;
        if (nx < 0 || nx >= size || ny < 0 || ny >= size) break;
        if (boardMatrix[ny][nx] === role) {
          count++;
          step++;
        } else if (boardMatrix[ny][nx] === 0) {
          openEnds++;
          break;
        } else {
          break; // 被對手阻擋
        }
      }

      // 反向探測
      step = 1;
      while (true) {
        const nx = x - dx * step;
        const ny = y - dy * step;
        if (nx < 0 || nx >= size || ny < 0 || ny >= size) break;
        if (boardMatrix[ny][nx] === role) {
          count++;
          step++;
        } else if (boardMatrix[ny][nx] === 0) {
          openEnds++;
          break;
        } else {
          break;
        }
      }

      // 根據連子數與開放端判定分數
      totalScore += GomokuAI.getPatternScore(count, openEnds);
    }

    return totalScore;
  }

  /**
   * 根據連子與兩端開放狀態映射權重分數
   */
  static getPatternScore(count, openEnds) {
    if (count >= 5) return GomokuAI.SCORE.WIN;
    if (count === 4) {
      if (openEnds === 2) return GomokuAI.SCORE.LIVE_FOUR;
      if (openEnds === 1) return GomokuAI.SCORE.RUSH_FOUR;
      return 0;
    }
    if (count === 3) {
      if (openEnds === 2) return GomokuAI.SCORE.LIVE_THREE;
      if (openEnds === 1) return GomokuAI.SCORE.SLEEP_THREE;
      return 0;
    }
    if (count === 2) {
      if (openEnds === 2) return GomokuAI.SCORE.LIVE_TWO;
      if (openEnds === 1) return GomokuAI.SCORE.SLEEP_TWO;
      return 0;
    }
    if (count === 1 && openEnds > 0) {
      return GomokuAI.SCORE.ONE;
    }
    return 0;
  }

  /**
   * 簡單難度決策：從評分前段候選點中隨機挑選或加噪聲
   */
  static getEasyMove(boardMatrix, candidates, aiRole, opponentRole) {
    const scoredMoves = candidates.map(pt => ({
      x: pt.x,
      y: pt.y,
      score: GomokuAI.evaluatePoint(boardMatrix, pt.x, pt.y, aiRole, opponentRole)
    }));

    scoredMoves.sort((a, b) => b.score - a.score);

    // 若有直接五連或必殺，依舊執行
    if (scoredMoves[0].score >= GomokuAI.SCORE.LIVE_FOUR) {
      return scoredMoves[0];
    }

    // 否則取前 4 個候選點隨機擇一
    const topCount = Math.min(4, scoredMoves.length);
    const randomIndex = Math.floor(Math.random() * topCount);
    return scoredMoves[randomIndex];
  }

  /**
   * 普通難度決策：最佳啟發式攻防評分直接落子
   */
  static getNormalMove(boardMatrix, candidates, aiRole, opponentRole) {
    let bestMove = candidates[0];
    let maxScore = -Infinity;

    for (let i = 0; i < candidates.length; i++) {
      const pt = candidates[i];
      const score = GomokuAI.evaluatePoint(boardMatrix, pt.x, pt.y, aiRole, opponentRole);
      if (score > maxScore) {
        maxScore = score;
        bestMove = pt;
      }
    }

    return bestMove;
  }

  /**
   * 困難難度決策：Minimax + Alpha-Beta 剪枝 (搜尋深度 2 層並排序)
   */
  static getHardMove(boardMatrix, candidates, aiRole, opponentRole) {
    // 預先對候選點進行啟發式評分排序，縮小深度搜尋分支
    const scoredMoves = candidates.map(pt => ({
      x: pt.x,
      y: pt.y,
      score: GomokuAI.evaluatePoint(boardMatrix, pt.x, pt.y, aiRole, opponentRole)
    }));
    scoredMoves.sort((a, b) => b.score - a.score);

    // 若直接有五連必勝手，直接下
    if (scoredMoves[0].score >= GomokuAI.SCORE.WIN) {
      return scoredMoves[0];
    }

    // 截取前 12 個最具威脅點進行 Minimax 深度搜尋
    const prunedCandidates = scoredMoves.slice(0, 12);

    let bestMove = prunedCandidates[0];
    let alpha = -Infinity;
    const beta = Infinity;
    const searchDepth = 2; // 2 層前瞻預判對手最佳應對

    for (let i = 0; i < prunedCandidates.length; i++) {
      const move = prunedCandidates[i];

      // 虛擬落子 (AI)
      boardMatrix[move.y][move.x] = aiRole;

      const evalScore = GomokuAI.minimax(
        boardMatrix,
        searchDepth - 1,
        alpha,
        beta,
        false,
        aiRole,
        opponentRole
      );

      // 回溯還原
      boardMatrix[move.y][move.x] = 0;

      if (evalScore > alpha) {
        alpha = evalScore;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * Minimax 核心搭配 Alpha-Beta 剪枝
   */
  static minimax(board, depth, alpha, beta, isMaximizing, aiRole, opponentRole) {
    if (depth === 0) {
      return GomokuAI.evaluateBoardState(board, aiRole, opponentRole);
    }

    const currentRole = isMaximizing ? aiRole : opponentRole;
    const candidates = GomokuAI.getCandidateMoves(board);

    // 啟發式排序取前 8 個關鍵點
    const scored = candidates.map(pt => ({
      x: pt.x,
      y: pt.y,
      score: GomokuAI.evaluatePoint(board, pt.x, pt.y, currentRole, isMaximizing ? opponentRole : aiRole)
    }));
    scored.sort((a, b) => b.score - a.score);
    const topMoves = scored.slice(0, 8);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of topMoves) {
        board[move.y][move.x] = aiRole;
        const evaluation = GomokuAI.minimax(board, depth - 1, alpha, beta, false, aiRole, opponentRole);
        board[move.y][move.x] = 0;

        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // 剪枝
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of topMoves) {
        board[move.y][move.x] = opponentRole;
        const evaluation = GomokuAI.minimax(board, depth - 1, alpha, beta, true, aiRole, opponentRole);
        board[move.y][move.x] = 0;

        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // 剪枝
      }
      return minEval;
    }
  }

  /**
   * 整盤棋局評估
   */
  static evaluateBoardState(board, aiRole, opponentRole) {
    const size = GomokuAI.BOARD_SIZE;
    let aiScore = 0;
    let oppScore = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === aiRole) {
          aiScore += GomokuAI.evaluatePositionPattern(board, c, r, aiRole);
        } else if (board[r][c] === opponentRole) {
          oppScore += GomokuAI.evaluatePositionPattern(board, c, r, opponentRole);
        }
      }
    }

    return aiScore - oppScore * 1.1;
  }
}

// 供全域或腳本直接存取
if (typeof window !== 'undefined') {
  window.GomokuAI = GomokuAI;
}
