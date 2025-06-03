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
            <div id="chicken-grid">
            </div>

            <div id="chicken-stats">
                <p>Multiplicateur actuel : x<span id="chicken-current-multiplier">${currentMultiplier.toFixed(2)}</span></p>
                <p>Gain potentiel : <span id="chicken-potential-win">0.00</span> €</p>
            </div>

            <div id="chicken-controls">
                <div class="chicken-input-group">
                    <label for="chicken-bet-amount">Mise (€):</label>
                    <input type="number" id="chicken-bet-amount" value="10" min="1" step="1">
                    <label for="chicken-bones-input">Os (1-24):</label>
                    <input type="number" id="chicken-bones-input" value="3" min="1" max="24" step="1">
                </div>
                <button id="chicken-play-button" class="game-button">JOUER</button>
                <button id="chicken-cashout-button" class="game-button" disabled>ENCAISSER</button>
            </div>
            <p id="chicken-message" class="chicken-message">Choisissez votre mise et le nombre d'os, puis jouez !</p>
            <button onclick="showMainMenu()" class="back-button">Retour au Menu</button>
        </div>
    `;

    updateBalanceDisplay();
    setupChickenEventListeners();
    renderChickenGrid(true); // Render grid as disabled initially
}

// Configuration des écouteurs d'événements
function setupChickenEventListeners() {
    document.getElementById('chicken-play-button').addEventListener('click', startNewChickenGame);
    document.getElementById('chicken-cashout-button').addEventListener('click', cashOutChickenGame);
    document.getElementById('chicken-bet-amount').addEventListener('input', updateChickenPotentialWinDisplay);
    document.getElementById('chicken-bones-input').addEventListener('input', updateChickenPotentialWinDisplay);
}

// Rend la grille du jeu (initiale ou après un reset)
function renderChickenGrid(disabled = false) {
    const gridContainer = document.getElementById('chicken-grid');
    gridContainer.innerHTML = ''; // Clear existing cells
    chickenGrid = [];

    for (let i = 0; i < GRID_SIZE; i++) {
        const cell = document.createElement('div');
        cell.classList.add('chicken-cell');
        cell.dataset.index = i;
        if (disabled) {
            cell.classList.add('disabled');
        } else {
            cell.addEventListener('click', handleChickenCellClick);
        }
        cell.classList.add('unrevealed');
        gridContainer.appendChild(cell);
        chickenGrid.push({ index: i, hasChicken: false, revealed: false, element: cell });
    }
}

// Fonction pour démarrer une nouvelle partie de Chicken
function startNewChickenGame() {
    chickenBet = parseFloat(document.getElementById('chicken-bet-amount').value);
    numBones = parseInt(document.getElementById('chicken-bones-input').value);

    // Validation des entrées
    if (isNaN(chickenBet) || chickenBet <= 0 || chickenBet > balance) {
        document.getElementById('chicken-message').textContent = "Mise invalide. Assurez-vous d'avoir suffisamment de fonds.";
        document.getElementById('chicken-message').classList.add('error-text');
        return;
    }
    if (isNaN(numBones) || numBones < 1 || numBones > GRID_SIZE - 1) { // Min 1 os, Max GRIS_SIZE - 1 os (pour avoir au moins 1 poulet)
        document.getElementById('chicken-message').textContent = "Nombre d'os invalide (entre 1 et 24).";
        document.getElementById('chicken-message').classList.add('error-text');
        return;
    }

    // Réinitialiser les messages d'erreur
    document.getElementById('chicken-message').classList.remove('error-text');

    balance -= chickenBet;
    updateBalanceDisplay();

    chickensFound = 0;
    currentMultiplier = 1.00; // Reset initial multiplier for calculation
    chickenGameActive = true;

    document.getElementById('chicken-message').textContent = "Cliquez sur une case pour révéler !";
    document.getElementById('chicken-play-button').disabled = true;
    document.getElementById('chicken-cashout-button').disabled = true; // Pas de cashout avant le premier poulet
    document.getElementById('chicken-bet-amount').disabled = true;
    document.getElementById('chicken-bones-input').disabled = true;

    renderChickenGrid(false); // Enable cells for clicking

    // Placer les os et les poulets
    const boneIndices = new Set();
    while (boneIndices.size < numBones) {
        boneIndices.add(Math.floor(Math.random() * GRID_SIZE));
    }

    chickenGrid.forEach((cellData, index) => {
        cellData.hasBone = boneIndices.has(index);
        cellData.hasChicken = !boneIndices.has(index); // Le reste sont des poulets
        cellData.revealed = false;
        cellData.element.innerHTML = ''; // Clear symbols from previous game
        cellData.element.classList.remove('chicken', 'bone', 'revealed', 'disabled');
        cellData.element.classList.add('unrevealed');
        cellData.element.addEventListener('click', handleChickenCellClick); // Re-add listener if removed
    });

    updateChickenPotentialWinDisplay(); // Initial display of potential win
}

// Gère le clic sur une cellule
function handleChickenCellClick(event) {
    if (!chickenGameActive) return;

    const cellElement = event.currentTarget;
    const index = parseInt(cellElement.dataset.index);
    const cellData = chickenGrid[index];

    if (cellData.revealed) return; // Already revealed

    cellData.revealed = true;
    cellElement.classList.add('revealed');
    cellElement.classList.remove('unrevealed');

    if (cellData.hasBone) {
        cellElement.classList.add('bone');
        cellElement.innerHTML = `<span>${SYMBOL_BONE}</span>`;
        document.getElementById('chicken-message').textContent = "Vous avez trouvé un OS ! Vous perdez votre mise.";
        document.getElementById('chicken-message').classList.add('error-text');
        endChickenGame(0); // Player loses
    } else {
        cellElement.classList.add('chicken');
        cellElement.innerHTML = `<span>${SYMBOL_CHICKEN}</span>`;
        chickensFound++;
        document.getElementById('chicken-message').classList.remove('error-text');

        // Calculer le nouveau multiplicateur basé sur la nouvelle logique
        currentMultiplier = calculateChickenMultiplier(chickensFound, numBones);

        document.getElementById('chicken-current-multiplier').textContent = currentMultiplier.toFixed(2);
        updateChickenPotentialWinDisplay();

        document.getElementById('chicken-message').textContent = `Poulet trouvé ! Continuez ou encaissez.`;
        document.getElementById('chicken-cashout-button').disabled = false; // Enable cashout after first chicken

        // Check if all chickens are found (game won)
        if (chickensFound === (GRID_SIZE - numBones)) {
            document.getElementById('chicken-message').textContent = `Félicitations ! Vous avez trouvé tous les poulets !`;
            document.getElementById('chicken-message').classList.add('chicken-win-text');
            endChickenGame(chickenBet * currentMultiplier);
        }
    }

    // Disable clicks on all cells if game is over (this was causing the issue with cashout)
    // Removed this block, as endChickenGame already handles disabling cells and cashout.
}

/**
 * Calcule le multiplicateur basé sur le nombre de poulets trouvés et le nombre d'os.
 * Le multiplicateur augmente à chaque poulet trouvé, et plus il y a d'os, plus la progression est forte.
 * @param {number} chickensFound - Nombre de poulets trouvés jusqu'à présent dans la partie.
 * @param {number} numBones - Nombre total d'os sur la grille.
 * @returns {number} Le multiplicateur cumulé.
 */
function calculateChickenMultiplier(chickensFound, numBones) {
    // Si aucun poulet trouvé, le multiplicateur est 1
    if (chickensFound === 0) {
        return 1.00;
    }

    let multiplier = 1.00;
    const totalChickensInitial = GRID_SIZE - numBones; // Nombre total de poulets sur la grille

    // Pour chaque poulet déjà trouvé, on calcule le multiplicateur pour ce "clic" spécifique
    // et on le multiplie avec le multiplicateur cumulé.
    for (let i = 1; i <= chickensFound; i++) {
        // Nombre de poulets restants à trouver avant ce clic
        const chickensRemaining = totalChickensInitial - (i - 1);
        // Nombre de cases non encore révélées avant ce clic
        const unrevealedCells = GRID_SIZE - (i - 1); // i-1 est le nombre de clics précédents (poulets trouvés)

        // La probabilité de trouver un poulet à ce "i-ème" clic
        const probabilityOfFindingChicken = chickensRemaining / unrevealedCells;

        // Le multiplicateur pour ce clic est inversement proportionnel à cette probabilité.
        // On ajoute un facteur d'amplification (par exemple, 0.98 ou 0.95) pour équilibrer
        // et rendre le jeu plus intéressant, surtout avec beaucoup d'os.
        // Plus le facteur est proche de 1, plus les gains sont élevés.
        const amplificationFactor = 0.96; // Ajustez cette valeur pour contrôler la force des multiplicateurs
                                         // Une valeur plus petite (ex: 0.90) rend les multiplicateurs plus faibles
                                         // Une valeur plus grande (ex: 0.99) les rend plus forts

        let clickMultiplier = 1 / probabilityOfFindingChicken * amplificationFactor;

        // Appliquer un plancher pour éviter des multiplicateurs trop petits au début
        // Ou un plafond si les gains sont trop élevés.
        clickMultiplier = Math.max(clickMultiplier, 1.02); // Chaque clic doit au moins donner un petit gain

        multiplier *= clickMultiplier;
    }

    return multiplier;
}

// Met à jour l'affichage du gain potentiel
function updateChickenPotentialWinDisplay() {
    const potentialWin = chickenBet * currentMultiplier;
    document.getElementById('chicken-potential-win').textContent = potentialWin.toFixed(2);
}

// Fonction pour encaisser les gains
function cashOutChickenGame() {
    if (!chickenGameActive || chickensFound === 0) {
        document.getElementById('chicken-message').textContent = "Vous devez trouver au moins un poulet pour encaisser.";
        return;
    }

    const winnings = chickenBet * currentMultiplier;
    balance += winnings;
    updateBalanceDisplay();
    // showFloatingWinNumbers(winnings, document.getElementById('chicken-game-container')); // Ensure this function is defined globally (e.g., in main.js)
    document.getElementById('chicken-message').textContent = `Vous encaissez ${winnings.toFixed(2)} € !`;
    document.getElementById('chicken-message').classList.add('chicken-win-text');
    endChickenGame(winnings); // This will disable the cashout button
}

// Termine la partie de Chicken
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
            document.getElementById('chicken-message').classList.remove('error-text');
        }, 1500);
    }
}