"""
Game logic for Nonagaonline
Abstract strategy game for 2 players with hexagonal board
"""

HEX_DIRECTIONS = [
    {"q": 1, "r": 0},      # Right
    {"q": 1, "r": -1},     # Top-right
    {"q": 0, "r": -1},     # Top-left
    {"q": -1, "r": 0},     # Left
    {"q": -1, "r": 1},     # Bottom-left
    {"q": 0, "r": 1},      # Bottom-right
]


class Game:
    def __init__(self):
        self.board = self.initialize_board()
        self.pieces = self.initialize_pieces()
        self.current_player = "white"
        self.game_state = "active"  # active, won, draw
        self.winner = None
        self.move_history = []
        self.last_moved_disc = None

    def initialize_board(self):
        """Initialize hexagonal board with 19 positions"""
        discs = {}
        disc_id = 0

        # Center disc
        discs["0,0"] = {"id": disc_id, "q": 0, "r": 0, "type": "center"}
        disc_id += 1

        # 6 ring 1 positions
        for direction in HEX_DIRECTIONS:
            q, r = direction["q"], direction["r"]
            discs[f"{q},{r}"] = {"id": disc_id, "q": q, "r": r, "type": "ring1"}
            disc_id += 1

        # 12 ring 2 positions (outer edge)
        ring2_positions = [
            {"q": 2, "r": 0},
            {"q": 2, "r": -1},
            {"q": 2, "r": -2},
            {"q": 1, "r": -2},
            {"q": 0, "r": -2},
            {"q": -1, "r": -1},
            {"q": -2, "r": 0},
            {"q": -2, "r": 1},
            {"q": -2, "r": 2},
            {"q": -1, "r": 2},
            {"q": 0, "r": 2},
            {"q": 1, "r": 1},
        ]

        for pos in ring2_positions:
            q, r = pos["q"], pos["r"]
            discs[f"{q},{r}"] = {"id": disc_id, "q": q, "r": r, "type": "ring2"}
            disc_id += 1

        return discs

    def initialize_pieces(self):
        """Initialize player pieces at alternating corners"""
        corners = [
            {"q": 2, "r": -2, "player": "white"},   # Top-right
            {"q": -2, "r": 2, "player": "black"},   # Bottom-left
            {"q": 2, "r": 0, "player": "white"},    # Right
            {"q": -2, "r": 0, "player": "black"},   # Left
            {"q": 0, "r": 2, "player": "white"},    # Bottom
            {"q": 0, "r": -2, "player": "black"},   # Top
        ]

        pieces = []
        for idx, corner in enumerate(corners):
            pieces.append({
                "id": idx,
                "player": corner["player"],
                "q": corner["q"],
                "r": corner["r"],
            })

        return pieces

    def move_piece(self, piece_id, direction):
        """Move a piece in a direction until it hits obstacle"""
        piece = None
        for p in self.pieces:
            if p["id"] == piece_id:
                piece = p
                break

        if not piece:
            return {"success": False, "error": "Piece not found"}

        if piece["player"] != self.current_player:
            return {"success": False, "error": "Not your piece"}

        if direction < 0 or direction >= 6:
            return {"success": False, "error": "Invalid direction"}

        dir_obj = HEX_DIRECTIONS[direction]
        new_q = piece["q"] + dir_obj["q"]
        new_r = piece["r"] + dir_obj["r"]

        # Move until obstacle
        while True:
            # Check bounds
            if f"{new_q},{new_r}" not in self.board:
                new_q -= dir_obj["q"]
                new_r -= dir_obj["r"]
                break

            # Check collision with other pieces
            collision = False
            for p in self.pieces:
                if p["q"] == new_q and p["r"] == new_r:
                    collision = True
                    break

            if collision:
                new_q -= dir_obj["q"]
                new_r -= dir_obj["r"]
                break

            new_q += dir_obj["q"]
            new_r += dir_obj["r"]

        # Piece must move at least one step
        if new_q == piece["q"] and new_r == piece["r"]:
            return {"success": False, "error": "No valid moves in this direction"}

        piece["q"] = new_q
        piece["r"] = new_r

        return {"success": True}

    def move_disc(self, from_q, from_r, to_q, to_r):
        """Move a disc on the board"""
        from_key = f"{from_q},{from_r}"
        to_key = f"{to_q},{to_r}"

        # Validation
        if from_key not in self.board:
            return {"success": False, "error": "Source disc not found"}
        if to_key not in self.board:
            return {"success": False, "error": "Target position not found"}

        if self.board[from_key]["type"] != "ring2":
            return {"success": False, "error": "Can only move outer discs"}
        if self.board[to_key]["type"] != "ring2":
            return {"success": False, "error": "Can only place on outer positions"}

        # Check if source disc is blocked by pieces
        for piece in self.pieces:
            if piece["q"] == from_q and piece["r"] == from_r:
                return {"success": False, "error": "Disc is blocked by a piece"}

        # Check if this is the disc opponent just moved
        if self.last_moved_disc == from_key:
            return {"success": False, "error": "Cannot move the disc opponent just placed"}

        # Check target is empty
        if to_key in self.board and self.board[to_key]["id"] != self.board[from_key]["id"]:
            return {"success": False, "error": "Target position already has a disc"}

        # Check target touches at least 2 discs
        neighbors = self.get_adjacent_positions(to_q, to_r)
        touching_discs = 0
        for neighbor in neighbors:
            neighbor_key = f"{neighbor['q']},{neighbor['r']}"
            if neighbor_key in self.board and neighbor_key != from_key:
                touching_discs += 1

        if touching_discs < 2:
            return {"success": False, "error": "Target must touch at least 2 other discs"}

        # Move the disc
        moved_disc = self.board[from_key]
        del self.board[from_key]
        moved_disc["q"] = to_q
        moved_disc["r"] = to_r
        self.board[to_key] = moved_disc

        self.last_moved_disc = to_key

        return {"success": True}

    def get_adjacent_positions(self, q, r):
        """Get adjacent hexagonal positions"""
        return [{"q": q + d["q"], "r": r + d["r"]} for d in HEX_DIRECTIONS]

    def check_win_condition(self):
        """Check if any player has won"""
        for player in ["white", "black"]:
            player_pieces = [p for p in self.pieces if p["player"] == player]

            if len(player_pieces) != 3:
                continue

            p1, p2, p3 = player_pieces[0], player_pieces[1], player_pieces[2]

            # Check if all 3 pieces are connected to each other
            if (
                self.are_connected(p1, p2)
                and self.are_connected(p2, p3)
                and self.are_connected(p1, p3)
            ):
                self.game_state = "won"
                self.winner = player
                return True

        return False

    def are_connected(self, piece1, piece2):
        """Check if two pieces are adjacent"""
        distance = max(
            abs(piece1["q"] - piece2["q"]),
            abs(piece1["r"] - piece2["r"]),
            abs((piece1["q"] + piece1["r"]) - (piece2["q"] + piece2["r"])),
        ) / 2
        return distance == 1

    def end_turn(self):
        """End turn and switch player"""
        self.check_win_condition()
        self.current_player = "black" if self.current_player == "white" else "white"

    def get_state(self):
        """Get complete game state"""
        return {
            "board": self.board,
            "pieces": self.pieces,
            "currentPlayer": self.current_player,
            "gameState": self.game_state,
            "winner": self.winner,
            "moveHistory": self.move_history,
        }
