import React, { useState, useEffect, useRef } from 'react';
import './Game.css';

const Game = () => {
  const [gameId, setGameId] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [selectedDisc, setSelectedDisc] = useState(null);
  const [phase, setPhase] = useState('menu'); // menu, playing, finished
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  const WS_URL = process.env.NODE_ENV === 'production' 
    ? `wss://${window.location.host}`
    : 'ws://localhost:3001';

  /**
   * Initialize WebSocket connection
   */
  useEffect(() => {
    wsRef.current = new WebSocket(WS_URL);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error. Please refresh the page.');
    };

    return () => {
      wsRef.current?.close();
    };
  }, []);

  /**
   * Handle WebSocket messages
   */
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'GAME_CREATED':
        setGameId(data.gameId);
        setPlayerColor(data.playerColor);
        setGameState(data.state);
        setPhase('waiting');
        break;

      case 'GAME_JOINED':
        setGameId(data.gameId);
        setPlayerColor(data.playerColor);
        setGameState(data.state);
        setPhase('playing');
        break;

      case 'PLAYER_JOINED':
        setGameState(data.state);
        setPhase('playing');
        break;

      case 'STATE_UPDATE':
        setGameState(data.state);
        setSelectedPiece(null);
        setSelectedDisc(null);
        
        if (data.state.gameState === 'won') {
          setPhase('finished');
        }
        break;

      case 'ERROR':
        setError(data.message);
        setTimeout(() => setError(null), 3000);
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  };

  /**
   * Create a new game
   */
  const createGame = () => {
    wsRef.current?.send(JSON.stringify({ type: 'CREATE_GAME' }));
  };

  /**
   * Join an existing game
   */
  const joinGame = (id) => {
    wsRef.current?.send(JSON.stringify({ type: 'JOIN_GAME', gameId: id }));
  };

  /**
   * Move a piece
   */
  const movePiece = (pieceId, direction) => {
    if (gameState.currentPlayer !== playerColor) {
      setError('Not your turn');
      return;
    }
    
    wsRef.current?.send(JSON.stringify({
      type: 'MOVE_PIECE',
      pieceId,
      direction,
    }));
  };

  /**
   * Move a disc
   */
  const moveDisc = (fromQ, fromR, toQ, toR) => {
    if (gameState.currentPlayer !== playerColor) {
      setError('Not your turn');
      return;
    }

    wsRef.current?.send(JSON.stringify({
      type: 'MOVE_DISC',
      fromQ,
      fromR,
      toQ,
      toR,
    }));
  };

  /**
   * End turn
   */
  const endTurn = () => {
    wsRef.current?.send(JSON.stringify({ type: 'END_TURN' }));
  };

  /**
   * Calculate SVG position for hexagonal coordinate
   */
  const hexToPixel = (q, r) => {
    const size = 40;
    const x = size * (3/2 * q);
    const y = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    return { x: x + 300, y: y + 300 };
  };

  if (phase === 'menu') {
    return (
      <div className="game-container">
        <div className="menu">
          <h1>Nonagaonline</h1>
          <p>Abstract strategy game for 2 players</p>
          
          <div className="menu-actions">
            <button onClick={createGame} className="btn btn-primary">
              Create Game
            </button>
            
            <div className="join-section">
              <input
                type="text"
                placeholder="Enter game ID"
                id="gameIdInput"
              />
              <button
                onClick={() => joinGame(document.getElementById('gameIdInput').value)}
                className="btn btn-secondary"
              >
                Join Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'waiting') {
    return (
      <div className="game-container">
        <div className="waiting">
          <h2>Game Created!</h2>
          <p>Share this ID with another player:</p>
          <div className="game-id">{gameId}</div>
          <p>Waiting for opponent...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return <div className="game-container"><p>Loading...</p></div>;
  }

  return (
    <div className="game-container">
      <div className="game-info">
        <h2>Nonagaonline</h2>
        <p>Your color: <span className={`color-${playerColor}`}>{playerColor.toUpperCase()}</span></p>
        <p>Current turn: <span className={`color-${gameState.currentPlayer}`}>{gameState.currentPlayer.toUpperCase()}</span></p>
        
        {gameState.gameState === 'won' && (
          <div className={`winner-message color-${gameState.winner}`}>
            {gameState.winner.toUpperCase()} WINS!
          </div>
        )}
      </div>

      <div className="game-board">
        <svg width="600" height="600" viewBox="0 0 600 600">
          {/* Render discs */}
          {Object.entries(gameState.board).map(([key, disc]) => {
            const pos = hexToPixel(disc.q, disc.r);
            const isOuter = disc.type === 'ring2';
            
            return (
              <g key={key}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="30"
                  fill={isOuter ? '#ddd' : '#ccc'}
                  stroke="#999"
                  strokeWidth="2"
                  className="disc"
                />
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dy="0.3em"
                  fontSize="10"
                  fill="#666"
                >
                  ({disc.q},{disc.r})
                </text>
              </g>
            );
          })}

          {/* Render pieces */}
          {gameState.pieces.map((piece) => {
            const pos = hexToPixel(piece.q, piece.r);
            const isSelected = selectedPiece?.id === piece.id;
            
            return (
              <circle
                key={`piece-${piece.id}`}
                cx={pos.x}
                cy={pos.y}
                r="20"
                fill={piece.player === 'white' ? '#fff' : '#000'}
                stroke={isSelected ? '#ff6600' : '#333'}
                strokeWidth={isSelected ? '3' : '2'}
                className="piece"
                onClick={() => {
                  if (piece.player === playerColor) {
                    setSelectedPiece(isSelected ? null : piece);
                  }
                }}
                style={{ cursor: piece.player === playerColor ? 'pointer' : 'default' }}
              />
            );
          })}
        </svg>
      </div>

      <div className="controls">
        {error && <div className="error-message">{error}</div>}
        
        {gameState.currentPlayer === playerColor ? (
          <>
            <p>Your turn - Select a piece to move</p>
            {selectedPiece && (
              <div className="direction-buttons">
                {[0, 1, 2, 3, 4, 5].map((dir) => {
                  const dirNames = ['→', '↗', '↖', '←', '↙', '↘'];
                  return (
                    <button
                      key={dir}
                      onClick={() => movePiece(selectedPiece.id, dir)}
                      className="btn btn-small"
                      title={`Direction ${dir}`}
                    >
                      {dirNames[dir]}
                    </button>
                  );
                })}
              </div>
            )}
            <button onClick={endTurn} className="btn btn-primary" disabled={!selectedPiece}>
              End Turn
            </button>
          </>
        ) : (
          <p>Waiting for opponent...</p>
        )}
      </div>
    </div>
  );
};

export default Game;
