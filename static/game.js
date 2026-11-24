const socket = io();

class GameApp {
    constructor() {
        this.gameId = null;
        this.playerColor = null;
        this.gameState = null;
        this.selectedPiece = null;
        this.selectedDisc = null;
        this.phase = "menu"; // menu, waiting, playing, finished
        this.error = null;

        this.init();
    }

    init() {
        socket.on("GAME_CREATED", (data) => this.handleGameCreated(data));
        socket.on("GAME_JOINED", (data) => this.handleGameJoined(data));
        socket.on("PLAYER_JOINED", (data) => this.handlePlayerJoined(data));
        socket.on("STATE_UPDATE", (data) => this.handleStateUpdate(data));
        socket.on("ERROR", (data) => this.handleError(data));

        this.render();
    }

    hexToPixel(q, r) {
        const size = 40;
        const x = size * ((3 / 2) * q);
        const y = size * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r);
        return { x: x + 300, y: y + 300 };
    }

    handleGameCreated(data) {
        this.gameId = data.gameId;
        this.playerColor = data.playerColor;
        this.gameState = data.state;
        this.phase = "waiting";
        this.render();
    }

    handleGameJoined(data) {
        this.gameId = data.gameId;
        this.playerColor = data.playerColor;
        this.gameState = data.state;
        this.phase = "playing";
        this.render();
    }

    handlePlayerJoined(data) {
        this.gameState = data.state;
        this.phase = "playing";
        this.render();
    }

    handleStateUpdate(data) {
        this.gameState = data.state;
        this.selectedPiece = null;
        this.selectedDisc = null;

        if (data.state.gameState === "won") {
            this.phase = "finished";
        } else if (this.phase !== "playing") {
            this.phase = "playing";
        }

        this.render();
    }

    handleError(data) {
        this.error = data.message;
        this.render();
        setTimeout(() => {
            this.error = null;
            this.render();
        }, 3000);
    }

    createGame() {
        socket.emit("CREATE_GAME", {});
    }

    joinGame() {
        const gameId = document.getElementById("gameIdInput").value.trim();
        if (!gameId) {
            this.error = "Please enter a game ID";
            this.render();
            return;
        }
        socket.emit("JOIN_GAME", { gameId });
    }

    movePiece(pieceId, direction) {
        if (this.gameState.currentPlayer !== this.playerColor) {
            this.error = "Not your turn";
            this.render();
            return;
        }

        socket.emit("MOVE_PIECE", { pieceId, direction });
    }

    moveDisc(fromQ, fromR, toQ, toR) {
        if (this.gameState.currentPlayer !== this.playerColor) {
            this.error = "Not your turn";
            this.render();
            return;
        }

        socket.emit("MOVE_DISC", { fromQ, fromR, toQ, toR });
    }

    endTurn() {
        socket.emit("END_TURN", {});
    }

    renderMenu() {
        return `
            <div class="menu">
                <h1>Nonagaonline</h1>
                <p>Abstract strategy game for 2 players</p>
                
                <div class="menu-actions">
                    <button onclick="app.createGame()" class="btn btn-primary">
                        Create Game
                    </button>
                    
                    <div class="join-section">
                        <input
                            type="text"
                            placeholder="Enter game ID"
                            id="gameIdInput"
                        />
                        <button
                            onclick="app.joinGame()"
                            class="btn btn-secondary"
                        >
                            Join Game
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderWaiting() {
        return `
            <div class="waiting">
                <h2>Game Created!</h2>
                <p>Share this ID with another player:</p>
                <div class="game-id">${this.gameId}</div>
                <p>Waiting for opponent...</p>
            </div>
        `;
    }

    renderBoard() {
        if (!this.gameState) {
            return "<p>Loading...</p>";
        }

        const boardSVG = this.renderBoardSVG();

        const controlsHTML = this.renderControls();

        return `
            <div class="game-info">
                <h2>Nonagaonline</h2>
                <p>Your color: <span class="color-${this.playerColor}">${this.playerColor.toUpperCase()}</span></p>
                <p>Current turn: <span class="color-${this.gameState.currentPlayer}">${this.gameState.currentPlayer.toUpperCase()}</span></p>
                ${
                    this.gameState.gameState === "won"
                        ? `<div class="winner-message color-${this.gameState.winner}">
                            ${this.gameState.winner.toUpperCase()} WINS!
                        </div>`
                        : ""
                }
            </div>

            <div class="game-board">
                ${boardSVG}
            </div>

            ${controlsHTML}
        `;
    }

    renderBoardSVG() {
        let svg = '<svg width="600" height="600" viewBox="0 0 600 600">';

        // Render discs
        for (const [key, disc] of Object.entries(this.gameState.board)) {
            const pos = this.hexToPixel(disc.q, disc.r);
            const isOuter = disc.type === "ring2";

            svg += `
                <circle
                    cx="${pos.x}"
                    cy="${pos.y}"
                    r="30"
                    fill="${isOuter ? "#ddd" : "#ccc"}"
                    stroke="#999"
                    stroke-width="2"
                    class="disc"
                />
                <text
                    x="${pos.x}"
                    y="${pos.y}"
                    text-anchor="middle"
                    dy="0.3em"
                    font-size="10"
                    fill="#666"
                >
                    (${disc.q},${disc.r})
                </text>
            `;
        }

        // Render pieces
        for (const piece of this.gameState.pieces) {
            const pos = this.hexToPixel(piece.q, piece.r);
            const isSelected = this.selectedPiece && this.selectedPiece.id === piece.id;
            const fillColor = piece.player === "white" ? "#fff" : "#000";
            const strokeColor = isSelected ? "#ff6600" : "#333";
            const strokeWidth = isSelected ? 3 : 2;

            svg += `
                <circle
                    cx="${pos.x}"
                    cy="${pos.y}"
                    r="20"
                    fill="${fillColor}"
                    stroke="${strokeColor}"
                    stroke-width="${strokeWidth}"
                    class="piece"
                    onclick="app.selectPiece(${piece.id})"
                    style="cursor: ${piece.player === this.playerColor ? 'pointer' : 'default'}"
                />
            `;
        }

        svg += "</svg>";
        return svg;
    }

    selectPiece(pieceId) {
        const piece = this.gameState.pieces.find((p) => p.id === pieceId);
        if (!piece) return;

        if (piece.player !== this.playerColor) return;

        if (this.selectedPiece && this.selectedPiece.id === pieceId) {
            this.selectedPiece = null;
        } else {
            this.selectedPiece = piece;
        }

        this.render();
    }

    renderControls() {
        let html = '<div class="controls">';

        if (this.error) {
            html += `<div class="error-message">${this.error}</div>`;
        }

        if (this.gameState.currentPlayer === this.playerColor) {
            html += `<p>Your turn - Select a piece to move</p>`;

            if (this.selectedPiece) {
                html += '<div class="direction-buttons">';
                const dirNames = ["→", "↗", "↖", "←", "↙", "↘"];
                for (let dir = 0; dir < 6; dir++) {
                    html += `
                        <button
                            onclick="app.movePiece(${this.selectedPiece.id}, ${dir})"
                            class="btn btn-small"
                            title="Direction ${dir}"
                        >
                            ${dirNames[dir]}
                        </button>
                    `;
                }
                html += "</div>";
            }

            html += `
                <button
                    onclick="app.endTurn()"
                    class="btn btn-primary"
                    ${!this.selectedPiece ? "disabled" : ""}
                >
                    End Turn
                </button>
            `;
        } else {
            html += `<p>Waiting for opponent...</p>`;
        }

        html += "</div>";
        return html;
    }

    render() {
        const app = document.getElementById("app");

        let content = '<div class="game-container">';

        if (this.phase === "menu") {
            content += this.renderMenu();
        } else if (this.phase === "waiting") {
            content += this.renderWaiting();
        } else if (this.phase === "playing" || this.phase === "finished") {
            content += this.renderBoard();
        }

        content += "</div>";
        app.innerHTML = content;
    }
}

const app = new GameApp();
