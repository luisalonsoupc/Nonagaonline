# Nonagaonline - Quick Start Guide

## 🎮 What is Nonagaonline?

An abstract strategy game for 2 players with a hexagonal board. Players compete to connect their 3 pieces by moving pieces and rearranging board discs. It's fully playable online via WebSocket.

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..
```

### 2. Run the Game

**Terminal 1 - Backend:**
```bash
npm run dev
```
Server starts at `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd client && npm start
```
App opens at `http://localhost:3000`

### 3. Play the Game

1. **Player 1:** Click "Create Game" → Get game ID
2. **Player 2:** Enter game ID → Click "Join Game"
3. **Game Start:** Both players see the board
4. **Gameplay:**
   - White starts first
   - Each turn: Move a piece, then move a disc
   - First to connect 3 pieces wins!

## 🌐 Deploy to Render (Production)

### Step 1: Prepare Repository
Make sure everything is pushed to GitHub:
```bash
git add .
git commit -m "Ready for production"
git push origin main
```

### Step 2: Create Render Service
1. Go to [render.com](https://render.com)
2. Sign in with GitHub
3. Click "New" → "Web Service"
4. Connect your `Onagaonline` repository
5. Configure:
   - **Name:** `nonagaonline`
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free tier is fine
6. Click "Create Web Service"

### Step 3: Wait for Deployment
Render will automatically:
- Build your app
- Run the backend and serve React
- Assign you a URL like `https://nonagaonline.onrender.com`

## 📁 Project Structure

```
Nonagaonline/
├── server/
│   ├── index.js       ← Express + WebSocket server
│   └── game.js        ← Game logic (hexagonal board, pieces, rules)
├── client/
│   └── src/
│       ├── Game.jsx   ← Main game interface
│       └── Game.css   ← Styling
├── package.json       ← Dependencies
└── README.md         ← Full documentation
```

## 🎯 Game Mechanics

### Board
- 19 hexagonal positions (1 center, 6 inner ring, 12 outer ring)
- Using cube coordinates (q, r)

### Pieces
- 3 white pieces (top right, right, bottom)
- 3 black pieces (top left, left, bottom-left)

### Turn Actions (Both Required)
1. **Move Piece:** Slide one of your pieces in a hex direction (0-5) until it hits obstacle
2. **Move Disc:** Relocate an outer disc to another outer position

### Win Condition
3 pieces of same color adjacent to each other = Victory!

## 🔧 Backend API (WebSocket)

**Send these JSON messages:**
```javascript
{ type: 'CREATE_GAME' }
{ type: 'JOIN_GAME', gameId: 'abc123' }
{ type: 'MOVE_PIECE', pieceId: 0, direction: 1 }
{ type: 'MOVE_DISC', fromQ: 2, fromR: -2, toQ: 2, toR: 0 }
{ type: 'END_TURN' }
```

**Receive these JSON messages:**
```javascript
{ type: 'GAME_CREATED', gameId: 'abc123', playerColor: 'white', state: {...} }
{ type: 'STATE_UPDATE', state: {...} }
{ type: 'ERROR', message: 'Invalid move' }
```

## 🐛 Troubleshooting

### "Cannot connect to server"
- Check backend is running: `npm run dev`
- Check port 3001 is available
- Look at browser console for errors

### "Pieces not showing"
- Clear browser cache
- Refresh page (Ctrl+F5)
- Check browser console for JavaScript errors

### "WebSocket connection fails in production"
- Render automatically handles WebSocket
- Check Render logs for errors
- Ensure no firewall blocking WebSockets

## 📝 Development Tips

- Backend automatically restarts on file changes (using nodemon)
- Frontend hot-reloads with React
- Game state persists for 1 hour (players can reconnect)
- Detailed error messages in browser console

## 🎨 Customization

### Change Colors
Edit `client/src/Game.css`:
```css
.btn-primary { background: #667eea; }  /* Button color */
.color-white { background: #333; }     /* White piece */
.color-black { background: #ddd; }     /* Black piece */
```

### Change Board Layout
Edit `server/game.js` in `initializeBoard()` function

### Change Game Rules
Edit validation logic in `server/game.js`:
- `movePiece()` for movement rules
- `moveDisc()` for disc placement rules
- `checkWinCondition()` for victory conditions

## 📚 Full Documentation

See [README.md](./README.md) for:
- Detailed game rules
- API message reference
- Game state structure
- Architecture overview
- Future enhancement ideas

## ⚡ Performance Notes

- WebSocket keeps connections alive
- Game state stored in memory (RAM)
- Each game instance uses ~1KB RAM
- Render's free tier supports ~100+ concurrent games

## 🔐 Security Notes

- No authentication yet (games are anonymous)
- Game IDs are random (hard to guess)
- WebSocket messages not encrypted (add SSL for production)
- No data persistence (games lost on restart)

## 📱 Mobile Support

The game works on mobile browsers!
- Touch-friendly buttons
- Responsive layout
- WebSocket works over 4G/5G

## 🤝 Contributing

Found a bug? Want to add features?
1. Create a branch: `git checkout -b feature/my-feature`
2. Make changes and test locally
3. Push and create a Pull Request

## 📞 Support

For issues:
1. Check browser console for errors
2. Check Render logs (if deployed)
3. Open an issue on [GitHub](https://github.com/luisalonsoupc/Onagaonline/issues)

---

**Happy playing! 🎮**
