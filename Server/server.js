const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const Game = require('./gameLogic');

// Initialize HTTP server and WebSocket server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let game = new Game();
let players = {}; // To track player connections and their names
let playerCount = 0; // Track the number of connected players

// Serve the client files
app.use(express.static('client'));

// Function to broadcast messages to all connected clients
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

wss.on('connection', (ws) => {
    console.log('A new player connected.');
    
    if (playerCount >= 2) {
        ws.send(JSON.stringify({ type: 'error', message: 'Game room is full. Please try again later.' }));
        ws.close();
        return;
    }

    // Assign the player an identifier (A or B)
    const player = playerCount === 0 ? 'A' : 'B';
    playerCount++;
    players[player] = ws;

    // Notify the new player of their assigned role
    ws.send(JSON.stringify({ type: 'init', player }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'join') {
            const { playerName } = data;
            console.log(`Player ${player} joined as ${playerName}`);
            players[player] = { ws, name: playerName };

            // Send the current game state to the player
            ws.send(JSON.stringify({ type: 'init', state: game.getGameState() }));
        }

        if (data.type === 'start') {
            const { playerACharacters, playerBCharacters } = data;
            game.initializeGame(playerACharacters, playerBCharacters);

            // Broadcast the initial game state to all clients
            broadcast({ type: 'update', state: game.getGameState() });
        }

        if (data.type === 'move') {
            const { player, charName, move } = data;
            const result = game.makeMove(player, charName, move);

            if (result.error) {
                ws.send(JSON.stringify({ type: 'error', message: result.error }));
            } else {
                // Broadcast the updated game state to all clients
                const gameState = game.getGameState();
                broadcast({ type: 'update', state: gameState });

                if (result.gameOver) {
                    // Notify all clients of game over
                    broadcast({ type: 'gameOver', winner: game.getWinner() });
                }
            }
        }

        if (data.type === 'newGame') {
            game = new Game();
            game.initializeGame();
            broadcast({ type: 'init', state: game.getGameState() });
        }
    });

    ws.on('close', () => {
        console.log('A player disconnected.');
        playerCount--;
        delete players[player];

        if (playerCount === 0) {
            game = new Game(); // Reset game when both players disconnect
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
