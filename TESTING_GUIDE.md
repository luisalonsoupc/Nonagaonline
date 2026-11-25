# Nonagaonline - Testing Guide

## Game Features Implemented

### ✅ Token/Piece Positioning
- **Red** and **Black** pieces (not white/black)
- **Interleaved placement**: Red at (2,-2), Black at (-1,-1), Red at (2,0), Black at (-2,0), Red at (0,2), Black at (0,-2)
- Pieces are displayed as large circles (radius 20)

### ✅ Board Discs
- **No numbers** inside the board discs
- 19 hexagonal positions displayed as circles (radius 30)
- Different shading for inner rings vs outer ring

### ✅ Player Turn Control
- **Only the current player can interact** with the board
- When it's NOT your turn: All pieces are faded/disabled, cannot click
- Phase info shows whose turn it is with emoji indicators

### ✅ Piece Selection & Movement
- **Phase 1**: Select one of YOUR color pieces
  - Only your pieces are clickable with orange border
  - Selected piece gets orange stroke with glow effect
  - Pieces of other color are disabled (faded)
- Once selected, piece is highlighted with orange outline

### ✅ Disc Highlighting
- **Phase 2**: After piece moves, yellow highlighted discs are shown
  - Movable discs have yellow fill and orange stroke
  - Non-movable discs have normal gray color
  - Only outer ring (ring2) discs can be moved
  - Blocked discs (with pieces on them) are skipped

### ✅ Disc Movement Preview
- **Phase 3**: Select a disc to move
  - Highlighted disc shows in yellow
  - Green discs with dashed stroke show possible destination positions
  - Click green disc to place

### ✅ Board Re-centering
- Board automatically centers at (300, 300) in SVG viewBox
- All pieces and discs scale correctly with hexagonal coordinate system

## How to Test Locally

### Starting the Game

1. **Start server** (already running on port 5000):
   ```bash
   python app.py
   ```

2. **Open two browsers**:
   - Window 1: `http://localhost:5000` (Player 1 - RED)
   - Window 2: `http://localhost:5000` (Player 2 - BLACK)

### Game Flow to Test

#### Step 1: Create & Join Game

**In Browser 1 (RED):**
- Click "Create Game"
- Copy the generated Game ID
- Wait for opponent

**In Browser 2 (BLACK):**
- Click "Join Game"
- Paste the Game ID
- Press "Join Game"

Both should now see "Current turn: RED"

#### Step 2: Test Turn Control

**RED's turn (Browser 1):**
- ✓ RED pieces should be clickable (orange border when hovered)
- ✓ BLACK pieces should be faded/disabled
- ✓ Message: "Phase 1: Select a piece to move (RED)"

**BLACK's turn (Browser 2):**
- ✓ Should see "Waiting for RED's move..."
- ✓ BLACK pieces should be faded/disabled
- ✓ Cannot click anything

#### Step 3: Test Piece Selection

**In Browser 1 (RED's turn):**

1. Click any RED piece
   - ✓ Piece gets orange stroke with glow
   - ✓ Current phase shows in info box
   
2. The piece is selected, ready to move

#### Step 4: Test Piece Movement

1. Click the selected RED piece again
   - ✓ Piece should move in a direction
   - ✓ Phase advances to "Phase 2: Select a disc to move"
   - ✓ YELLOW discs appear on the board

#### Step 5: Test Disc Selection

1. Click on a YELLOW disc
   - ✓ Disc should be highlighted differently
   - ✓ Phase changes to "Phase 3: Select destination for disc"
   - ✓ Possible destination positions show in GREEN with dashed outline

2. Click a GREEN disc
   - ✓ Disc moves to new position
   - ✓ Turn ends automatically
   - ✓ Current player becomes BLACK

#### Step 6: Verify Turn Switch

**Check Browser 2 (BLACK):**
- ✓ Now sees "Current turn: BLACK"
- ✓ All controls are enabled for BLACK
- ✓ RED pieces are faded
- ✓ BLACK pieces are clickable

Repeat from Step 3 with BLACK pieces.

## UI Elements Reference

### Colors & Indicators
- **RED pieces**: #d32f2f (bright red)
- **BLACK pieces**: #000 (pure black)
- **Movable discs**: Yellow (#ffeb3b) with orange stroke
- **Target positions**: Green (#81c784) with dashed stroke
- **Selected piece**: Orange (#ff6600) stroke with glow
- **Normal discs**: Gray (#d0d0d0 or #e0e0e0)
- **Disabled pieces**: Faded opacity 0.5

### Phase Indicators
- 📍 Phase 1: Select a piece to move
- 🔄 Phase 2: Select a disc to move  
- 📌 Phase 3: Select destination for disc
- ⏳ Waiting for opponent's move

### Buttons
- **End Turn**: Becomes clickable after piece is selected
- Disabled during disc placement phase

## Common Issues & Solutions

### Issue: Can't click pieces
- **Cause**: It's not your turn
- **Fix**: Wait for the other player's turn to complete

### Issue: Piece won't move
- **Cause**: Selected piece is from wrong color
- **Fix**: Only click pieces of YOUR color when highlighted

### Issue: Can't see disc options
- **Cause**: Phase 2 hasn't been reached
- **Fix**: First select and move a piece (Phase 1)

### Issue: Green destination discs not showing
- **Cause**: Disc selection phase not active
- **Fix**: Select a yellow disc first

## Win Condition Testing

To test win condition, manually get 3 pieces adjacent:
1. Use browser console to manipulate pieces
2. Run `/win` command to check win detection
3. When 3 pieces are adjacent, game should show:
   - 🎉 [COLOR] WINS! 🎉
   - Golden background animation

## Performance Notes

- Uses WebSocket for real-time communication
- Board redraws on every state update
- SVG rendering is optimized for 19 discs + 6 pieces
- Should run smoothly on most modern browsers

---

**Last Updated**: 25 Nov 2026
**Technology**: Python Flask + Socket.IO + Vanilla JS
**Status**: ✅ Ready for local testing
