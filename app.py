"""
Flask server for Nonagaonline
Handles WebSocket connections and game sessions
"""

from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit, join_room, leave_room
import uuid
from threading import Lock
from game import Game

app = Flask(__name__, template_folder="templates", static_folder="static")
app.config["SECRET_KEY"] = "your-secret-key-change-in-production"
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# Game sessions storage
game_sessions = {}

# Player to room mapping
player_to_room = {}


def generate_game_id():
    """Generate unique game ID"""
    return str(uuid.uuid4())[:8].upper()


@app.route("/")
def index():
    """Serve main page"""
    return render_template("index.html")


@app.route("/api/game/<game_id>", methods=["GET"])
def get_game_state(game_id):
    """Get game state via REST API"""
    if game_id not in game_sessions:
        return jsonify({"error": "Game not found"}), 404

    session = game_sessions[game_id]
    return jsonify(session["game"].get_state())


@socketio.on("connect")
def on_connect():
    """Handle client connection"""
    print(f"Client connected: {request.sid}")


@socketio.on("disconnect")
def on_disconnect():
    """Handle client disconnection"""
    sid = request.sid
    if sid in player_to_room:
        game_id = player_to_room[sid]
        leave_room(game_id)
        del player_to_room[sid]
        print(f"Client disconnected: {sid}")


@socketio.on("CREATE_GAME")
def on_create_game(data):
    """Create a new game"""
    game_id = generate_game_id()
    game = Game()

    game_sessions[game_id] = {
        "game": game,
        "player1": request.sid,
        "player1_color": "red",
        "player2": None,
        "player2_color": "black",
        "lock": Lock(),
    }

    player_to_room[request.sid] = game_id
    join_room(game_id)

    emit(
        "GAME_CREATED",
        {
            "gameId": game_id,
            "playerColor": "red",
            "state": game.get_state(),
        },
    )
    print(f"Game created: {game_id}")


@socketio.on("JOIN_GAME")
def on_join_game(data):
    """Join an existing game"""
    game_id = data.get("gameId")

    if game_id not in game_sessions:
        emit("ERROR", {"message": "Game not found"})
        return

    session = game_sessions[game_id]
    if session["player2"] is not None:
        emit("ERROR", {"message": "Game is full"})
        return

    session["player2"] = request.sid
    player_to_room[request.sid] = game_id
    join_room(game_id)

    state = session["game"].get_state()

    # Notify both players
    socketio.emit(
        "PLAYER_JOINED",
        {"state": state},
        room=game_id,
    )

    emit(
        "GAME_JOINED",
        {
            "gameId": game_id,
            "playerColor": "black",
            "state": state,
        },
    )

    print(f"Player joined game: {game_id}")


@socketio.on("MOVE_PIECE")
def on_move_piece(data):
    """Handle piece movement"""
    sid = request.sid
    if sid not in player_to_room:
        emit("ERROR", {"message": "Not in a game"})
        return

    game_id = player_to_room[sid]
    if game_id not in game_sessions:
        emit("ERROR", {"message": "Game not found"})
        return

    session = game_sessions[game_id]
    game = session["game"]

    piece_id = data.get("pieceId")
    direction = data.get("direction")

    with session["lock"]:
        player_color = (
            session["player1_color"] if sid == session["player1"]
            else session["player2_color"] if sid == session["player2"]
            else None
        )
        if session["player2"] is None:
            emit("ERROR", {"message": "Waiting for opponent"})
            return
        if player_color != game.current_player:
            emit("ERROR", {"message": "Not your turn"})
            return

        result = game.move_piece(piece_id, direction)
        if not result["success"]:
            emit("ERROR", {"message": result["error"]})
            return

        broadcast_game_state(session, game_id, {"type": "PIECE_MOVED", "pieceId": piece_id})


@socketio.on("MOVE_DISC")
def on_move_disc(data):
    """Move a disc and finish the current player's turn."""
    sid = request.sid
    game_id = player_to_room.get(sid)
    if game_id not in game_sessions:
        emit("ERROR", {"message": "Not in a game"})
        return

    session = game_sessions[game_id]
    with session["lock"]:
        game = session["game"]
        player_color = (
            session["player1_color"] if sid == session["player1"]
            else session["player2_color"] if sid == session["player2"]
            else None
        )
        if session["player2"] is None or player_color != game.current_player:
            emit("ERROR", {"message": "Not your turn"})
            return
        result = game.move_disc(data.get("fromQ"), data.get("fromR"), data.get("toQ"), data.get("toR"))
        if not result["success"]:
            emit("ERROR", {"message": result["error"]})
            return
        broadcast_game_state(session, game_id, {
            "type": "DISC_MOVED",
            "from": {"q": data["fromQ"], "r": data["fromR"]},
            "to": {"q": data["toQ"], "r": data["toR"]},
            "path": result["path"],
        })


@socketio.on("END_TURN")
def on_end_turn(data):
    """Reject attempts to skip a turn."""
    emit("ERROR", {"message": "Move a piece and a disc to finish your turn"})


def broadcast_game_state(session, game_id, action):
    """Broadcast game state to both players"""
    state = session["game"].get_state()
    socketio.emit(
        "STATE_UPDATE",
        {"action": action, "state": state},
        room=game_id,
    )


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
