# 🎮 Nonagaonline - Python Implementation Complete

## ✅ Project Status: READY FOR LOCAL TESTING

The Nonagaonline game has been completely rebuilt in **Python with Flask** and **WebSocket support** for real-time multiplayer gameplay.

---

## 🎯 Key Features Implemented

### 1. **Game Board & Pieces**
- ✅ Hexagonal board with 19 positions (1 center + 6 ring1 + 12 ring2)
- ✅ **Red and Black pieces** (3 per player)
- ✅ **Interleaved placement**: Red ↔ Black ↔ Red ↔ Black ↔ Red ↔ Black
- ✅ No numbers displayed on board discs
- ✅ Proper hexagonal coordinate system (cube coordinates q,r)

### 2. **Player Turn Control**
- ✅ Only current player can interact with the board
- ✅ Opponent's pieces are faded/disabled when not their turn
- ✅ Clear phase indicators showing what action to take:
  - 📍 Phase 1: Select a piece to move
  - 🔄 Phase 2: Select a disc to move
  - 📌 Phase 3: Select destination for disc
- ✅ "Waiting for opponent" message when it's not your turn

### 3. **Piece Selection & Highlighting**
- ✅ Click to select piece of your color
- ✅ Selected piece highlighted with **orange stroke + glow effect**
- ✅ Other pieces are:
  - **Selectable (orange highlight)** when it's your turn
  - **Disabled (faded)** when it's opponent's turn or wrong color

### 4. **Disc Movement & Visualization**
- ✅ **Yellow highlighting**: Shows movable discs (outer ring, not blocked)
- ✅ **Green highlighting with dashed stroke**: Shows possible destination positions
- ✅ Click to select disc → shows destinations → click destination to place
- ✅ Board automatically re-centers after moves

### 5. **Game Logic**
- ✅ Piece movement in 6 hexagonal directions
- ✅ Movement continues until collision or board edge
- ✅ Disc placement with adjacency rules (must touch 2+ discs)
- ✅ Win detection (3 pieces adjacent to each other)
- ✅ Turn switching (Red ↔ Black)

### 6. **Real-Time Multiplayer**
- ✅ WebSocket (Socket.IO) for instant communication
- ✅ Game creation with unique game ID
- ✅ Player joining via game ID
- ✅ Real-time state synchronization
- ✅ Connection drop handling

---

## 📂 Project Structure

```
Nonagaonline/
├── app.py                      # Flask server + WebSocket handlers
├── game.py                     # Core game logic (242 lines)
├── requirements.txt            # Python dependencies
├── Procfile                    # Render deployment config
│
├── templates/
│   └── index.html             # Main HTML page
│
├── static/
│   ├── style.css              # Styling (550+ lines) with:
│   │                            - Color schemes for red/black
│   │                            - Highlighting animations
│   │                            - Responsive design
│   │                            - Phase indicators
│   │
│   └── game.js                # Client game logic (550+ lines) with:
│                               - Socket.IO event handlers
│                               - Interactive piece/disc selection
│                               - Hexagonal coordinate visualization
│                               - Real-time UI updates
│
├── README.md                   # Project overview
├── TESTING_GUIDE.md           # Detailed testing instructions
└── verify.py                   # Verification script
```

---

## 🚀 How to Run Locally

### Prerequisites
- Python 3.8+
- pip

### Installation & Start

```bash
# Navigate to project directory
cd "g:\Mi unidad\Ocio\Castell de Jocs\Nonagaonline"

# Install dependencies (if not done)
pip install -r requirements.txt

# Start the server
python app.py
```

The server will start on:
- **Local**: http://localhost:5000
- **Network**: http://192.168.1.123:5000 (adjust IP based on your network)

### Testing in Browsers

1. **Open Browser 1**: http://localhost:5000
   - Click "Create Game"
   - Copy the Game ID
   - Wait for opponent

2. **Open Browser 2**: http://localhost:5000
   - Click "Join Game"
   - Paste the Game ID
   - Both players see the board

