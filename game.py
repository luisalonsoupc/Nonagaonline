"""
Game logic for Nonagaonline
Abstract strategy game for 2 players with hexagonal board
"""

import heapq
import math

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
        self.current_player = "red"
        self.game_state = "active"  # active, won, draw
        self.winner = None
        self.move_history = []
        self.last_moved_disc = None
        self.phase = "piece_selection"
        self._disc_moves = None

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
        # 6 corners of the hexagonal board, interleaved: red, black, red, black, red, black
        corners = [
            {"q": 2, "r": -2, "player": "red"},      # Top-right - red
            {"q": 0, "r": -2, "player": "black"},    # Top - black
            {"q": -2, "r": 0, "player": "red"},      # Left - red
            {"q": -2, "r": 2, "player": "black"},    # Bottom-left - black
            {"q": 0, "r": 2, "player": "red"},       # Bottom - red
            {"q": 2, "r": 0, "player": "black"},     # Right - black
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
        if self.game_state != "active":
            return {"success": False, "error": "Game is over"}
        if self.phase != "piece_selection":
            return {"success": False, "error": "Move a disc to finish your turn"}

        piece = None
        for p in self.pieces:
            if p["id"] == piece_id:
                piece = p
                break

        if not piece:
            return {"success": False, "error": "Piece not found"}

        if piece["player"] != self.current_player:
            return {"success": False, "error": "Not your piece"}

        if type(direction) is not int or direction < 0 or direction >= 6:
            return {"success": False, "error": "Invalid direction"}

        destination = self.piece_destination(piece, direction)
        if destination is None:
            return {"success": False, "error": "No valid moves in this direction"}

        piece["q"], piece["r"] = destination
        self._disc_moves = None
        if not self.check_win_condition():
            self.phase = "disc_selection"
        return {"success": True}

    def piece_destination(self, piece, direction):
        """Return the stopping position for a piece, or None if blocked."""
        dir_obj = HEX_DIRECTIONS[direction]
        q, r = piece["q"], piece["r"]
        while True:
            next_q, next_r = q + dir_obj["q"], r + dir_obj["r"]
            if f"{next_q},{next_r}" not in self.board or any(
                p["q"] == next_q and p["r"] == next_r for p in self.pieces
            ):
                break
            q, r = next_q, next_r
        return None if (q, r) == (piece["q"], piece["r"]) else (q, r)

    def move_disc(self, from_q, from_r, to_q, to_r):
        """Move a disc on the board"""
        if self.game_state != "active":
            return {"success": False, "error": "Game is over"}
        if self.phase != "disc_selection":
            return {"success": False, "error": "Move a piece first"}
        if any(type(value) is not int for value in (from_q, from_r, to_q, to_r)):
            return {"success": False, "error": "Invalid disc position"}

        from_key = f"{from_q},{from_r}"
        to_key = f"{to_q},{to_r}"
        moves = self.possible_disc_moves()
        destination = next(
            (move for move in moves.get(from_key, []) if move["q"] == to_q and move["r"] == to_r),
            None,
        )
        if destination is None:
            return {"success": False, "error": "Invalid disc move"}

        # Move the disc
        moved_disc = self.board[from_key]
        del self.board[from_key]
        moved_disc["q"] = to_q
        moved_disc["r"] = to_r
        self.board[to_key] = moved_disc

        self.last_moved_disc = to_key
        self._disc_moves = None
        self.end_turn()
        return {"success": True, "path": destination["path"]}

    def possible_disc_moves(self):
        """Find eligible outer discs and empty positions touching two remaining discs."""
        if self._disc_moves is not None:
            return self._disc_moves
        moves = {}
        occupied = {(piece["q"], piece["r"]) for piece in self.pieces}
        for from_key, disc in self.board.items():
            if (disc["type"] != "ring2" or from_key == self.last_moved_disc or
                    (disc["q"], disc["r"]) in occupied):
                continue
            remaining = {key for key in self.board if key != from_key}
            candidates = set()
            for key in remaining:
                q, r = (int(value) for value in key.split(","))
                for neighbor in self.get_adjacent_positions(q, r):
                    target = (neighbor["q"], neighbor["r"])
                    target_key = f"{target[0]},{target[1]}"
                    if target_key not in self.board:
                        candidates.add(target)
            candidates_with_neighbors = []
            for q, r in sorted(candidates):
                touching = sum(
                    f"{neighbor['q']},{neighbor['r']}" in remaining
                    for neighbor in self.get_adjacent_positions(q, r)
                )
                if touching >= 2:
                    candidates_with_neighbors.append((q, r))
            obstacles = [self.disc_pixel(self.board[key]["q"], self.board[key]["r"]) for key in remaining]
            paths = self.disc_sliding_paths(
                self.disc_pixel(disc["q"], disc["r"]),
                [self.disc_pixel(q, r) for q, r in candidates_with_neighbors],
                obstacles,
            )
            destinations = [
                {"q": q, "r": r, "path": [{"x": x, "y": y} for x, y in path]}
                for (q, r), path in zip(candidates_with_neighbors, paths) if path is not None
            ]
            if destinations:
                moves[from_key] = destinations
        self._disc_moves = moves
        return moves

    @staticmethod
    def disc_pixel(q, r):
        return (60 * q, 40 * math.sqrt(3) * (r + q / 2))

    @staticmethod
    def disc_sliding_paths(start, targets, obstacles):
        """Find collision-free polygonal paths around the other discs."""
        if not targets:
            return []

        clearance = 60.05
        sides = 32
        vertex_radius = 60.1 / math.cos(math.pi / sides)
        vertices = []
        for ox, oy in obstacles:
            for index in range(sides):
                angle = 2 * math.pi * index / sides
                point = (ox + vertex_radius * math.cos(angle), oy + vertex_radius * math.sin(angle))
                if all(math.hypot(point[0] - x, point[1] - y) >= clearance for x, y in obstacles):
                    vertices.append(point)

        points = [start] + targets + vertices
        distances = [math.inf] * len(points)
        previous = [None] * len(points)
        distances[0] = 0
        queue = [(0, 0)]
        remaining_targets = set(range(1, len(targets) + 1))

        def segment_clear(a, b):
            dx, dy = b[0] - a[0], b[1] - a[1]
            length_squared = dx * dx + dy * dy
            for x, y in obstacles:
                if (x < min(a[0], b[0]) - clearance or x > max(a[0], b[0]) + clearance or
                        y < min(a[1], b[1]) - clearance or y > max(a[1], b[1]) + clearance):
                    continue
                t = max(0, min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / length_squared))
                if (a[0] + t * dx - x) ** 2 + (a[1] + t * dy - y) ** 2 < clearance ** 2:
                    return False
            return True

        while queue and remaining_targets:
            distance, index = heapq.heappop(queue)
            if distance != distances[index]:
                continue
            remaining_targets.discard(index)
            for next_index, point in enumerate(points):
                if next_index == index:
                    continue
                length = math.hypot(point[0] - points[index][0], point[1] - points[index][1])
                if length == 0:
                    continue
                next_distance = distance + length
                if next_distance < distances[next_index] and segment_clear(points[index], point):
                    distances[next_index] = next_distance
                    previous[next_index] = index
                    heapq.heappush(queue, (next_distance, next_index))

        paths = []
        for index in range(1, len(targets) + 1):
            if math.isinf(distances[index]):
                paths.append(None)
                continue
            path = []
            while index is not None:
                path.append(points[index])
                index = previous[index]
            paths.append(list(reversed(path)))
        return paths

    def get_adjacent_positions(self, q, r):
        """Get adjacent hexagonal positions"""
        return [{"q": q + d["q"], "r": r + d["r"]} for d in HEX_DIRECTIONS]

    def check_win_condition(self):
        """Check if any player has won"""
        for player in ["red", "black"]:
            player_pieces = [p for p in self.pieces if p["player"] == player]

            if len(player_pieces) != 3:
                continue

            p1, p2, p3 = player_pieces[0], player_pieces[1], player_pieces[2]

            # Three pieces form a connected group when at least two pairs touch.
            if sum((
                self.are_connected(p1, p2),
                self.are_connected(p2, p3),
                self.are_connected(p1, p3),
            )) >= 2:
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
        )
        return distance == 1

    def end_turn(self):
        """End turn and switch player"""
        self.check_win_condition()
        if self.game_state == "active":
            self.current_player = "black" if self.current_player == "red" else "red"
        self.phase = "piece_selection"

    def get_state(self):
        """Get complete game state"""
        possible_moves = {}
        if self.game_state == "active" and self.phase == "piece_selection":
            for piece in self.pieces:
                if piece["player"] != self.current_player:
                    continue
                moves = []
                for direction in range(len(HEX_DIRECTIONS)):
                    destination = self.piece_destination(piece, direction)
                    if destination is not None:
                        moves.append({"q": destination[0], "r": destination[1], "direction": direction})
                possible_moves[piece["id"]] = moves
        return {
            "board": self.board,
            "pieces": self.pieces,
            "currentPlayer": self.current_player,
            "gameState": self.game_state,
            "winner": self.winner,
            "moveHistory": self.move_history,
            "possibleMoves": possible_moves,
            "phase": self.phase,
            "possibleDiscMoves": (
                self.possible_disc_moves()
                if self.game_state == "active" and self.phase == "disc_selection"
                else {}
            ),
        }
