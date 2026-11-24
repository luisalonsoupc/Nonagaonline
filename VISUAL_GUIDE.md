# 🎮 Nonagaonline - Visual Game Guide

## Board Layout (Hexagonal)

```
         (0,-2)
        /      \
   (-1,-1)   (1,-2)
      / \      / \
  (−1,0)(0,-1)(1,-1)
      \ /  |  \ /
   (-2,1)-(0,0)-(1,0)
      / \  |  / \
   (-1,1)(0,1)(1,1)
      \ /  |  \ /
   (-2,2)-(-1,2)
     ...  (0,2)

19 Total Positions:
• 1 Center (0,0) - Type: center
• 6 Inner Ring - Type: ring1
  • 12 Outer Edge - Type: ring2
```

## Initial Setup

```
WHITE pieces:         BLACK pieces:
  TL (0,-2)             TR (2,-2)
  L (-2,0)              R (2,0)
  B (0,2)               BL (-2,2)

Alternating pattern starting from hexagon corners.
```

## Game States

### Menu Screen
```
┌─────────────────────────────────┐
│      NONAGAONLINE              │
│  Abstract Strategy Game         │
│                                 │
│  [Create Game]                  │
│                                 │
│  Enter ID: [__________]         │
│  [Join Game]                    │
└─────────────────────────────────┘
```

### Waiting for Opponent
```
┌─────────────────────────────────┐
│      Game Created!              │
│                                 │
│   Share this ID:                │
│   ┌─────────────────┐          │
│   │   abc123d       │          │
│   └─────────────────┘          │
│                                 │
│   Waiting for opponent...       │
└─────────────────────────────────┘
```

### Playing
```
┌────────────────────────────────────────────┐
│  You: WHITE    Turn: WHITE                 │
│                                            │
│          Hexagonal Board                   │
│        (600x600 SVG)                       │
│        [Visual representation              │
│         of 19 positions with               │
│         pieces as circles]                 │
│                                            │
│  Your turn - Select piece to move          │
│  [↗][→][↘][↙][←][↖]  [End Turn]           │
└────────────────────────────────────────────┘
```

## Movement Rules - Visual Examples

### Piece Movement (Direction 1 = Top-Right)

```
Before:                    After (hit wall):
  
  .....              .....
  ..W..              ..W..
  .....   →          .....
  .....              .....
  .....              .....

Move UNTIL hitting:
✓ Another piece
✓ Board edge
✗ Mid-way stop (NOT allowed)
✗ Jump over pieces (NOT allowed)
```

### Disc Movement

```
Before:                    After:

  outer                outer
  o o o                o D o
  o . o   →            o . o
  o o o                o o o

Must:
✓ Touch at least 2 other discs
✓ Be on outer ring positions
✓ Not be blocked by pieces

Cannot:
✗ Move opponent's just-placed disc
✗ Create isolated board parts
✗ Place on inner positions
```

## Win Condition - Visual Examples

```
✓ LINE:              ✓ TRIANGLE:         ✓ CURVE:
  W                    W W W              W
  W                      W          or     W
  W                                        W

All 3 pieces adjacent to each other
(Distance = 1 in hex coordinates)
```

## Turn Flow Diagram

```
START GAME
    ↓
WHITE PLAYER TURN
    ↓
[Action 1] Move a white piece
    ↓
[Action 2] Move an outer disc
    ↓
Check Win? → NO → Switch Player
    ↓ YES
WHITE WINS! 🎉
    ↓
Show Winner Screen
    ↓
END GAME
```

## WebSocket Message Flow

```
Player 1              Server              Player 2
   │                   │                     │
   │─ CREATE_GAME ────→│                     │
   │←─ GAME_CREATED ───│                     │
   │                   │                     │
   │                   │  ← JOIN_GAME ──────│
   │  ← PLAYER_JOINED ─│── GAME_JOINED ────→│
   │                   │                     │
   │─ MOVE_PIECE ─────→│                     │
   │                   │─ STATE_UPDATE ────→│
   │←─ STATE_UPDATE ───│                     │
   │                   │                     │
   │─ MOVE_DISC ──────→│                     │
   │                   │─ STATE_UPDATE ────→│
   │←─ STATE_UPDATE ───│                     │
   │                   │                     │
   │─ END_TURN ───────→│                     │
   │                   │─ STATE_UPDATE ────→│
   │←─ STATE_UPDATE ───│                     │
   │                   │                     │
   │  ... (Player 2 moves) ...               │
   │                   │                     │
   │←─ STATE_UPDATE ───│─ STATE_UPDATE ────→│
   │                   │                     │
   ...continues until someone wins...       │
   │                   │                     │
   │←─ WINNER_STATE ───│─ WINNER_STATE ────→│
   │                   │                     │
```

