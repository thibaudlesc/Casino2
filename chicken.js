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

// Multiplicateurs ajustés pour la difficulté (plus difficiles)
// Ces valeurs sont un exemple et peuvent être ajustées davantage.
// La structure est : MULTIPLIERS[nombre_d_os][poulets_trouves]
const MULTIPLIERS = {
    1: [1.00, 1.03, 1.06, 1.09, 1.13, 1.17, 1.21, 1.25, 1.30, 1.35, 1.40, 1.45, 1.50, 1.56, 1.62, 1.68, 1.75, 1.82, 1.90, 1.98, 2.06, 2.15, 2.25, 2.35, 2.45, 2.56], // Pour 1 os
    2: [1.00, 1.05, 1.10, 1.16, 1.22, 1.28, 1.35, 1.42, 1.50, 1.58, 1.67, 1.76, 1.86, 1.96, 2.07, 2.19, 2.31, 2.44, 2.58, 2.73, 2.89, 3.06, 3.24, 3.43, 3.63, 3.85], // Pour 2 os
    3: [1.00, 1.08, 1.16, 1.25, 1.34, 1.44, 1.55, 1.67, 1.79, 1.93, 2.07, 2.23, 2.40, 2.58, 2.78, 2.99, 3.22, 3.47, 3.74, 4.03, 4.35, 4.70, 5.08, 5.50, 5.95, 6.45], // Pour 3 os
    4: [1.00, 1.10, 1.21, 1.33, 1.46, 1.60, 1.75, 1.92, 2.10, 2.30, 2.52, 2.76, 3.02, 3.31, 3.63, 3.98, 4.37, 4.79, 5.26, 5.77, 6.33, 6.95, 7.63, 8.37, 9.19, 10.08], // Pour 4 os
    5: [1.00, 1.13, 1.27, 1.42, 1.59, 1.78, 1.99, 2.23, 2.50, 2.80, 3.13, 3.51, 3.93, 4.40, 4.93, 5.53, 6.20, 6.95, 7.80, 8.75, 9.82, 11.02, 12.37, 13.88, 15.58, 17.48], // Pour 5 os
    6: [1.00, 1.16, 1.34, 1.54, 1.77, 2.03, 2.33, 2.67, 3.06, 3.51, 4.03, 4.62, 5.30, 6.09, 6.99, 8.03, 9.22, 10.59, 12.16, 13.97, 16.05, 18.44, 21.20, 24.36, 28.00, 32.20], // Pour 6 os
    7: [1.00, 1.20, 1.40, 1.65, 1.95, 2.30, 2.70, 3.20, 3.80, 4.50, 5.35, 6.35, 7.55, 9.00, 10.70, 12.75, 15.20, 18.10, 21.60, 25.75, 30.70, 36.60, 43.60, 52.00, 62.00, 73.90],
    8: [1.00, 1.25, 1.55, 1.90, 2.35, 2.90, 3.60, 4.45, 5.50, 6.80, 8.40, 10.40, 12.85, 15.85, 19.60, 24.20, 29.90, 36.90, 45.60, 56.30, 69.50, 85.80, 106.00, 131.00, 162.00, 200.00],
    9: [1.00, 1.30, 1.65, 2.10, 2.70, 3.45, 4.45, 5.70, 7.30, 9.40, 12.00, 15.40, 19.80, 25.40, 32.60, 41.90, 53.80, 69.10, 88.80, 114.20, 146.80, 189.00, 243.00, 312.00, 401.00, 516.00],
    10: [1.00, 1.35, 1.80, 2.40, 3.20, 4.30, 5.75, 7.70, 10.30, 13.80, 18.50, 24.80, 33.20, 44.50, 59.60, 79.80, 106.90, 143.20, 192.00, 257.00, 344.00, 461.00, 618.00, 828.00, 1109.00, 1486.00],
    15: [1.00, 1.70, 2.80, 4.60, 7.60, 12.50, 20.60, 34.00, 56.00, 92.00, 152.00, 250.00, 412.00, 680.00, 1120.00, 1850.00, 3050.00, 5030.00, 8300.00, 13700.00, 22600.00, 37300.00, 61500.00, 101000.00, 167000.00, 275000.00],
    20: [1.00, 2.20, 4.80, 10.50, 23.00, 50.00, 110.00, 240.00, 520.00, 1140.00, 2500.00, 5400.00, 11900.00, 26000.00, 57000.00, 125000.00, 275000.00, 600000.00, 1320000.00, 2900000.00, 6300000.00, 13800000.00, 30000000.00, 66000000.00, 145000000.00, 318000000.00],
    24: [1.00, 2.80, 7.80, 21.80, 61.00, 170.00, 477.00, 1335.00, 3740.00, 10500.00, 29400.00, 82300.00, 231000.00, 647000.00, 1810000.00, 5080000.00, 14200000.00, 39900000.00, 112000000.00, 314000000.00, 880000000.00, 2470000000.00, 6930000000.00, 19400000000.00, 54500000000.00, 153000000000.00]
};