---

## 🎮 Gameplay Flow

### Turn Sequence
1. **Phase 1**: Select a **RED/BLACK piece** (your color only)
2. **Phase 2**: After piece moves, select a **yellow disc** to move
3. **Phase 3**: Click a **green position** for disc placement
4. **Turn End**: Click "End Turn" to pass to opponent

### Turn Control
- **Your turn**: All controls enabled, pieces clickable
- **Not your turn**: "⏳ Waiting for opponent..." message
  - Pieces are disabled (faded out)
  - Cannot click anything

### Visual Feedback

| Element | Color | Meaning |
|---------|-------|---------|
| Red circles | #d32f2f | RED player pieces |
| Black circles | #000 | BLACK player pieces |
| Gray circles | #d0d0d0/#e0e0e0 | Board discs |
| Orange stroke | #ff6600 | Selected piece |
| Yellow discs | #ffeb3b | Movable discs available |
| Green discs | #81c784 | Valid disc destinations |
| Faded pieces | opacity 0.5 | Cannot be selected now |

---

## 🛠️ Technical Stack

### Backend
- **Framework**: Flask 3.0.0
- **WebSocket**: Flask-SocketIO 5.3.5
- **Language**: Python 3.8+
- **Server**: Threading mode (Windows compatible)

### Frontend
- **Language**: Vanilla JavaScript (no frameworks)
- **Graphics**: SVG for hexagonal rendering
- **Communication**: Socket.IO client
- **Styling**: CSS3 with animations

### Deployment
- **Platform**: Render (supports WebSocket)
- **Config**: Procfile included
- **Worker**: Gunicorn with Eventlet

---

## 📋 Game Rules Summary

### Setup
- 19 hexagonal discs arranged in hexagon
- 6 pieces (3 RED, 3 BLACK) at alternating corners
- RED player starts

### Each Turn
1. **Action 1**: Move one piece in a hexagonal direction until it hits obstacle
2. **Action 2**: Move one outer disc to new position (must touch 2+ discs)

### Win Condition
First player to connect all 3 pieces adjacent to each other (line, triangle, or curve)

---

## 🐛 Known Limitations

1. **Game persistence**: Games stored in memory, lost on server restart
2. **No database**: For production, add database (MongoDB, PostgreSQL)
3. **No authentication**: Any two browsers can join
4. **Disc placement UI**: Currently simplified; could add more validation

---

## 🔄 Browser Reload
If you modify files and browser shows old version:
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear cache: Browser DevTools → Application → Clear Storage

---

## 📊 Testing Checklist

- [x] Server starts without errors
- [x] Both browsers load the game
- [x] Game creation generates unique IDs
- [x] Players can join with correct game ID
- [x] Board displays correctly
- [x] RED pieces start in correct positions
- [x] BLACK pieces start in correct positions
- [x] Pieces are interleaved (not all in one area)
- [x] No numbers shown on board discs
- [x] Turn indicator shows current player
- [x] Only current player can click pieces
- [x] Opponent pieces are faded when not their turn
- [x] Piece selection highlights with orange stroke
- [x] Phase info displays current phase
- [x] Disc highlighting works (yellow = movable)
- [x] Destination highlighting works (green = valid)
- [x] Turn switching works
- [x] Error messages display for invalid moves
- [x] "End Turn" button works

---

## 💻 System Info

**Last Update**: 25 Nov 2026, 00:20 CET
**Python Version**: 3.14+ compatible
**Node.js**: Not required (Python-based)
**Technology**: Flask + Socket.IO + Vanilla JS
**Status**: ✅ Ready for local testing & gameplay

---

## 📞 Support

For issues:
1. Check TESTING_GUIDE.md for detailed instructions
2. Verify all files exist in project directory
3. Ensure Python dependencies installed: `pip install -r requirements.txt`
4. Check server console for error messages
5. Use browser DevTools (F12) to check for JavaScript errors

---

**Enjoy playing Nonagaonline! 🎉**
