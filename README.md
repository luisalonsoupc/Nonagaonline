# Nonagaonline

An abstract strategy game for 2 players with a hexagonal board, playable online as a web service.

## Game Rules

**Objective:** Get your 3 pieces connected to each other (line, curve, or triangle).

### Setup
- **Board:** 19 discs arranged in a hexagon (1 center, 6 in first ring, 12 on outer edge)
- **Pieces:** 3 per player, alternately placed at hexagon corners

### Turn Actions (Both Mandatory, In Order)
1. **Move a Piece:** Select one of your pieces and move it in one of 6 hexagonal directions until it hits another piece or the board edge. Cannot stop mid-way or jump over pieces.
2. **Move a Disc:** Select a free outer edge disc and place it elsewhere on the outer edge, touching at least 2 discs. Cannot move the disc opponent just placed or create isolated board sections.

### Win Condition
First player whose 3 pieces are adjacent to each other (in any connected form) wins.

## Project Structure

```
nonagaonline/
├── server/                    # Node.js backend
│   ├── index.js              # Express server with WebSocket
│   └── game.js               # Core game logic
├── client/                   # React frontend
│   ├── public/               # Static files
│   │   └── index.html        # HTML entry point
│   └── src/
│       ├── Game.jsx          # Main game component
│       ├── Game.css          # Game styles
│       ├── App.jsx           # App wrapper
│       ├── index.jsx         # React entry point
│       └── index.css         # Global styles
├── package.json              # Root dependencies
└── README.md                 # This file
```

## Tech Stack

- **Frontend:** React 18, WebSocket API
- **Backend:** Node.js, Express, ws (WebSocket library)
- **Communication:** WebSocket for real-time multiplayer
- **Deployment:** Render.com

## Local Development

### Prerequisites
- Node.js 16+ and npm
- Git

### Setup

1. **Clone and install dependencies:**
```bash
git clone https://github.com/luisalonsoupc/Onagaonline.git
cd Onagaonline
npm install
cd client && npm install && cd ..
```

2. **Start backend (from root directory):**
```bash
npm run dev
```
Server will run on `http://localhost:3001`

3. **Start frontend (in another terminal):**
```bash
cd client
npm start
```
App will open at `http://localhost:3000`

### Development Features
- WebSocket real-time gameplay
- Hexagonal board visualization with SVG
- Game state management
- Error handling and notifications

## Building for Production

```bash
# Build React app
npm run build

# Backend will serve the built React app
npm start
```

## Deployment to Render

### 1. Push to GitHub
```bash
git add .
git commit -m "Initial commit: Nonagaonline game"
git push origin main
```

### 2. Create Render Web Service

1. Go to [Render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** `nonagaonline`
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free (or Paid for persistent storage)

### 3. Environment Variables (if needed)
- Currently no environment variables required
- Add `PORT` handling in `server/index.js` if needed (already configured)

### 4. Deploy
Render will automatically deploy when you push to `main` branch.

Your game will be live at: `https://nonagaonline.onrender.com`

## Game Flow

### Creating a Game
1. Player 1 clicks "Create Game"
2. Receives a unique game ID (e.g., "abc123d")
3. Shares the ID with Player 2

### Joining a Game
1. Player 2 enters the game ID
2. Clicks "Join Game"
3. Both players see the board and can start playing

### Playing
1. Player gets 2 actions per turn:
   - Move one of their pieces
   - Move a disc on the board
2. After completing both actions, click "End Turn"
3. Opponent's turn begins
4. Game ends when any player connects 3 pieces

## API WebSocket Messages

### Client → Server

```javascript
// Create a new game
{ type: 'CREATE_GAME' }

// Join an existing game
{ type: 'JOIN_GAME', gameId: 'abc123' }

// Move a piece (direction 0-5)
{ type: 'MOVE_PIECE', pieceId: 0, direction: 1 }

// Move a disc
{ type: 'MOVE_DISC', fromQ: 2, fromR: -2, toQ: 2, toR: 0 }

// End turn
{ type: 'END_TURN' }

// Get current game state
{ type: 'GET_STATE' }
```

### Server → Client

```javascript
// Game created
{ type: 'GAME_CREATED', gameId: 'abc123', playerColor: 'white', state: {...} }

// Game joined
{ type: 'GAME_JOINED', gameId: 'abc123', playerColor: 'black', state: {...} }

// Player joined (opponent)
{ type: 'PLAYER_JOINED', state: {...} }

// Game state updated
{ type: 'STATE_UPDATE', action: {...}, state: {...} }

// Error occurred
{ type: 'ERROR', message: 'Invalid move' }
```

## Game State Structure

```javascript
{
  board: {
    "0,0": { id: 0, q: 0, r: 0, type: 'center' },
    "1,0": { id: 1, q: 1, r: 0, type: 'ring1' },
    // ... more discs
  },
  pieces: [
    { id: 0, player: 'white', q: 2, r: -2 },
    { id: 1, player: 'black', q: -2, r: 2 },
    // ... more pieces
  ],
  currentPlayer: 'white',
  gameState: 'active', // or 'won'
  winner: null, // or 'white' or 'black'
  moveHistory: []
}
```

## Browser Compatibility

- Chrome/Edge 70+
- Firefox 60+
- Safari 12+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- [ ] Piece move validation UI (highlight valid moves)
- [ ] Game history and replay
- [ ] Player statistics and leaderboard
- [ ] Animated piece movements
- [ ] Sound effects and notifications
- [ ] Mobile-optimized interface
- [ ] AI opponent option
- [ ] Game chat/messaging
- [ ] Persistent game storage (database)
- [ ] Player accounts and authentication

## Troubleshooting

### WebSocket Connection Failed
- Check that backend is running on port 3001
- Check browser console for errors
- Verify firewall allows WebSocket connections

### Pieces Not Displaying
- Refresh the page
- Check browser console for JavaScript errors
- Verify React build completed successfully

### Game State Out of Sync
- Both players should refresh and rejoin
- Game ID is preserved for reconnection

## License

MIT

## Author

Luis Alonso

---

For questions or issues, please open an issue on [GitHub](https://github.com/luisalonsoupc/Onagaonline/issues).