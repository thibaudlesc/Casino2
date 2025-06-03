// chicken.js

// Variables globales spécifiques au jeu du poulet
let chickenGrid = [];
let chickenBet = 0;
let numBones = 0;
let chickensFound = 0;
let currentMultiplier = 1.00;
let chickenGameActive = false; // Indique si une partie est en cours

// Constantes pour le jeu
const GRID_SIZE = 25; // 5x5 grid
const NUM_ROWS_CHICKEN = 5;
const NUM_COLS_CHICKEN = 5;
const SYMBOL_CHICKEN = '🍗';
const SYMBOL_BONE = '🦴';
const SYMBOL_QUESTION = ''; // Le point d'interrogation est géré par CSS ::before

// Multiplicateurs (RETIREZ L'OBJET MULTIPLIERS PRÉCÉDENT ICI)
// const MULTIPLIERS = { ... }; // Cette section est maintenant obsolète.

// Fonction pour démarrer la configuration du jeu du poulet
function startChickenGame() {
    currentGame = 'chicken';
    chickenGameActive = false;
    chickenBet = 0;
    chickensFound = 0;
    currentMultiplier = 1.00;

    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <h2>🐔 JEU DU POULET 🦴</h2>
        <p>Solde : <span id="current-balance">${balance}</span> €</p>

        <div id="chicken-game-container">
            <div class="chicken-controls">
                <div>
                    <label for="chicken-bet-amount">Mise : </label>
                    <input type="number" id="chicken-bet-amount" value="10" min="1" step="1">
                </div>
                <div>
                    <label for="chicken-bones-input">Os : </label>
                    <input type="number" id="chicken-bones-input" value="3" min="1" max="24">
                </div>
                <button id="chicken-play-button" class="game-button">Jouer</button>
            </div>

            <p id="chicken-current-multiplier">Multiplicateur Actuel : x1.00</p>
            <p id="chicken-potential-win">Gain Potentiel : 0.00 €</p>
            
            <div id="chicken-grid"></div>

            <button id="chicken-cashout-button" class="game-button" disabled>Encaisser</button>
            <p id="chicken-message" class="chicken-message">Choisissez votre mise et le nombre d'os, puis cliquez sur Jouer !</p>
        </div>
        <button onclick="showMainMenu()" class="game-button">Retour au Menu</button>
    `;

    document.getElementById('chicken-play-button').addEventListener('click', initializeChickenGame);
    document.getElementById('chicken-cashout-button').addEventListener('click', cashOutChicken);

    updateBalanceDisplay();
    renderChickenGrid();
    updateChickenDisplay();
}

// Fonction pour initialiser une nouvelle partie
function initializeChickenGame() {
    if (chickenGameActive) return; // Empêche de démarrer une nouvelle partie si une est déjà en cours

    chickenBet = parseFloat(document.getElementById('chicken-bet-amount').value);
    numBones = parseInt(document.getElementById('chicken-bones-input').value);

    if (isNaN(chickenBet) || chickenBet <= 0 || chickenBet > balance) {
        document.getElementById('chicken-message').textContent = "Mise invalide. Veuillez entrer un montant valide.";
        return;
    }
    if (isNaN(numBones) || numBones < 1 || numBones > 24 || numBones >= GRID_SIZE) {
        document.getElementById('chicken-message').textContent = "Nombre d'os invalide (entre 1 et 24).";
        return;
    }

    balance -= chickenBet;
    updateBalanceDisplay();

    chickenGameActive = true;
    chickensFound = 0;
    currentMultiplier = 1.00;
    document.getElementById('chicken-message').textContent = "Cliquez sur une case !";

    document.getElementById('chicken-bet-amount').disabled = true;
    document.getElementById('chicken-bones-input').disabled = true;
    document.getElementById('chicken-play-button').disabled = true;
    document.getElementById('chicken-cashout-button').disabled = true; // Disabled until first chicken found

    setupChickenGrid();
    updateChickenDisplay();
}

// Configure la grille avec poulets et os
function setupChickenGrid() {
    chickenGrid = [];
    const bonePositions = new Set();
    while (bonePositions.size < numBones) {
        bonePositions.add(Math.floor(Math.random() * GRID_SIZE));
    }

    const gridElement = document.getElementById('chicken-grid');
    gridElement.innerHTML = ''; // Nettoyer la grille existante

    for (let i = 0; i < GRID_SIZE; i++) {
        const cellElement = document.createElement('div');
        cellElement.classList.add('chicken-cell', 'unrevealed');
        
        const cellData = {
            index: i,
            hasChicken: !bonePositions.has(i),
            revealed: false,
            element: cellElement
        };
        chickenGrid.push(cellData);

        cellElement.addEventListener('click', () => handleChickenCellClick(cellData));
        gridElement.appendChild(cellElement);
    }
}

// Gère le clic sur une case
function handleChickenCellClick(cellData) {
    if (!chickenGameActive || cellData.revealed) {
        return;
    }

    cellData.revealed = true;
    cellData.element.classList.remove('unrevealed');
    cellData.element.classList.add('revealed');
    cellData.element.removeEventListener('click', handleChickenCellClick); // Empêche les clics multiples

    if (cellData.hasChicken) {
        chickensFound++;
        cellData.element.classList.add('chicken');
        cellData.element.innerHTML = `<span>${SYMBOL_CHICKEN}</span>`;
        updateChickenMultiplier();
        document.getElementById('chicken-cashout-button').disabled = false; // Enable cashout
        document.getElementById('chicken-message').textContent = "Poulet trouvé ! Continuez ou encaissez.";
    } else {
        cellData.element.classList.add('bone');
        cellData.element.innerHTML = `<span>${SYMBOL_BONE}</span>`;
        document.getElementById('chicken-message').textContent = "Vous avez frappé un os ! Vous perdez tout.";
        document.getElementById('chicken-message').classList.add('loss-text');
        endChickenGame(0); // Player loses
    }
}

// Met à jour le multiplicateur et le gain potentiel
function updateChickenMultiplier() {
    // Logic for multiplier calculation (simplified example)
    // This is where you would implement a more complex multiplier table
    // For demonstration, a simple linear progression or a small base + per-chicken increase
    if (chickensFound === 0) {
        currentMultiplier = 1.00;
    } else {
        // A simple example: multiplier increases faster with more bones
        // You would define a more robust multiplier table here
        // Example: base multiplier + (chickensFound * bone_factor)
        const baseIncrease = 0.1; // Base increase per chicken
        const boneFactor = 0.05;  // Additional increase per bone
        currentMultiplier = 1.00 + (chickensFound * baseIncrease) + (chickensFound * numBones * boneFactor);
        currentMultiplier = parseFloat(currentMultiplier.toFixed(2)); // Keep it clean
    }

    updateChickenDisplay();
}

// Met à jour l'affichage des informations du jeu
function updateChickenDisplay() {
    const potentialWin = chickenBet * currentMultiplier;
    document.getElementById('chicken-current-multiplier').textContent = `Multiplicateur Actuel : x${currentMultiplier.toFixed(2)}`;
    document.getElementById('chicken-potential-win').textContent = `Gain Potentiel : ${potentialWin.toFixed(2)} €`;
}

// Fonction pour encaisser les gains
function cashOutChicken() {
    if (!chickenGameActive) return;

    const winnings = chickenBet * currentMultiplier;
    balance += winnings;
    updateBalanceDisplay();
    document.getElementById('chicken-message').textContent = `Encaissé ! Vous avez gagné ${winnings.toFixed(2)} € !`;
    document.getElementById('chicken-message').classList.add('chicken-win-text');
    showFloatingWinNumbers(winnings, document.getElementById('chicken-game-container'));
    endChickenGame(winnings);
}

// Termine la partie de chicken
function endChickenGame(winnings) {
    chickenGameActive = false;
    document.getElementById('chicken-play-button').disabled = false;
    document.getElementById('chicken-cashout-button').disabled = true; // Disabled here after the game ends
    document.getElementById('chicken-bet-amount').disabled = false;
    document.getElementById('chicken-bones-input').disabled = false;

    // Révéler toutes les cases restantes
    chickenGrid.forEach(cellData => {
        if (!cellData.revealed) {
            cellData.element.classList.add('revealed');
            cellData.element.classList.remove('unrevealed');

            if (cellData.hasChicken) {
                cellData.element.classList.add('chicken');
                cellData.element.innerHTML = `<span>${SYMBOL_CHICKEN}</span>`;
            } else {
                cellData.element.classList.add('bone');
                cellData.element.innerHTML = `<span>${SYMBOL_BONE}</span>`;
            }
        }
        cellData.element.removeEventListener('click', handleChickenCellClick);
        cellData.element.classList.add('disabled');
    });

    if (winnings > 0) {
        setTimeout(() => {
            document.getElementById('chicken-message').classList.remove('chicken-win-text');
        }, 1500);
    } else { // If it was a loss (winnings === 0)
         setTimeout(() => {
            document.getElementById('chicken-message').classList.remove('loss-text');
        }, 1500);
    }
}

// Initial render of an empty grid when the game is first loaded
function renderChickenGrid() {
    const gridElement = document.getElementById('chicken-grid');
    gridElement.innerHTML = '';
    for (let i = 0; i < GRID_SIZE; i++) {
        const cellElement = document.createElement('div');
        cellElement.classList.add('chicken-cell', 'disabled'); // Initially disabled and unclickable
        gridElement.appendChild(cellElement);
    }
}