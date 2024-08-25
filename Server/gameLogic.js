class Game {
    constructor() {
        this.gridSize = 5;
        this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(null));
        this.players = { A: [], B: [] };  // Store characters and their positions for both players
        this.turn = 'A';  // Player 'A' starts
    }

    initializeGame(playerACharacters = ['P1', 'P2', 'H1', 'H2', 'H3'], playerBCharacters = ['P1', 'P2', 'H1', 'H2', 'H3']) {
        // Initialize game with given characters for both players
        this.placeInitialCharacters('A', 0, playerACharacters);
        this.placeInitialCharacters('B', this.gridSize - 1, playerBCharacters);
    }

    placeInitialCharacters(player, row, characters) {
        // Place initial characters on the board for a given player
        characters.forEach((char, index) => {
            this.grid[row][index] = `${player}-${char}`;
            this.players[player].push({ name: char, position: [row, index] });
        });
    }

    isValidMove(player, charName, move) {
        // Validate move for a given character
        const char = this.players[player].find(c => c.name === charName);
        if (!char) return { error: 'Character not found.' };

        const [row, col] = char.position;
        let newRow = row, newCol = col;

        switch (move) {
            case 'L': newCol -= 1; break;    // Move left
            case 'R': newCol += 1; break;    // Move right
            case 'F': newRow -= 1; break;    // Move forward (up for player 'A')
            case 'B': newRow += 1; break;    // Move backward (down for player 'A')
            case 'FL': newRow -= 1; newCol -= 1; break;  // Move forward left
            case 'FR': newRow -= 1; newCol += 1; break;  // Move forward right
            case 'BL': newRow += 1; newCol -= 1; break;  // Move backward left
            case 'BR': newRow += 1; newCol += 1; break;  // Move backward right
            default: return { error: 'Invalid move direction.' };
        }

        // Check if the move is within bounds
        if (newRow < 0 || newRow >= this.gridSize || newCol < 0 || newCol >= this.gridSize) {
            return { error: 'Move out of bounds.' };
        }

        // Check if the destination cell is occupied by a friendly character
        const targetCell = this.grid[newRow][newCol];
        if (targetCell && targetCell.startsWith(player)) {
            return { error: 'Cannot move to a cell occupied by a friendly character.' };
        }

        return { newRow, newCol };  // Valid move
    }

    makeMove(player, charName, move) {
        // Execute a player's move
        const validation = this.isValidMove(player, charName, move);
        if (validation.error) return { error: validation.error };

        const { newRow, newCol } = validation;

        // Find the character and update its position
        const char = this.players[player].find(c => c.name === charName);
        this.grid[char.position[0]][char.position[1]] = null;  // Clear old position
        char.position = [newRow, newCol];
        this.grid[newRow][newCol] = `${player}-${charName}`;  // Set new position

        // Handle combat: Remove opponent's character if present
        const opponent = player === 'A' ? 'B' : 'A';
        const opponentChar = this.players[opponent].find(c => c.position[0] === newRow && c.position[1] === newCol);
        if (opponentChar) {
            this.players[opponent] = this.players[opponent].filter(c => c !== opponentChar);
        }

        // Switch turns
        this.turn = opponent;

        return { success: true, gameOver: this.isGameOver() };
    }

    isGameOver() {
        // Check if the game is over (all characters of a player are eliminated)
        return this.players['A'].length === 0 || this.players['B'].length === 0;
    }

    getWinner() {
        // Return the winner of the game
        if (this.players['A'].length === 0) return 'B';
        if (this.players['B'].length === 0) return 'A';
        return null;
    }

    getGameState() {
        // Get the current game state for broadcasting to clients
        return { grid: this.grid, turn: this.turn };
    }
}

module.exports = Game;
