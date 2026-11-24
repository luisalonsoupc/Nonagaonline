# Nonagaonline - Developer Guide

## Architecture Overview

### Frontend (React)
- **Game.jsx:** Main game component handling UI and game flow
- **Game.css:** Styling for board and controls
- **WebSocket Communication:** Real-time updates via WebSocket

### Backend (Node.js/Express)
- **server/index.js:** Express server with WebSocket handler
- **server/game.js:** Core game logic and rules
- **Game Sessions:** In-memory storage of active games

## Game Logic Deep Dive

### Hexagonal Coordinate System

The game uses cube coordinates (q, r) for hexagonal positions:
```
      (-1,-1)  (0,-1)   (1,-2)
        \      /  \     /
  (-2,1)--(−1,0)--(0,0)--(1,−1)
        /      \  /     \
    (-1,1)   (0,1)   (1,0)
```

**6 Directions:**
- 0: Right (q+1, r+0)
- 1: Top-right (q+1, r-1)
- 2: Top-left (q+0, r-1)
- 3: Left (q-1, r+0)
- 4: Bottom-left (q-1, r+1)
- 5: Bottom-right (q+0, r+1)

### Game State Structure

```javascript
{
  board: {
    "q,r": { id, q, r, type: 'center'|'ring1'|'ring2' },
    // ... 19 total positions
  },
  pieces: [
    { id, player: 'white'|'black', q, r },
    // ... 6 total pieces (3 per player)
  ],
  currentPlayer: 'white'|'black',
  gameState: 'active'|'won'|'draw',
  winner: null|'white'|'black',
  moveHistory: [],
  lastMovedDisc: "q,r"|null
}
```

### Key Methods in Game Class

#### `movePiece(pieceId, direction)`
1. Validates piece ownership
2. Moves piece continuously in direction
3. Stops at obstacle or board edge
4. Returns `{success: true/false, error?}`

#### `moveDisc(fromQ, fromR, toQ, toR)`
1. Validates both positions exist
2. Checks source is outer disc
3. Verifies no piece blocking source
4. Ensures target touches ≥2 discs
5. Prevents immediate re-move by opponent
6. Returns `{success: true/false, error?}`

#### `checkWinCondition()`
1. Gets all pieces per player
2. Checks if all 3 are adjacent (distance=1)
3. If all 3 mutually adjacent, player wins
4. Sets `gameState` and `winner`

#### `areConnected(piece1, piece2)`
Uses max-metric (Chebyshev distance) on cube coordinates:
```javascript
distance = max(|q1-q2|, |r1-r2|, |s1-s2|) / 2
// Adjacent if distance == 1
```

## WebSocket Protocol

### Message Flow

**Game Creation:**
```
Client: { type: 'CREATE_GAME' }
  ↓
Server: { type: 'GAME_CREATED', gameId, playerColor, state }
```

**Game Joining:**
```
Client: { type: 'JOIN_GAME', gameId }
  ↓
Server: { type: 'GAME_JOINED', gameId, playerColor, state }
Server also sends to Player 1: { type: 'PLAYER_JOINED', state }
```

**Move Sequence:**
```
Client: { type: 'MOVE_PIECE', pieceId, direction }
  ↓
Server validates and updates state
  ↓
Both clients: { type: 'STATE_UPDATE', action, state }
```

**Turn End:**
```
Client: { type: 'END_TURN' }
  ↓
Server: Switches player, checks win condition
  ↓
Both clients: { type: 'STATE_UPDATE', state }
```

## Adding Features

### Add a New Piece Type

In `server/game.js`:
```javascript
initializePieces() {
  // Add new piece type to initial positions
  pieces.push({
    id: 7,
    player: 'red',
    q: 2, r: 2,
  });
}
```

In `client/src/Game.jsx`:
```javascript
// Add color in SVG rendering
fill={piece.player === 'red' ? '#ff0000' : ...}
```

### Change Win Condition

In `server/game.js`:
```javascript
checkWinCondition() {
  // Modify victory logic
  // e.g., require 4 pieces instead of 3
  if (playerPieces.length !== 4) continue;
}
```

### Add Game Validation UI

In `client/src/Game.jsx`:
```javascript
// Highlight valid moves
const getValidMoves = (piece) => {
  return [0,1,2,3,4,5].filter(dir => {
    // Test each direction without committing
  });
};
```

