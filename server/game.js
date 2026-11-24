/**
 * Game logic for Nonagaonline
 * Abstract strategy game for 2 players with hexagonal board
 */

const HEX_DIRECTIONS = [
  { q: 1, r: 0 },  // Right
  { q: 1, r: -1 }, // Top-right
  { q: 0, r: -1 }, // Top-left
  { q: -1, r: 0 }, // Left
  { q: -1, r: 1 }, // Bottom-left
  { q: 0, r: 1 },  // Bottom-right
];

class Game {
  constructor() {
    this.board = this.initializeBoard();
    this.pieces = this.initializePieces();
    this.currentPlayer = 'white';
    this.gameState = 'active'; // active, won, draw
    this.winner = null;
    this.moveHistory = [];
    this.lastMovedDisc = null; // Track last moved disc to prevent immediate re-move
  }

  /**
   * Initialize hexagonal board with 19 positions
   * Cube coordinates (q, r) for hexagonal grid
   */
  initializeBoard() {
    const discs = {};
    let id = 0;

    // Center disc
    discs[`0,0`] = { id: id++, q: 0, r: 0, type: 'center' };

    // 6 ring 1 positions
    for (const dir of HEX_DIRECTIONS) {
      discs[`${dir.q},${dir.r}`] = { id: id++, q: dir.q, r: dir.r, type: 'ring1' };
    }

    // 12 ring 2 positions (outer edge)
    const ring2Positions = [
      { q: 2, r: 0 }, { q: 2, r: -1 }, { q: 2, r: -2 },
      { q: 1, r: -2 }, { q: 0, r: -2 }, { q: -1, r: -1 },
      { q: -2, r: 0 }, { q: -2, r: 1 }, { q: -2, r: 2 },
      { q: -1, r: 2 }, { q: 0, r: 2 }, { q: 1, r: 1 },
    ];

    for (const pos of ring2Positions) {
      discs[`${pos.q},${pos.r}`] = { id: id++, q: pos.q, r: pos.r, type: 'ring2' };
    }

    return discs;
  }

  /**
   * Initialize player pieces at alternating corners
   */
  initializePieces() {
    const corners = [
      { q: 2, r: -2, player: 'white' },   // Top-right
      { q: -2, r: 2, player: 'black' },   // Bottom-left
      { q: 2, r: 0, player: 'white' },    // Right
      { q: -2, r: 0, player: 'black' },   // Left
      { q: 0, r: 2, player: 'white' },    // Bottom
      { q: 0, r: -2, player: 'black' },   // Top
    ];

    const pieces = [];
    corners.forEach((corner, idx) => {
      pieces.push({
        id: idx,
        player: corner.player,
        q: corner.q,
        r: corner.r,
      });
    });

    return pieces;
  }

  /**
   * Move a piece in a direction until it hits obstacle
   */
  movePiece(pieceId, direction) {
    const piece = this.pieces.find(p => p.id === pieceId);
    if (!piece) return { success: false, error: 'Piece not found' };
    if (piece.player !== this.currentPlayer) return { success: false, error: 'Not your piece' };

    const dir = HEX_DIRECTIONS[direction];
    if (!dir) return { success: false, error: 'Invalid direction' };

    let newQ = piece.q + dir.q;
    let newR = piece.r + dir.r;
    let canMove = true;

    // Move until obstacle
    while (canMove) {
      // Check bounds (exists in board)
      if (!this.board[`${newQ},${newR}`]) {
        canMove = false;
        newQ -= dir.q;
        newR -= dir.r;
        break;
      }

      // Check collision with other pieces
      const collision = this.pieces.some(p => p.q === newQ && p.r === newR);
      if (collision) {
        canMove = false;
        newQ -= dir.q;
        newR -= dir.r;
        break;
      }

      newQ += dir.q;
      newR += dir.r;
    }

    // Piece must move at least one step
    if (newQ === piece.q && newR === piece.r) {
      return { success: false, error: 'No valid moves in this direction' };
    }

    piece.q = newQ;
    piece.r = newR;

    return { success: true };
  }

  /**
   * Move a disc on the board
   */
  moveDisc(fromQ, fromR, toQ, toR) {
    const fromKey = `${fromQ},${fromR}`;
    const toKey = `${toQ},${toR}`;

    // Validation
    if (!this.board[fromKey]) return { success: false, error: 'Source disc not found' };
    if (!this.board[toKey]) return { success: false, error: 'Target position not found' };
    if (this.board[fromKey].type !== 'ring2') {
      return { success: false, error: 'Can only move outer discs' };
    }
    if (this.board[toKey].type !== 'ring2') {
      return { success: false, error: 'Can only place on outer positions' };
    }

    // Check if source disc is blocked by pieces
    const isBlocked = this.pieces.some(p => p.q === fromQ && p.r === fromR);
    if (isBlocked) return { success: false, error: 'Disc is blocked by a piece' };

    // Check if this is the disc opponent just moved (prevents immediate reversal)
    if (this.lastMovedDisc === fromKey) {
      return { success: false, error: 'Cannot move the disc opponent just placed' };
    }

    // Check target touches at least 2 discs
    const neighbors = this.getAdjacentPositions(toQ, toR);
    const touchingDiscs = neighbors.filter(pos => this.board[`${pos.q},${pos.r}`]);
    if (touchingDiscs.length < 2) {
      return { success: false, error: 'Target must touch at least 2 discs' };
    }

    // Move the disc in memory (swap the disc data)
    const tempDisc = this.board[fromKey];
    delete this.board[fromKey];
    this.board[toKey] = tempDisc;
    this.board[toKey].q = toQ;
    this.board[toKey].r = toR;

    this.lastMovedDisc = toKey;

    return { success: true };
  }

  /**
   * Get adjacent hexagonal positions
   */
  getAdjacentPositions(q, r) {
    return HEX_DIRECTIONS.map(dir => ({ q: q + dir.q, r: r + dir.r }));
  }

  /**
   * Check if three pieces are adjacent (connected)
   */
  checkWinCondition() {
    for (const player of ['white', 'black']) {
      const playerPieces = this.pieces.filter(p => p.player === player);
      
      if (playerPieces.length !== 3) continue;

      // Check if all 3 pieces are connected to each other
      const p1 = playerPieces[0];
      const p2 = playerPieces[1];
      const p3 = playerPieces[2];

      const isConnected = this.areConnected(p1, p2) && 
                         this.areConnected(p2, p3) && 
                         this.areConnected(p1, p3);

      if (isConnected) {
        this.gameState = 'won';
        this.winner = player;
        return true;
      }
    }
    return false;
  }

  /**
   * Check if two pieces are adjacent
   */
  areConnected(piece1, piece2) {
    const distance = Math.max(
      Math.abs(piece1.q - piece2.q),
      Math.abs(piece1.r - piece2.r),
      Math.abs((piece1.q + piece1.r) - (piece2.q + piece2.r))
    ) / 2;
    return distance === 1;
  }

  /**
   * End turn and switch player
   */
  endTurn() {
    this.checkWinCondition();
    this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
  }

  /**
   * Get complete game state
   */
  getState() {
    return {
      board: this.board,
      pieces: this.pieces,
      currentPlayer: this.currentPlayer,
      gameState: this.gameState,
      winner: this.winner,
      moveHistory: this.moveHistory,
    };
  }

  /**
   * Serialize for transmission
   */
  serialize() {
    return JSON.stringify(this.getState());
  }
}

module.exports = Game;
