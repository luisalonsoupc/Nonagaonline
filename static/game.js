const socket = io();

class GameApp {
    constructor() {
        this.gameId = null;
        this.playerColor = null;
        this.gameState = null;
        this.openGames = [];
        this.selectedPiece = null;
        this.selectedDisc = null;
        this.highlightedDiscs = new Map();
        this.movePending = false;
        this.animating = false;
        this.stateUpdateQueue = Promise.resolve();
        this.phase = "menu"; // menu, waiting, playing, finished
        this.error = null;
        this.sessionLost = false;
        this.boardOffset = { x: 300, y: 300 }; // For centering

        this.init();
    }

    init() {
        socket.on("connect", () => {
            if (this.phase === "menu") {
                if (this.error === "Connection lost. Reconnecting..." ||
                    this.error === "Unable to connect to the server. Retrying...") {
                    this.error = null;
                    this.renderError();
                }
                socket.emit("GET_OPEN_GAMES", {});
            }
        });
        socket.on("disconnect", () => {
            if (this.phase === "menu") {
                this.handleOpenGames({ games: [] });
                this.error = "Connection lost. Reconnecting...";
                this.renderError();
            } else {
                this.sessionLost = true;
                this.error = "Connection lost. Both players must refresh and start a new game.";
                this.render();
            }
        });
        socket.on("connect_error", () => {
            if (this.phase === "menu") {
                this.error = "Unable to connect to the server. Retrying...";
                this.renderError();
            }
        });
        socket.on("OPEN_GAMES", (data) => this.handleOpenGames(data));
        socket.on("GAME_CREATED", (data) => this.handleGameCreated(data));
        socket.on("GAME_JOINED", (data) => this.handleGameJoined(data));
        socket.on("PLAYER_JOINED", (data) => this.handlePlayerJoined(data));
        socket.on("OPPONENT_DISCONNECTED", () => {
            this.sessionLost = true;
            this.error = "Opponent disconnected. Both players must refresh and start a new game.";
            this.render();
        });
        socket.on("STATE_UPDATE", (data) => {
            this.stateUpdateQueue = this.stateUpdateQueue.then(() => this.handleStateUpdate(data));
        });
        socket.on("ERROR", (data) => this.handleError(data));

        this.render();
    }

