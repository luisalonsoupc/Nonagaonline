# Nonagaonline - Abstract Strategy Game

A web-based multiplayer game for two players with hexagonal board layout.

## Game Rules

The objective is to connect your 3 pieces in a line (straight, curved, or triangle).

### Setup
- **Board**: 19 discs arranged in hexagon (1 center, 6 inner ring, 12 outer ring)
- **Pieces**: Each player has 3 colored pieces placed at alternating corners

### Gameplay
Players alternate turns:

1. Select one of your pieces and click a green-ringed destination. The piece moves
   in that direction until it reaches another piece or the board edge.
2. Select a blue-ringed, unoccupied outer disc and click a dashed position to place it.
   The position must be empty and touch at least two other discs; the disc moved by
   the opponent on the previous turn cannot be moved. A disc must also have a
   clear sliding path to its destination without touching another disc.

You may change your selection before choosing a destination. Each move is final;
after the disc is placed, the turn passes automatically to the other player.

### Win Condition
First player to connect all 3 pieces adjacent to each other wins (line, triangle,
or curve pattern). The game ends immediately after the winning piece move; no
disc is moved.

## Installation

### Local Development

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run the development server
python app.py
```

The game will be available at: `http://localhost:5000`

### Testing with Two Players

1. Open `http://localhost:5000` in one browser/tab (Player 1 - Red)
2. Open `http://localhost:5000` in another browser/tab (Player 2 - Black)
3. In Player 1: Click "Create Game" and copy the game ID
4. In Player 2: Select the waiting game from the list and click "Join Game",
   or enter the game ID manually
5. Play!

## Deployment to Render

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect to your GitHub repository
4. Set Environment:
   - Language: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn --worker-class eventlet -w 1 app:app`
5. Deploy!

## Project Structure

```
nonagaonline/
├── app.py                 # Flask server with WebSocket handlers
├── game.py               # Game logic and rules
├── requirements.txt      # Python dependencies
├── Procfile             # Render deployment config
├── templates/
│   └── index.html       # Main HTML page
└── static/
    ├── style.css        # Styling
    └── game.js          # Client-side game logic
```

## Features

- Real-time multiplayer via WebSocket
- Hexagonal grid coordinate system
- Complete game logic with win detection
- Responsive UI with mobile support
- Beautiful gradient interface

## Technologies

- **Backend**: Flask, Flask-SocketIO, Python
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Hosting**: Render (supports WebSocket)

## Notes

- Currently stores games in memory (lost on server restart)
- For production, consider adding database persistence
- WebSocket connections are thread-safe with `async_mode="threading"`

## License

MIT
