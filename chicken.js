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

// Fixed bet amounts for the Chicken game
const BET_AMOUNTS_CHICKEN = [100, 250, 500, 1000, 2000, 7500, 10000, 25000, 50000, 75000, 100000, 200000];


// Fonction pour démarrer la configuration du jeu du poulet
function initChickenGame() {
    currentGame = 'chicken';
    chickenGameActive = false;
    chickenBet = 0;
    chickensFound = 0;
    currentMultiplier = 1.00;

    // Populate the bet select options
    const betSelect = document.getElementById('chicken-bet-select');
    betSelect.innerHTML = BET_AMOUNTS_CHICKEN.map(amount =>  
        `<option value="${amount}">${amount >= 10000 ? (amount / 1000) + 'k' : amount}€</option>`
    ).join('');

    document.getElementById('chicken-play-button').addEventListener('click', initializeChickenGame);
    document.getElementById('chicken-cashout-button').addEventListener('click', cashOutChicken);

    // Set default bet amount to the first value in the array
    betSelect.value = BET_AMOUNTS_CHICKEN[0];

    updateBalanceDisplay(firebaseService.getUserBalance()); // Update balance display from firebaseService
    renderChickenGrid(); // Initial render with disabled cells
    updateChickenDisplay(); // Update display for initial state
}


// Fonction pour initialiser une nouvelle partie
async function initializeChickenGame() {
    if (chickenGameActive) return;

    chickenBet = parseFloat(document.getElementById('chicken-bet-select').value); // Get value from select
    numBones = parseInt(document.getElementById('chicken-bones-input').value);
    const currentBalance = firebaseService.getUserBalance();

    if (isNaN(chickenBet) || chickenBet <= 0 || chickenBet > currentBalance) {
        document.getElementById('chicken-message').textContent = "Mise invalide. Veuillez entrer un montant valide.";
        return;
    }
    if (isNaN(numBones) || numBones < 1 || numBones > 24) {
        document.getElementById('chicken-message').textContent = "Nombre d'os invalide (entre 1 et 24).";
        return;
    }
    if (numBones >= GRID_SIZE) { // Assurez-vous qu'il y a toujours au moins 1 poulet possible
        document.getElementById('chicken-message').textContent = "Le nombre d'os ne peut pas être égal ou supérieur à la taille de la grille.";
        return;
    }

    await firebaseService.saveUserBalance(currentBalance - chickenBet); // Deduct bet
    
    chickenGameActive = true;
    chickensFound = 0;
    currentMultiplier = 1.00; // Reset multiplier for new game
    document.getElementById('chicken-message').textContent = "Cliquez sur une case !";
    document.getElementById('chicken-message').classList.remove('chicken-win-text', 'loss-text');


    document.getElementById('chicken-bet-select').disabled = true; // Disable select
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

        // N'ajouter l'écouteur que si la case n'est pas révélée et le jeu est actif
        cellElement.addEventListener('click', () => handleChickenCellClick(cellData));
        gridElement.appendChild(cellElement);
    }
}

// Gère le clic sur une case
async function handleChickenCellClick(cellData) {
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
        showFloatingWinNumbers(-chickenBet, document.getElementById('chicken-game-area')); // Show loss animation
        endChickenGame(0); // Player loses
    }
}


// Met à jour l'affichage des informations du jeu
function updateChickenDisplay() {
    const potentialWin = chickenBet * currentMultiplier;
    document.getElementById('chicken-current-multiplier').textContent = `Multiplicateur Actuel : x${currentMultiplier.toFixed(2)}`;
    document.getElementById('chicken-potential-win').textContent = `Gain Potentiel : ${potentialWin.toFixed(2)} €`;
}

// Fonction pour encaisser les gains
async function cashOutChicken() {
    if (!chickenGameActive) return;

    const winnings = chickenBet * currentMultiplier;
    await firebaseService.saveUserBalance(firebaseService.getUserBalance() + winnings); // Add winnings to balance
    document.getElementById('chicken-message').textContent = `Encaissé ! Vous avez gagné ${winnings.toFixed(2)} € !`;
    document.getElementById('chicken-message').classList.add('chicken-win-text');
    showFloatingWinNumbers(winnings, document.getElementById('chicken-game-area')); // Use global showFloatingWinNumbers
    endChickenGame(winnings);
}

// Termine la partie de chicken
function endChickenGame(winnings) {
    chickenGameActive = false;
    document.getElementById('chicken-play-button').disabled = false;
    document.getElementById('chicken-cashout-button').disabled = true; // Disabled here after the game ends
    document.getElementById('chicken-bet-select').disabled = false; // Enable select
    document.getElementById('chicken-bones-input').disabled = false;

    // Révéler toutes les cases restantes
    chickenGrid.forEach(cellData => {
        if (!cellData.revealed) {
            cellData.element.classList.add('revealed');
            cellData.element.classList.remove('unrevealed');
            cellData.element.removeEventListener('click', handleChickenCellClick); // S'assurer que les écouteurs sont retirés

            if (cellData.hasChicken) {
                cellData.element.classList.add('chicken');
                cellData.element.innerHTML = `<span>${SYMBOL_CHICKEN}</span>`;
            } else {
                cellData.element.classList.add('bone');
                cellData.element.innerHTML = `<span>${SYMBOL_BONE}</span>`;
            }
        }
        cellData.element.classList.add('disabled'); // Désactiver tous les clics après la fin du jeu
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

function updateChickenMultiplier() {
    console.log("--- Début updateChickenMultiplier (Nouvelle formule) ---");
    console.log("chickensFound:", chickensFound);
    console.log("numBones:", numBones);
    console.log("currentMultiplier (avant calcul):", currentMultiplier);

    if (chickensFound === 0) {
        currentMultiplier = 1.00;
        console.log("Aucun poulet trouvé, multiplicateur = 1.00");
    } else {
        // La base de la progression exponentielle pour les poulets suivants.
        // Plus il y a d'os, plus cette base doit être élevée.
        const exponentialGrowthBase = 1.05 + (numBones * 0.007); // 0.007 est un facteur à ajuster

        // La formule pour le premier poulet trouvé.
        // Si vous trouvez 1 poulet quand il y a 24 os, cela signifie que
        // vous avez trouvé le SEUL poulet parmi 25 cases.
        // Donc, le multiplicateur du premier poulet doit être très élevé avec beaucoup d'os.
        const firstChickenMultiplierBase = 1.00 + (numBones * numBones * 0.005); // Croissance rapide pour le 1er

        // Multiplicateur total
        currentMultiplier = firstChickenMultiplierBase * Math.pow(exponentialGrowthBase, chickensFound - 1);
    }

    // Assurez-vous que le multiplicateur ne descend jamais en dessous de 1.00
    currentMultiplier = Math.max(1.00, currentMultiplier);

    // Limiter le multiplicateur à deux décimales
    currentMultiplier = parseFloat(currentMultiplier.toFixed(2));
    console.log("currentMultiplier (après calcul):", currentMultiplier);

    updateChickenDisplay();
    console.log("--- Fin updateChickenMultiplier ---");
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