    hexToPixel(q, r) {
        const size = 40;
        const x = size * ((3 / 2) * q);
        const y = size * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r);
        return { x: x + this.boardOffset.x, y: y + this.boardOffset.y };
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
        if (!this.playerColor) {
            return;
        }
        this.phase = "playing";
        this.render();
    }

    async handleStateUpdate(data) {
        this.animating = true;
        const board = document.querySelector(".game-board");
        if (board) {
            board.classList.add("animating");
        }
        await this.animateMove(data);
        this.gameState = data.state;
        this.selectedPiece = null;
        this.selectedDisc = null;
        this.highlightedDiscs.clear();
        this.movePending = false;
        this.animating = false;

        if (data.state.gameState === "won") {
            this.phase = "finished";
        } else if (this.phase !== "playing") {
            this.phase = "playing";
        }

        this.render(true);
    }

    async animateMove(data) {
        const svg = document.querySelector(".game-board svg");
        if (!svg || !this.gameState || document.hidden) {
            return;
        }

        let element;
        let from;
        let to;
        if (data.action.type === "PIECE_MOVED") {
            const previousPiece = this.gameState.pieces.find(piece => piece.id === data.action.pieceId);
            const nextPiece = data.state.pieces.find(piece => piece.id === data.action.pieceId);
            element = svg.querySelector(`.piece[data-piece-id="${data.action.pieceId}"]`);
            from = previousPiece;
            to = nextPiece;
        } else if (data.action.type === "DISC_MOVED") {
            from = data.action.from;
            to = data.action.to;
            element = svg.querySelector(`.disc[data-q="${from.q}"][data-r="${from.r}"]`);
        } else {
            return;
        }
        if (!element || !from || !to) {
            return;
        }

        const highlights = svg.querySelectorAll(".highlight-target, .highlight-movable, .selected, .disc-destination.visible");
        highlights.forEach(item => {
            item.classList.remove("highlight-target", "highlight-movable", "selected");
            item.classList.remove("visible");
        });
        if (highlights.length) {
            await new Promise(resolve => setTimeout(resolve, 250));
        }

        const start = this.hexToPixel(from.q, from.r);
        const end = this.hexToPixel(to.q, to.r);
        const path = data.action.type === "DISC_MOVED"
            ? data.action.path.map(point => ({ x: point.x + this.boardOffset.x, y: point.y + this.boardOffset.y }))
            : [start, end];
        const lengths = path.slice(1).map((point, index) =>
            Math.hypot(point.x - path[index].x, point.y - path[index].y));
        const pathLength = lengths.reduce((sum, length) => sum + length, 0);
        const oldView = svg.getAttribute("viewBox").split(" ").map(Number);
        const newView = this.getBoardViewBox(data.state);
        const isDisc = data.action.type === "DISC_MOVED";
        const minX = Math.min(oldView[0], newView[0], ...path.map(point => point.x - 45));
        const minY = Math.min(oldView[1], newView[1], ...path.map(point => point.y - 45));
        const maxX = Math.max(oldView[0] + oldView[2], newView[0] + newView[2], ...path.map(point => point.x + 45));
        const maxY = Math.max(oldView[1] + oldView[3], newView[1] + newView[3], ...path.map(point => point.y + 45));
        const pathView = [minX, minY, maxX - minX, maxY - minY];
        const cameraDuration = isDisc ? 200 : 0;
        const moveDuration = isDisc ? Math.max(500, pathLength / 450 * 1000) : 500;
        const duration = moveDuration + cameraDuration * 2;

        await new Promise(resolve => {
            let frame;
            let finished = false;
            const started = performance.now();
            const finish = () => {
                if (finished) return;
                finished = true;
                cancelAnimationFrame(frame);
                clearTimeout(timeout);
                element.setAttribute("transform", `translate(${end.x - start.x} ${end.y - start.y})`);
                svg.setAttribute("viewBox", newView.join(" "));
                resolve();
            };
            const step = now => {
                const elapsed = Math.min(now - started, duration);
                const progress = Math.max(0, Math.min((elapsed - cameraDuration) / moveDuration, 1));
                const eased = progress * progress * (3 - 2 * progress);
                let distance = pathLength * eased;
                let segment = 0;
                while (segment < lengths.length - 1 && distance > lengths[segment]) {
                    distance -= lengths[segment++];
                }
                const fraction = lengths[segment] ? distance / lengths[segment] : 0;
                const x = path[segment].x + (path[segment + 1].x - path[segment].x) * fraction;
                const y = path[segment].y + (path[segment + 1].y - path[segment].y) * fraction;
                element.setAttribute("transform", `translate(${x - start.x} ${y - start.y})`);
                let view;
                if (!isDisc) {
                    view = oldView.map((value, index) => value + (newView[index] - value) * eased);
                } else {
                    const cameraProgress = elapsed < cameraDuration
                        ? elapsed / cameraDuration
                        : Math.max(0, (elapsed - cameraDuration - moveDuration) / cameraDuration);
                    const cameraEased = cameraProgress * cameraProgress * (3 - 2 * cameraProgress);
                    const cameraFrom = elapsed < cameraDuration ? oldView : pathView;
                    const cameraTo = elapsed < cameraDuration ? pathView :
                        elapsed < cameraDuration + moveDuration ? pathView : newView;
                    view = cameraFrom.map((value, index) => value + (cameraTo[index] - value) * cameraEased);
                }
                svg.setAttribute("viewBox", view.join(" "));
                if (elapsed < duration) {
                    frame = requestAnimationFrame(step);
                } else {
                    finish();
                }
            };
            const timeout = setTimeout(finish, duration + 100);
            frame = requestAnimationFrame(step);
        });
    }

    handleError(data) {
        this.movePending = false;
        this.error = data.message;
        this.renderError();
        setTimeout(() => {
            if (!this.sessionLost && this.error === data.message) {
                this.error = null;
                this.renderError();
            }
        }, 3000);
    }

    renderError() {
        if (this.animating) {
            return;
        }
        if (this.phase === "menu") {
            const message = document.getElementById("menuError");
            if (message) {
                message.textContent = this.error || "";
                message.hidden = !this.error;
            }
            return;
        }
        const board = document.querySelector(".game-board");
        if (board) {
            board.classList.remove("animating");
            this.updateControls();
        } else {
            this.render();
        }
    }

    createGame() {
        const playerName = this.getPlayerName();
        if (playerName) {
            socket.emit("CREATE_GAME", { playerName });
        }
    }

    joinGame() {
        const playerName = this.getPlayerName();
        if (!playerName) {
            return;
        }
        const gameId = document.getElementById("gameIdInput").value.trim();
        if (!gameId) {
            this.handleError({ message: "Please enter a game ID" });
            return;
        }
        socket.emit("JOIN_GAME", { gameId, playerName });
    }

    getPlayerName() {
        if (!socket.connected) {
            this.handleError({ message: "Not connected to the server. Please try again." });
            return null;
        }
        const name = document.getElementById("playerNameInput").value.trim();
        if (!name || name.length > 40) {
            this.handleError({ message: "Enter a player name of 1 to 40 characters" });
            return null;
        }
        return name;
    }

    playerLabel(color) {
        const name = this.gameState.playerNames[color];
        const escapedName = name.replace(/[&<>"']/g, character => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[character]);
        return `${escapedName} (${color.toUpperCase()})`;
    }

    handleOpenGames(data) {
        const previousGames = this.openGames;
        this.openGames = data.games;
        if (this.phase !== "menu") {
            return;
        }
        const input = document.getElementById("gameIdInput");
        const list = document.getElementById("openGames");
        if (!input || !list) {
            return;
        }
        if (!input.value || (previousGames.includes(input.value) && !this.openGames.includes(input.value))) {
            input.value = this.openGames[0] || "";
        }
        list.replaceChildren();
        for (const gameId of this.openGames) {
            const option = document.createElement("option");
            option.value = gameId;
            option.textContent = gameId;
            list.appendChild(option);
        }
        list.size = Math.min(Math.max(this.openGames.length, 2), 5);
        list.value = input.value;
        document.getElementById("openGamesSection").hidden = this.openGames.length === 0;
        document.getElementById("createGameButton").className =
            `btn ${this.openGames.length ? "btn-secondary" : "btn-primary"}`;
        document.getElementById("joinGameButton").className =
            `btn ${this.openGames.length ? "btn-primary" : "btn-secondary"}`;
    }

    selectOpenGame() {
        document.getElementById("gameIdInput").value = document.getElementById("openGames").value;
    }

    syncOpenGameSelection() {
        document.getElementById("openGames").value = document.getElementById("gameIdInput").value.trim();
    }

    selectPiece(pieceId) {
        if (!this.canPlay() || this.gameState.phase !== "piece_selection") {
            return;
        }

        const piece = this.gameState.pieces.find((p) => p.id === pieceId);
        if (!piece || piece.player !== this.playerColor) {
            return;
        }

        this.selectedPiece = piece;
        this.highlightedDiscs.clear();
        for (const move of this.gameState.possibleMoves[piece.id] || []) {
            this.highlightedDiscs.set(`${move.q},${move.r}`, move.direction);
        }
        for (const disc of document.querySelectorAll(".game-board .disc")) {
            const { q, r } = disc.dataset;
            const isHighlighted = this.highlightedDiscs.has(`${q},${r}`);
            disc.classList.toggle("highlight-target", isHighlighted);
            disc.onclick = isHighlighted ? () => this.movePieceToDisc(Number(q), Number(r)) : null;
        }
        for (const token of document.querySelectorAll(".game-board .piece")) {
            token.classList.toggle("selected", Number(token.dataset.pieceId) === pieceId);
        }
        document.querySelector(".controls .phase-info").textContent =
            `Select a ${this.playerColor.toUpperCase()} piece or a highlighted destination.`;
    }

    canPlay() {
        return !this.sessionLost && this.phase === "playing" && this.gameState.gameState === "active" &&
            this.gameState.currentPlayer === this.playerColor && !this.movePending && !this.animating;
    }

    movePieceToDisc(q, r) {
        const key = `${q},${r}`;
        if (!this.canPlay() || !this.selectedPiece || !this.highlightedDiscs.has(key)) {
            return;
        }
        this.movePending = true;
        this.showMovePending();
        socket.emit("MOVE_PIECE", { pieceId: this.selectedPiece.id, direction: this.highlightedDiscs.get(key) });
    }

    selectDisc(q, r) {
        const key = `${q},${r}`;
        if (!this.canPlay() || this.gameState.phase !== "disc_selection" ||
            !this.gameState.possibleDiscMoves[key]) {
            return;
        }
        this.selectedDisc = { q, r };
        const destinations = this.gameState.possibleDiscMoves[key];
        for (const position of document.querySelectorAll(".disc-destination")) {
            position.classList.toggle("visible", destinations.some(
                target => target.q === Number(position.dataset.q) && target.r === Number(position.dataset.r)
            ));
        }
        document.querySelector(".controls .phase-info").textContent =
            "Select a blue-ringed disc or a dashed destination.";
    }

    moveDiscToPosition(q, r) {
        if (!this.canPlay() || this.gameState.phase !== "disc_selection" || !this.selectedDisc) {
            return;
        }
        const { q: fromQ, r: fromR } = this.selectedDisc;
        const destinations = this.gameState.possibleDiscMoves[`${fromQ},${fromR}`];
        if (!destinations.some(position => position.q === q && position.r === r)) {
            return;
        }
        this.movePending = true;
        this.showMovePending();
        socket.emit("MOVE_DISC", { fromQ, fromR, toQ: q, toR: r });
    }

    showMovePending() {
        document.querySelector(".game-board").classList.add("animating");
        this.updateControls();
    }

    renderDiscDestinations() {
        if (!this.canPlay() || this.gameState.phase !== "disc_selection") {
            return "";
        }
        const positions = new Map();
        for (const destinations of Object.values(this.gameState.possibleDiscMoves)) {
            for (const position of destinations) {
                positions.set(`${position.q},${position.r}`, position);
            }
        }
        const selected = this.selectedDisc &&
            this.gameState.possibleDiscMoves[`${this.selectedDisc.q},${this.selectedDisc.r}`];
        return Array.from(positions.values()).map(position => {
            const pos = this.hexToPixel(position.q, position.r);
            const visible = selected && selected.some(target => target.q === position.q && target.r === position.r);
            return `<circle class="disc-destination${visible ? " visible" : ""}" data-q="${position.q}" data-r="${position.r}" cx="${pos.x}" cy="${pos.y}" r="30"
                onclick="app.moveDiscToPosition(${position.q}, ${position.r})" />`;
        }).join("");
    }

    renderMenu() {
        return `
            <div class="menu">
                <h1>Nonagaonline</h1>
                <p>Abstract strategy game for 2 players</p>
                <div id="menuError" class="error-message" role="alert" hidden></div>
                
                <div class="menu-actions">
                    <input type="text" id="playerNameInput" placeholder="Enter your name"
                        aria-label="Your name" maxlength="40" />
                    <button id="createGameButton" onclick="app.createGame()" class="btn btn-primary">
                        Create Game
                    </button>
                    
                    <div class="join-section">
                        <div id="openGamesSection" class="open-games" hidden>
                            <label for="openGames">Games waiting for a player</label>
                            <select id="openGames" onchange="app.selectOpenGame()" aria-label="Games waiting for a player"></select>
                        </div>
                        <input
                            type="text"
                            placeholder="Enter game ID"
                            id="gameIdInput"
                            oninput="app.syncOpenGameSelection()"
                        />
                        <button
                            id="joinGameButton"
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
                ${this.sessionLost ? `<div class="error-message">${this.error}</div>` : ""}
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
                <p>You: <span class="color-${this.playerColor}">${this.playerLabel(this.playerColor)}</span></p>
                <p>Opponent: <span class="color-${this.playerColor === "red" ? "black" : "red"}">${this.playerLabel(this.playerColor === "red" ? "black" : "red")}</span></p>
                <p>Current turn: <span class="color-${this.gameState.currentPlayer}">${this.playerLabel(this.gameState.currentPlayer)}</span></p>
                ${
                    this.gameState.gameState === "won"
                        ? `<div class="winner-message color-${this.gameState.winner}">
                            🎉 ${this.playerLabel(this.gameState.winner)} WINS! 🎉
                        </div>`
                        : ""
                }
            </div>

            <div class="game-board ${this.boardInactive() ? "inactive" : ""}">
                ${boardSVG}
                <div class="turn-overlay"></div>
            </div>

            ${controlsHTML}
        `;
    }

    boardInactive() {
        return this.gameState.gameState === "active" &&
            (this.sessionLost || this.gameState.currentPlayer !== this.playerColor);
    }

    getBoardViewBox(state) {
        const positions = Object.values(state.board).map(disc => this.hexToPixel(disc.q, disc.r));
        if (state.gameState === "active" && state.currentPlayer === this.playerColor &&
            state.phase === "disc_selection") {
            for (const destinations of Object.values(state.possibleDiscMoves)) {
                for (const position of destinations) {
                    positions.push(this.hexToPixel(position.q, position.r));
                }
            }
        }
        const xs = positions.map(position => position.x);
        const ys = positions.map(position => position.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const width = Math.max(600, maxX - minX + 90);
        const height = Math.max(600, maxY - minY + 90);
        const left = (minX + maxX - width) / 2;
        const top = (minY + maxY - height) / 2;
        return [left, top, width, height];
    }

    renderBoardSVG() {
        let svg = `<svg width="600" height="600" viewBox="${this.getBoardViewBox(this.gameState).join(" ")}">`;
        svg += `
            <defs>
                <radialGradient id="piece-red" cx="30%" cy="22%" r="75%">
                    <stop offset="0%" stop-color="#ffb0a8" />
                    <stop offset="45%" stop-color="#e33d31" />
                    <stop offset="100%" stop-color="#811109" />
                </radialGradient>
                <radialGradient id="piece-black" cx="30%" cy="22%" r="75%">
                    <stop offset="0%" stop-color="#555" />
                    <stop offset="48%" stop-color="#181818" />
                    <stop offset="100%" stop-color="#000" />
                </radialGradient>
                <filter id="disc-shadow" x="-35%" y="-35%" width="180%" height="190%">
                    <feDropShadow dx="2" dy="4" stdDeviation="3" flood-opacity="0.35" />
                </filter>
                <filter id="piece-shadow" x="-45%" y="-45%" width="200%" height="210%">
                    <feDropShadow dx="2" dy="3" stdDeviation="2" flood-opacity="0.5" />
                </filter>
            </defs>
        `;

        // Render discs (no text inside)
        for (const [key, disc] of Object.entries(this.gameState.board)) {
            const pos = this.hexToPixel(disc.q, disc.r);
            const isOuter = disc.type === "ring2";
            const isHighlighted = this.canPlay() && this.gameState.phase === "piece_selection" &&
                this.highlightedDiscs.has(key);
            const isMovable = this.canPlay() && this.gameState.phase === "disc_selection" &&
                key in this.gameState.possibleDiscMoves;

            svg += `
                <g
                    class="disc${isHighlighted ? " highlight-target" : ""}${isMovable ? " highlight-movable" : ""}"
                    data-q="${disc.q}"
                    data-r="${disc.r}"
                    ${isHighlighted ? `onclick="app.movePieceToDisc(${disc.q}, ${disc.r})"` :
                        isMovable ? `onclick="app.selectDisc(${disc.q}, ${disc.r})"` : ""}
                >
                    <circle cx="${pos.x}" cy="${pos.y + 2}" r="27.5"
                        fill="${isOuter ? "#a5a5a5" : "#929292"}" stroke="#777" stroke-width="1" filter="url(#disc-shadow)" />
                    <circle cx="${pos.x}" cy="${pos.y - 2}" r="27.5"
                        fill="${isOuter ? "#e0e0e0" : "#d0d0d0"}" stroke="#999" stroke-width="1" />
                    <circle class="destination-ring" cx="${pos.x}" cy="${pos.y - 2}" r="24" />
                    <circle class="movable-ring" cx="${pos.x}" cy="${pos.y - 2}" r="24" />
                </g>
            `;
        }

        svg += `<g class="disc-destinations">${this.renderDiscDestinations()}</g>`;

        // Render pieces
        for (const piece of this.gameState.pieces) {
            const pos = this.hexToPixel(piece.q, piece.r);
            const isSelected = this.selectedPiece && this.selectedPiece.id === piece.id;
            const isWinner = this.gameState.gameState === "won" && piece.player === this.gameState.winner;
            const canSelect = piece.player === this.playerColor && 
                             this.canPlay() && this.gameState.phase === "piece_selection";

            const fillColor = `url(#piece-${piece.player})`;
            let className = `piece piece-${piece.player}`;
            if (!canSelect && this.gameState.gameState !== "won") {
                className += " disabled";
            }
            if (isSelected) {
                className += " selected";
            }

            svg += `
                ${isWinner ? `<circle class="winner-ring" cx="${pos.x}" cy="${pos.y - 2}" r="25" />` : ""}
                <circle
                    cx="${pos.x}"
                    cy="${pos.y - 2}"
                    r="20"
                    fill="${fillColor}"
                    stroke="#333"
                    stroke-width="2"
                    filter="url(#piece-shadow)"
                    class="${className}"
                    data-piece-id="${piece.id}"
                    ${canSelect ? `onclick="app.selectPiece(${piece.id})"` : ""}
                    style="cursor: ${canSelect ? 'pointer' : 'not-allowed'}"
                />
            `;
        }

        svg += "</svg>";
        return svg;
    }

    renderControls() {
        let html = '<div class="controls">';

        if (this.error) {
            html += `<div class="error-message">${this.error}</div>`;
        }

        if (this.gameState.gameState !== "active") {
            html += '<p>Game over.</p><button class="btn btn-primary" onclick="window.location.reload()">New Game</button>';
        } else if (this.movePending) {
            html += "<p>Submitting move...</p>";
        } else if (this.gameState.currentPlayer !== this.playerColor) {
            html += `<p>⏳ Waiting for ${this.playerLabel(this.gameState.currentPlayer)}'s move...</p>`;
        } else if (this.gameState.phase === "disc_selection") {
            html += `<div class="phase-info">Select a blue-ringed disc${this.selectedDisc ? " or a dashed destination" : ""}.</div>`;
        } else {
            html += `<div class="phase-info">Select a ${this.playerColor.toUpperCase()} piece${this.selectedPiece ? " or a highlighted destination" : ""}.</div>`;
        }

        html += "</div>";
        return html;
    }

    updateControls() {
        const template = document.createElement("template");
        template.innerHTML = this.renderControls();
        document.querySelector(".controls").replaceWith(template.content.firstElementChild);
    }

    render(fadeIn = false) {
        if (this.animating) {
            return;
        }
        const app = document.getElementById("app");
        const existingBoard = app.querySelector(".game-board");
        if (existingBoard && (this.phase === "playing" || this.phase === "finished")) {
            const template = document.createElement("template");
            template.innerHTML = this.renderBoard();
            const updatedBoard = template.content.querySelector(".game-board");
            const oldSvg = existingBoard.querySelector("svg");
            const newSvg = updatedBoard.querySelector("svg");
            if (fadeIn) {
                newSvg.classList.add("visuals-enter");
                for (const piece of newSvg.querySelectorAll(".piece")) {
                    const previous = oldSvg.querySelector(`.piece[data-piece-id="${piece.dataset.pieceId}"]`);
                    if (previous) {
                        piece.style.opacity = getComputedStyle(previous).opacity;
                    }
                }
            }
            oldSvg.replaceWith(newSvg);
            if (fadeIn) {
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    newSvg.classList.remove("visuals-enter");
                    newSvg.querySelectorAll(".piece").forEach(piece => { piece.style.opacity = ""; });
                }));
            }
            existingBoard.classList.toggle("inactive", this.boardInactive());
            existingBoard.classList.remove("animating");
            app.querySelector(".game-info").replaceWith(template.content.querySelector(".game-info"));
            app.querySelector(".controls").replaceWith(template.content.querySelector(".controls"));
            return;
        }

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
        if (this.phase === "menu") {
            this.handleOpenGames({ games: this.openGames });
            this.renderError();
        }
    }
}

const app = new GameApp();