## Hexagonal Directions (0-5)

```
        2 (↖)  1 (↗)
         ╱  ╲  ╱  ╲
    3 ←─╱─── ●───╱─→ 0
       ╲  ╱  ╲  ╱
        ╲╱    ╲╱
        4 (↙)  5 (↘)

0 = Right      (q+1, r+0)
1 = TopRight   (q+1, r-1)
2 = TopLeft    (q+0, r-1)
3 = Left       (q-1, r+0)
4 = BottomLeft (q-1, r+1)
5 = BottomRgt  (q+0, r+1)
```

## Coordinate System Example

```
Piece at (1, 0) moving in direction 1 (top-right):

Move sequence: (1,0) → (2,-1) → (2,-2) [BOARD EDGE - STOP]

Final position: (2, -2)
Stopped because it reached board edge
```

## Game State Example (JSON)

```json
{
  "board": {
    "0,0": {"id": 0, "q": 0, "r": 0, "type": "center"},
    "1,0": {"id": 1, "q": 1, "r": 0, "type": "ring1"},
    "2,-2": {"id": 7, "q": 2, "r": -2, "type": "ring2"}
    // ... 16 more positions
  },
  "pieces": [
    {"id": 0, "player": "white", "q": 2, "r": -2},
    {"id": 1, "player": "black", "q": -2, "r": 2},
    {"id": 2, "player": "white", "q": 2, "r": 0},
    {"id": 3, "player": "black", "q": -2, "r": 0},
    {"id": 4, "player": "white", "q": 0, "r": 2},
    {"id": 5, "player": "black", "q": 0, "r": -2}
  ],
  "currentPlayer": "white",
  "gameState": "active",
  "winner": null,
  "moveHistory": [],
  "lastMovedDisc": null
}
```

## Error Examples

```
"Not your piece"
  → You tried to move opponent's piece
  → Check it's your color

"No valid moves in this direction"
  → Piece is against wall or blocked
  → Try a different direction

"Disc is blocked by a piece"
  → Can't move disc with piece on it
  → Move the piece first

"Target must touch at least 2 discs"
  → Disc placement must contact ≥2 other discs
  → Choose a different position

"Cannot move the disc opponent just placed"
  → Prevents immediate reversal
  → Wait for next turn

"Not your turn"
  → Trying to move when it's opponent's turn
  → Wait for state update showing your turn
```

## Browser DevTools Debugging

Open browser console (F12) and check:

```javascript
// Check game state
console.log(gameState);

// Check whose turn it is
console.log(gameState.currentPlayer);

// Check piece positions
console.log(gameState.pieces);

// Check board positions
console.log(gameState.board);

// Check winner
console.log(gameState.winner);
```

## Deployment Architecture

```
┌────────────────────────────────────────────┐
│          Render.com Hosting                │
├────────────────────────────────────────────┤
│                                            │
│  Node.js Server (port 3001)               │
│  ┌──────────────────────────────────┐    │
│  │ Express + WebSocket              │    │
│  │                                  │    │
│  │ Routes:                          │    │
│  │  / → Serve React build          │    │
│  │  /api/game/:id → GET game state │    │
│  │  ws → WebSocket handler         │    │
│  │                                  │    │
│  │ Game Logic (In Memory)          │    │
│  │  - 19-position board            │    │
│  │  - 6 pieces per game            │    │
│  │  - Turn management              │    │
│  │  - Win detection                │    │
│  └──────────────────────────────────┘    │
│                                            │
│  Built-in React App (600x600 SVG)        │
│  Served as static files                   │
│                                            │
└────────────────────────────────────────────┘
         ↓
    Internet
         ↓
  ┌─────────────────────────────────┐
  │   Browser 1 (Player 1)         │
  │   - React Component             │
  │   - WebSocket Connection        │
  │   - Display Board & Controls    │
  └─────────────────────────────────┘

  ┌─────────────────────────────────┐
  │   Browser 2 (Player 2)         │
  │   - React Component             │
  │   - WebSocket Connection        │
  │   - Display Board & Controls    │
  └─────────────────────────────────┘
```

## Color Scheme

```
WHITE pieces:     ■ (white/light)
BLACK pieces:     ■ (black/dark)
Board discs:      ■ (gray)
Buttons:          ■ (blue/purple)
Highlights:       ■ (orange on select)
Winner screen:    ■ (green)
Error message:    ■ (red)
```

---

This visual guide should help understand how Nonagaonline works both visually and mechanically!
