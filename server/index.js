const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const Game = require('./game');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Game sessions storage
const gameSessions = new Map();

/**
 * Generate unique game ID
 */
function generateGameId() {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Handle WebSocket connections
 */
wss.on('connection', (ws) => {
  let gameId = null;
  let playerColor = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'CREATE_GAME':
          handleCreateGame(ws, data);
          break;

        case 'JOIN_GAME':
          handleJoinGame(ws, data);
          break;

        case 'MOVE_PIECE':
          handleMovePiece(ws, data);
          break;

        case 'MOVE_DISC':
          handleMoveDisc(ws, data);
          break;

        case 'END_TURN':
          handleEndTurn(ws, data);
          break;

        case 'GET_STATE':
          handleGetState(ws, data);
          break;

        default:
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Unknown command' }));
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({ type: 'ERROR', message: error.message }));
    }
  });

  ws.on('close', () => {
    // Clean up closed connections
    if (gameId && gameSessions.has(gameId)) {
      const session = gameSessions.get(gameId);
      if (session.player1 === ws) session.player1 = null;
      if (session.player2 === ws) session.player2 = null;

      // Keep game for reconnection (timeout after 1 hour)
      setTimeout(() => {
        if (!session.player1 && !session.player2) {
          gameSessions.delete(gameId);
        }
      }, 3600000);
    }
  });

  /**
   * Create a new game
   */
  function handleCreateGame(ws, data) {
    gameId = generateGameId();
    const game = new Game();
    
    gameSessions.set(gameId, {
      game,
      player1: ws,
      player2: null,
      player1Color: 'white',
      player2Color: 'black',
    });

    playerColor = 'white';
    ws.send(JSON.stringify({
      type: 'GAME_CREATED',
      gameId,
      playerColor,
      state: game.getState(),
    }));

    console.log(`Game created: ${gameId}`);
  }

  /**
   * Join an existing game
   */
  function handleJoinGame(ws, data) {
    gameId = data.gameId;
    
    if (!gameSessions.has(gameId)) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game not found',
      }));
      return;
    }

    const session = gameSessions.get(gameId);
    if (session.player2 !== null) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Game is full',
      }));
      return;
    }

    session.player2 = ws;
    playerColor = 'black';

    // Notify both players
    const state = session.game.getState();
    
    session.player1?.send(JSON.stringify({
      type: 'PLAYER_JOINED',
      state,
    }));

    ws.send(JSON.stringify({
      type: 'GAME_JOINED',
      gameId,
      playerColor,
      state,
    }));

    console.log(`Player joined game: ${gameId}`);
  }

  /**
   * Move a piece
   */
  function handleMovePiece(ws, data) {
    if (!gameId || !gameSessions.has(gameId)) return;

    const session = gameSessions.get(gameId);
    const { pieceId, direction } = data;

    const result = session.game.movePiece(pieceId, direction);

    if (!result.success) {
      ws.send(JSON.stringify({ type: 'ERROR', message: result.error }));
      return;
    }

    broadcastGameState(session, { type: 'PIECE_MOVED', pieceId, direction });
  }

  /**
   * Move a disc
   */
  function handleMoveDisc(ws, data) {
    if (!gameId || !gameSessions.has(gameId)) return;

    const session = gameSessions.get(gameId);
    const { fromQ, fromR, toQ, toR } = data;

    const result = session.game.moveDisc(fromQ, fromR, toQ, toR);

    if (!result.success) {
      ws.send(JSON.stringify({ type: 'ERROR', message: result.error }));
      return;
    }

    broadcastGameState(session, { type: 'DISC_MOVED', from: { q: fromQ, r: fromR }, to: { q: toQ, r: toR } });
  }

  /**
   * End turn
   */
  function handleEndTurn(ws, data) {
    if (!gameId || !gameSessions.has(gameId)) return;

    const session = gameSessions.get(gameId);
    
    if (session.game.currentPlayer !== playerColor) {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Not your turn' }));
      return;
    }

    session.game.endTurn();
    broadcastGameState(session, { type: 'TURN_ENDED', nextPlayer: session.game.currentPlayer });
  }

  /**
   * Get current game state
   */
  function handleGetState(ws, data) {
    if (!gameId || !gameSessions.has(gameId)) return;

    const session = gameSessions.get(gameId);
    ws.send(JSON.stringify({
      type: 'STATE',
      state: session.game.getState(),
    }));
  }

  /**
   * Broadcast game state to both players
   */
  function broadcastGameState(session, action) {
    const state = session.game.getState();
    const message = JSON.stringify({
      type: 'STATE_UPDATE',
      action,
      state,
    });

    session.player1?.send(message);
    session.player2?.send(message);
  }
});

// REST API endpoints
app.get('/api/game/:gameId', (req, res) => {
  const { gameId } = req.params;
  
  if (!gameSessions.has(gameId)) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const session = gameSessions.get(gameId);
  res.json(session.game.getState());
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, wss };
