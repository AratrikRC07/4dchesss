const boardElement = document.getElementById('board');
const turnElement = document.getElementById('turn');
const messageElement = document.getElementById('message');
const historyList = document.getElementById('history-list');
const loginContainer = document.getElementById('login-container');
const gameContainer = document.getElementById('game-container');
const joinGameButton = document.getElementById('join-game');
const playerNameInput = document.getElementById('player-name');
const newGameButton = document.getElementById('new-game');

const ws = new WebSocket('ws://localhost:3000');
let draggedCharacter = null;

// Join game event
joinGameButton.addEventListener('click', () => {
    const playerName = playerNameInput.value;
    if (playerName) {
        ws.send(JSON.stringify({ type: 'join', playerName }));
        loginContainer.style.display = 'none';
        gameContainer.style.display = 'block';  // Show game container after joining
    }
});

// Start a new game
newGameButton.addEventListener('click', () => {
    ws.send(JSON.stringify({ type: 'startGame' }));
    messageElement.textContent = 'New game started!';
    historyList.innerHTML = ''; // Clear move history
});

// Update the game board based on server data
function updateBoard(grid) {
    boardElement.innerHTML = '';
    grid.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const cellElement = document.createElement('div');
            cellElement.textContent = cell ? cell : '';
            cellElement.className = cell ? 'occupied' : 'empty';
            cellElement.dataset.row = rowIndex;
            cellElement.dataset.col = colIndex;

            if (cell) {
                const charElement = document.createElement('div');
                charElement.textContent = cell;
                charElement.className = 'character';
                charElement.dataset.row = rowIndex;
                charElement.dataset.col = colIndex;
                cellElement.appendChild(charElement);

                // Make characters draggable
                interact(charElement)
                    .draggable({
                        listeners: {
                            start (event) {
                                draggedCharacter = event.target;
                            },
                            move (event) {
                                const x = (parseFloat(event.target.getAttribute('data-x')) || 0) + event.dx;
                                const y = (parseFloat(event.target.getAttribute('data-y')) || 0) + event.dy;

                                event.target.style.transform = `translate(${x}px, ${y}px)`;
                                event.target.setAttribute('data-x', x);
                                event.target.setAttribute('data-y', y);
                            },
                            end (event) {
                                const x = parseFloat(event.target.getAttribute('data-x')) || 0;
                                const y = parseFloat(event.target.getAttribute('data-y')) || 0;

                                // Calculate the new position based on drag
                                const newRow = Math.round(y / 50); // Adjust 50 based on cell size
                                const newCol = Math.round(x / 50); // Adjust 50 based on cell size

                                // Validate and make the move
                                makeMove(draggedCharacter.dataset.row, draggedCharacter.dataset.col, newRow, newCol);
                            }
                        }
                    });
            }
            boardElement.appendChild(cellElement);
        });
    });
}

// Add move to history
function addMoveToHistory(player, charName, move) {
    const historyItem = document.createElement('li');
    historyItem.textContent = `Player ${player} moved ${charName} to ${move}`;
    historyList.appendChild(historyItem);
}

// Make a move based on character drag
function makeMove(oldRow, oldCol, newRow, newCol) {
    const player = turnElement.textContent.includes('A') ? 'A' : 'B';  // Determine current player
    const charName = draggedCharacter.textContent;

    // Create move command based on direction
    const move = determineMoveDirection(oldRow, oldCol, newRow, newCol);

    if (charName && move) {
        ws.send(JSON.stringify({ type: 'move', player, charName, move }));
        draggedCharacter = null; // Reset dragged character
    }
}

// Determine move direction
function determineMoveDirection(oldRow, oldCol, newRow, newCol) {
    const rowDiff = newRow - oldRow;
    const colDiff = newCol - oldCol;

    if (rowDiff === 0 && colDiff === -1) return 'L';
    if (rowDiff === 0 && colDiff === 1) return 'R';
    if (rowDiff === -1 && colDiff === 0) return 'F';
    if (rowDiff === 1 && colDiff === 0) return 'B';
    if (rowDiff === -1 && colDiff === -1) return 'FL';
    if (rowDiff === -1 && colDiff === 1) return 'FR';
    if (rowDiff === 1 && colDiff === -1) return 'BL';
    if (rowDiff === 1 && colDiff === 1) return 'BR';

    return null; // Invalid move
}

// WebSocket event handlers
ws.onopen = () => {
    console.log('Connected to the server');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'init' || data.type === 'update') {
        updateBoard(data.state.grid);
        turnElement.textContent = `Current Turn: Player ${data.state.turn}`;
        messageElement.textContent = '';
    } else if (data.type === 'move') {
        addMoveToHistory(data.player, data.charName, data.move);
        messageElement.textContent = '';
    } else if (data.type === 'error') {
        messageElement.textContent = data.message;
    } else if (data.type === 'gameOver') {
        alert(`Game Over! Player ${data.winner} wins!`);
        ws.close();
    }
};

ws.onclose = () => {
    console.log('Disconnected from the server');
};

// Ensure all sockets and elements are properly initialized
document.addEventListener('DOMContentLoaded', () => {
    boardElement.style.display = 'grid';
    gameContainer.style.display = 'none';
    loginContainer.style.display = 'block';
});