### Add Game Persistence

Modify `server/index.js`:
```javascript
const db = require('better-sqlite3')('games.db');

// Save game state
db.prepare('INSERT INTO games VALUES (?, ?)')
  .run(gameId, JSON.stringify(state));
```

### Add Player Accounts

Modify `server/index.js`:
```javascript
const auth = require('passport');

// Add authentication middleware
app.post('/login', auth.authenticate('local'));

// Associate game with player
gameSessions.set(gameId, {
  player1: { ws, userId, username },
  player2: { ws, userId, username },
});
```

## Testing

### Local Testing

1. Open two browser windows/tabs
2. Player 1: `http://localhost:3000`
3. Player 2: `http://localhost:3000` (same tab or different)
4. Create game → Join game → Play

### Testing Network Issues

```bash
# Simulate latency
npm install --save-dev latency-simulator

# In server/index.js
wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    // Simulate 100ms latency
    setTimeout(() => handleMessage(msg), 100);
  });
});
```

### Testing Multiple Games

Create script:
```javascript
// test/stress-test.js
const WebSocket = require('ws');

for (let i = 0; i < 10; i++) {
  const ws = new WebSocket('ws://localhost:3001');
  ws.send(JSON.stringify({ type: 'CREATE_GAME' }));
}
```

## Performance Optimization

### Current Limitations
- Game state in memory (lost on server restart)
- No horizontal scaling (single server instance)
- WebSocket connections not load-balanced

### For Production
1. **Add Database:**
   ```javascript
   const db = require('mongodb');
   // Store game states in MongoDB
   ```

2. **Use Redis for Sessions:**
   ```javascript
   const redis = require('redis');
   // Cache active games for fast retrieval
   ```

3. **Load Balancing:**
   ```bash
   # Use Render's load balancer
   # or nginx with sticky sessions
   ```

## Debugging

### Browser Console Debugging

```javascript
// In Game.jsx
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);  // Add logging
  handleWebSocketMessage(data);
};
```

### Server Debugging

```javascript
// In server/index.js
function handleMovePiece(ws, data) {
  console.log('Move requested:', {
    pieceId: data.pieceId,
    direction: data.direction,
    currentPlayer: session.game.currentPlayer,
  });
  
  const result = session.game.movePiece(pieceId, direction);
  console.log('Move result:', result);
}
```

### VS Code Debugging

1. Install `Debugger for Chrome`
2. Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server/index.js",
      "restart": true,
      "console": "integratedTerminal"
    }
  ]
}
```
3. Press F5 to debug

## Common Issues & Solutions

### "Game ID not found"
- Ensure Player 1 got the ID before Player 2 tries to join
- Game IDs expire after 1 hour without players

### "Move not valid but should be"
- Check piece ownership (must be your color)
- Verify no obstacle in path
- Confirm you're not trying to stop mid-way

### "WebSocket closes randomly"
- Check for unhandled errors in event handlers
- Verify server isn't crashing
- Look for memory leaks in game logic

### "Board state desynchronizes"
- Both players should refresh and rejoin
- Game ID allows reconnection to same game
- Server keeps game state for 1 hour

## Future Development

### High Priority
- [ ] Input validation (prevent cheating)
- [ ] Undo/redo functionality
- [ ] Game timer/timeout
- [ ] Database persistence

### Medium Priority
- [ ] Player ratings/ELO
- [ ] Game history and replay
- [ ] Spectator mode
- [ ] AI opponent

### Nice to Have
- [ ] Sound effects
- [ ] Animation system
- [ ] Mobile app (React Native)
- [ ] Tournament mode

## Code Style

- Use camelCase for variables/functions
- Use PascalCase for classes/components
- Keep functions under 50 lines
- Comment complex logic only
- Use meaningful variable names

## Git Workflow

```bash
# Feature branch
git checkout -b feature/my-feature
# ... make changes ...
git commit -m "Add my feature"
git push origin feature/my-feature
# Create Pull Request

# Bug fix
git checkout -b fix/bug-name
# ... fix bug ...
git commit -m "Fix bug in X"
git push origin fix/bug-name
```

## Resources

- Hexagonal Grids: https://www.redblobgames.com/grids/hexagons/
- WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- React Docs: https://react.dev
- Express Docs: https://expressjs.com
- Render Deployment: https://render.com/docs

---

Questions? Open an issue on GitHub!