// Fixed bet amounts for the Chicken game
const BET_AMOUNTS_CHICKEN = [100, 250, 500, 1000, 2000, 7500, 10000, 25000, 50000, 75000, 100000, 200000];


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
                <div class="bet-controls">
                    <label for="chicken-bet-select">Mise : </label>
                    <select id="chicken-bet-select">
                        ${BET_AMOUNTS_CHICKEN.map(amount =>  `<option value="${amount}">${amount >= 10000 ? (amount / 1000) + 'k' : amount}€</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label for="chicken-bones-input">Os : </label>
                    <input type="number" id="chicken-bones-input" value="3" min="1" max="24">
                </div>
                <button id="chicken-play-button" class="game-button">Jouer</button>
            </div>
            
            <p id="chicken-message" class="chicken-message">Choisissez votre mise et le nombre d'os, puis cliquez sur Jouer !</p>

            <div class="chicken-stats-and-cashout">
                <p id="chicken-current-multiplier">Multiplicateur Actuel : x1.00</p>
                <p id="chicken-potential-win">Gain Potentiel : 0.00 €</p>
                <button id="chicken-cashout-button" class="game-button" disabled>Encaisser</button>
            </div>
            
            <div id="chicken-grid"></div>

        </div>
        <button onclick="goToMainMenuPage()" class="game-button">Retour au Menu</button>
    `;

    document.getElementById('chicken-play-button').addEventListener('click', initializeChickenGame);
    document.getElementById('chicken-cashout-button').addEventListener('click', cashOutChicken);

    // Set default bet amount to the first value in the array
    document.getElementById('chicken-bet-select').value = BET_AMOUNTS_CHICKEN[0];

    updateBalanceDisplay();
    renderChickenGrid(); // Initial render with disabled cells
    updateChickenDisplay(); // Update display for initial state
}

// NOUVELLE FONCTION POUR RECHARGER LA PAGE
function goToMainMenuPage() {
    window.location.href = 'index.html'; // Redirige vers la page index.html
    // Ou si vous voulez juste recharger la page actuelle (qui est probablement index.html) :
    // window.location.reload(); 
}


// Fonction pour initialiser une nouvelle partie
function initializeChickenGame() {
    if (chickenGameActive) return;

    chickenBet = parseFloat(document.getElementById('chicken-bet-select').value); // Get value from select
    numBones = parseInt(document.getElementById('chicken-bones-input').value);

    if (isNaN(chickenBet) || chickenBet <= 0 || chickenBet > balance) {
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

    balance -= chickenBet;
    updateBalanceDisplay();

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
        // Calcul des poulets restants et des os restants dans la grille
        const totalCells = GRID_SIZE; // 25 cellules
        const availableChickens = totalCells - numBones; // Nombre total de poulets dans la grille
        
        // La clé pour une récompense exponentielle sur 1 poulet avec beaucoup d'os
        // est de baser le multiplicateur sur la rareté.
        // Si vous trouvez 1 poulet quand il y a 24 os, cela signifie que 
        // vous avez trouvé le SEUL poulet parmi 25 cases.
        
        // Multiplicateur pour le PREMIER poulet trouvé:
        let calculatedMulti = 1.00;

        if (chickensFound === 1) {
            // Pour le premier poulet, la récompense est directement liée à la difficulté.
            // Plus il y a d'os, moins il y a de poulets, plus le multiplicateur est élevé.
            // Utilisez une formule qui croît très rapidement avec le nombre d'os.
            
            // Calculer la probabilité initiale de trouver un poulet
            const initialProbabilityOfChicken = availableChickens / totalCells;
            
            // Un multiplicateur basé sur l'inverse de la probabilité, élevé à une certaine puissance
            // ou ajusté par un facteur exponentiel.
            // Plus initialProbabilityOfChicken est faible, plus le multiplicateur sera élevé.
            
            // Option 1: Formule basée sur la difficulté du premier clic
            // Cette formule rend les multiplicateurs très agressifs avec beaucoup d'os
            calculatedMulti = Math.pow(totalCells / availableChickens, 1.5); // 1.5 est un facteur d'exponentiation à ajuster
            // Exemple: avec 24 os (1 poulet), 25/1 = 25. Math.pow(25, 1.5) = 125x !
            // Avec 1 os (24 poulets), 25/24 = 1.04. Math.pow(1.04, 1.5) = ~1.06x
            
            // Option 2: Une formule légèrement moins agressive au départ, mais toujours exponentielle
            // calculatedMulti = 1 + (availableChickens * 0.05) * Math.pow(totalCells / availableChickens, 1.2);

            // Option 3: Une formule qui monte très vite avec les os:
            // calculatedMulti = 1 + (availableChickens / totalCells * (chickensFound + 0.5)) + (numBones * numBones * 0.05); // Simple mais non exponentiel assez
            // Tentons de créer quelque chose qui monte fort avec `numBones` pour le 1er poulet:
            // Pour 1 poulet trouvé, le multiplicateur dépend de `numBones`
            calculatedMulti = 1.00 + (numBones * numBones * 0.04); // Plus d'os, plus la croissance est rapide (0.05 est un coefficient)
            // Pour 24 os, numBones*numBones*0.05 = 24*24*0.05 = 576*0.05 = 28.8. Multiplicateur serait 29.8x pour le 1er poulet.
            // C'est un bon début.

            // Maintenant, pour les poulets suivants, le multiplicateur doit continuer à augmenter
            // de manière significative, mais la base de l'augmentation peut dépendre du premier.
            // Nous allons combiner cela avec une progression pour les poulets suivants.
            
            // La base de la progression exponentielle pour les poulets suivants.
            // Plus il y a d'os, plus cette base doit être élevée.
            const exponentialGrowthBase = 1.05 + (numBones * 0.02); // 0.02 est un facteur à ajuster
            
            // Le multiplicateur total sera une combinaison de la base pour le 1er poulet
            // et une croissance exponentielle pour les suivants.
            // Multiplicateur pour 1 poulet: calculatedMulti (de la formule ci-dessus)
            // Multiplicateur pour N poulets: calculatedMulti * (exponentialGrowthBase ^ (chickensFound - 1))
            
            currentMultiplier = calculatedMulti * Math.pow(exponentialGrowthBase, chickensFound - 1);

        } else { // Si plus d'un poulet a été trouvé
            // Reprendre une base de calcul similaire au 1er poulet
            const baseForFirstChicken = 1.00 + (numBones * numBones * 0.05); // La base pour le premier poulet
            const exponentialGrowthBase = 1.05 + (numBones * 0.02); // La base de croissance pour les suivants

            // Formule combinée:
            // La valeur du premier poulet est une base, puis chaque poulet additionnel
            // multiplie le gain précédent par un facteur qui dépend du nombre d'os.
            currentMultiplier = baseForFirstChicken * Math.pow(exponentialGrowthBase, chickensFound - 1);
        }

        // Assurez-vous que le multiplicateur ne descend jamais en dessous de 1.00
        currentMultiplier = Math.max(1.00, currentMultiplier);

        // Limiter le multiplicateur à deux décimales
        currentMultiplier = parseFloat(currentMultiplier.toFixed(2));
        console.log("currentMultiplier (après calcul):", currentMultiplier);
    }

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
