// Variables spécifiques à la Roulette
const ROULETTE_NUMBERS_FULL = Array.from({length: 37}, (_, i) => i); // 0 to 36

// Define red and black numbers for a standard European roulette
const RED_NUMBERS_FULL = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS_FULL = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
const GREEN_NUMBERS_FULL = [0];

let currentRouletteBets = {}; // Stocke les paris actuels du joueur (ex: {'number-7': {amount: 10}, 'color-red': {amount: 10}})

// Function to start the roulette game
function startRoulette() {
    currentGame = 'roulette'; // Assume currentGame est global
    currentRouletteBets = {}; // Réinitialiser les paris à chaque fois qu'on démarre la roulette
    const gameContainer = document.getElementById('game-container');

    // Generate the roulette wheel segments for display
    let wheelSegmentsHTML = '';
    ROULETTE_NUMBERS_FULL.forEach(num => {
        let colorClass = '';
        if (RED_NUMBERS_FULL.includes(num)) {
            colorClass = 'red';
        } else if (BLACK_NUMBERS_FULL.includes(num)) {
            colorClass = 'black';
        } else {
            colorClass = 'green'; // For 0
        }
        // Each segment is a triangle pointing to the center, rotated
        const rotation = (360 / ROULETTE_NUMBERS_FULL.length) * num;
        wheelSegmentsHTML += `
            <div class="wheel-segment ${colorClass}" style="transform: rotate(${rotation}deg) skewY(55deg);">
                <span class="segment-number" style="transform: skewY(-55deg) rotate(${ -rotation }deg);">${num}</span>
            </div>
        `;
    });


    gameContainer.innerHTML = `
        <h2>✦ ROULETTE ✦</h2>
        <p>Solde : <span id="current-balance">${balance}</span> €</p>
        
        <div id="roulette-container">
            <div id="roulette-wheel-display">
                <div id="roulette-ball"></div>
                <div id="roulette-wheel-inner">
                    ${wheelSegmentsHTML}
                </div>
                <div id="roulette-winning-number-display"></div>
            </div>

            <p id="roulette-result">Placez vos jetons !</p>
            <p id="roulette-gain">Gain du dernier tour : 0 €</p>
            
            <div id="roulette-table">
                <div class="bet-cell green zero" data-bet-type="number" data-bet-value="0">0</div>
                ${ROULETTE_NUMBERS_FULL.filter(num => num !== 0).map(num => `
                    <div class="bet-cell ${RED_NUMBERS_FULL.includes(num) ? 'red' : BLACK_NUMBERS_FULL.includes(num) ? 'black' : ''}" 
                         data-bet-type="number" data-bet-value="${num}">${num}</div>
                `).join('')}
                
                <div class="bet-cell wide red" data-bet-type="color" data-bet-value="red">ROUGE</div>
                <div class="bet-cell wide black" data-bet-type="color" data-bet-value="black">NOIR</div>
                
                <div class="bet-cell wide" data-bet-type="parity" data-bet-value="even">PAIR</div>
                <div class="bet-cell wide" data-bet-type="parity" data-bet-value="odd">IMPAIR</div>

                <div class="bet-cell side-bet" data-bet-type="group" data-bet-value="1-12">1-12</div>
                <div class="bet-cell side-bet" data-bet-type="group" data-bet-value="13-24">13-24</div>
                <div class="bet-cell side-bet" data-bet-type="group" data-bet-value="25-36">25-36</div>

                 <div class="bet-cell side-bet" data-bet-type="half" data-bet-value="1-18">1-18</div>
                 <div class="bet-cell side-bet" data-bet-type="half" data-bet-value="19-36">19-36</div>
            </div>

            <div class="roulette-controls">
                <input type="number" id="roulette-bet-amount" value="10" min="1" step="1">
                <button id="spin-roulette-button" onclick="spinRoulette()">Lancer</button>
                <button id="clear-bets-button" onclick="clearRouletteBets()">Effacer Paris</button>
            </div>
            <p class="bet-summary">Mise totale : <span id="roulette-total-bet">0</span> €</p>
        </div>
        <button onclick="showMainMenu()">Retour</button>
    `;
    updateBalanceDisplay(); // Assume updateBalanceDisplay est global

    updateRouletteTotalBetDisplay();
    addRouletteTableEventListeners();
    renderRouletteBets(); // Affiche les jetons s'il y en a (après réinitialisation)
}

// Fonction pour ajouter les écouteurs d'événements aux cellules de pari de la roulette
function addRouletteTableEventListeners() {
    const betCells = document.querySelectorAll('#roulette-table .bet-cell');
    betCells.forEach(cell => {
        cell.addEventListener('click', () => {
            const betAmountInput = document.getElementById('roulette-bet-amount');
            const betAmount = parseInt(betAmountInput.value);

            if (isNaN(betAmount) || betAmount <= 0) {
                alert("Veuillez entrer un montant de pari valide (nombre entier positif).");
                return;
            }
            if (balance < betAmount) { // Assume balance est global
                alert("Solde insuffisant pour cette mise !");
                return;
            }

            const betType = cell.dataset.betType;
            const betValue = cell.dataset.betValue;
            const betKey = `${betType}-${betValue}`; // Clé unique pour ce type de pari

            // Déduire la mise du solde
            balance -= betAmount; // Assume balance est global
            updateBalanceDisplay(); // Assume updateBalanceDisplay est global

            // Ajouter/mettre à jour le pari
            if (currentRouletteBets[betKey]) {
                currentRouletteBets[betKey].amount += betAmount;
            } else {
                currentRouletteBets[betKey] = {
                    type: betType,
                    value: betValue,
                    amount: betAmount,
                    cellElement: cell // Stocke une référence à la cellule pour l'affichage du jeton
                };
            }
            
            updateRouletteTotalBetDisplay();
            renderRouletteBets(); // Met à jour l'affichage des jetons
        });
    });
}

// Fonction pour effacer tous les paris placés à la roulette
function clearRouletteBets() {
    currentRouletteBets = {}; // Vide tous les paris
    updateRouletteTotalBetDisplay();
    renderRouletteBets(); // Supprime les jetons visuels
    const rouletteGainDisplay = document.getElementById('roulette-gain');
    rouletteGainDisplay.textContent = 'Gain du dernier tour : 0 €';
    rouletteGainDisplay.classList.remove('win-text');
    document.getElementById('roulette-result').textContent = 'Placez vos jetons !';
}

// Fonction pour afficher les jetons sur la table de roulette
function renderRouletteBets() {
    // Supprimer tous les jetons existants
    document.querySelectorAll('.bet-chip').forEach(chip => chip.remove());

    // Ajouter de nouveaux jetons pour les paris actuels
    for (const key in currentRouletteBets) {
        const bet = currentRouletteBets[key];
        const chip = document.createElement('div');
        chip.classList.add('bet-chip');
        chip.textContent = bet.amount;
        bet.cellElement.appendChild(chip);
    }
}

// Aide pour mettre à jour l'affichage de la mise totale à la roulette
function updateRouletteTotalBetDisplay() {
    const totalBetSpan = document.getElementById('roulette-total-bet');
    if (totalBetSpan) {
        const totalAmount = Object.values(currentRouletteBets).reduce((sum, bet) => sum + bet.amount, 0);
        totalBetSpan.textContent = totalAmount;
    }
}

// Fonction pour faire tourner la roulette
function spinRoulette() {
    const spinButton = document.getElementById('spin-roulette-button');
    const rouletteResultDisplay = document.getElementById('roulette-result');
    const rouletteGainDisplay = document.getElementById('roulette-gain');
    const rouletteWheelInner = document.getElementById('roulette-wheel-inner');
    const rouletteWinningNumberDisplay = document.getElementById('roulette-winning-number-display');
    const rouletteBall = document.getElementById('roulette-ball');


    if (Object.keys(currentRouletteBets).length === 0) {
        alert("Veuillez placer des paris avant de lancer la roulette !");
        return;
    }

    spinButton.disabled = true;
    document.getElementById('roulette-table').style.pointerEvents = 'none'; // Désactiver les clics sur la table
    document.getElementById('clear-bets-button').disabled = true;

    rouletteResultDisplay.textContent = 'La roulette tourne...';
    rouletteGainDisplay.textContent = 'Gain du dernier tour : 0 €';
    rouletteGainDisplay.classList.remove('win-text');
    rouletteWinningNumberDisplay.textContent = ''; // Clear previous winning number display

    // Reset ball position and animation
    rouletteBall.classList.remove('spinning-ball');
    void rouletteBall.offsetWidth; // Trigger reflow
    rouletteBall.classList.add('spinning-ball');

    // Reset wheel animation
    rouletteWheelInner.classList.remove('spinning-wheel-inner');
    void rouletteWheelInner.offsetWidth; // Trigger reflow
    rouletteWheelInner.classList.add('spinning-wheel-inner');


    // Choisir un numéro gagnant aléatoire
    const winningNumber = ROULETTE_NUMBERS_FULL[Math.floor(Math.random() * ROULETTE_NUMBERS_FULL.length)];
    
    // Calculate rotation for the wheel to stop at the winning number
    // Each segment is 360 / 37 degrees wide
    const segmentAngle = 360 / ROULETTE_NUMBERS_FULL.length;
    // We want the winning number to appear at the top.
    // The segments are rotated, so we need to find the inverse rotation.
    // We add multiple full rotations to make it look like a good spin.
    const numRotations = 5; // Spin 5 full times
    const targetRotation = (numRotations * 360) + (360 - (winningNumber * segmentAngle)); // Adjust for 0 at top

    rouletteWheelInner.style.transform = `rotate(${targetRotation}deg)`;


    setTimeout(() => {
        rouletteWheelInner.classList.remove('spinning-wheel-inner');
        rouletteBall.classList.remove('spinning-ball');
        rouletteWinningNumberDisplay.textContent = winningNumber; // Display winning number in the center
        rouletteResultDisplay.textContent = `Le numéro gagnant est : ${winningNumber}`;
        
        let totalPayout = 0;

        // Calculate winnings for each bet
        for (const key in currentRouletteBets) {
            const bet = currentRouletteBets[key];
            let win = false;
            let payoutMultiplier = 0;

            switch (bet.type) {
                case 'number':
                    if (parseInt(bet.value) === winningNumber) {
                        win = true;
                        payoutMultiplier = 35; // Pays 35:1
                    }
                    break;
                case 'color':
                    if (bet.value === 'red' && RED_NUMBERS_FULL.includes(winningNumber)) {
                        win = true;
                        payoutMultiplier = 1; // Pays 1:1
                    } else if (bet.value === 'black' && BLACK_NUMBERS_FULL.includes(winningNumber)) {
                        win = true;
                        payoutMultiplier = 1; // Pays 1:1
                    }
                    break;
                case 'parity':
                    if (winningNumber === 0) { // 0 is neither even nor odd
                        win = false;
                    } else if (bet.value === 'even' && winningNumber % 2 === 0) {
                        win = true;
                        payoutMultiplier = 1; // Pays 1:1
                    } else if (bet.value === 'odd' && winningNumber % 2 !== 0) {
                        win = true;
                        payoutMultiplier = 1; // Pays 1:1
                    }
                    break;
                case 'group':
                    const [minGroup, maxGroup] = bet.value.split('-').map(Number);
                    if (winningNumber >= minGroup && winningNumber <= maxGroup && winningNumber !== 0) {
                        win = true;
                        payoutMultiplier = 2; // Pays 2:1 for dozens (1-12, 13-24, 25-36)
                    }
                    break;
                case 'half':
                    const [minHalf, maxHalf] = bet.value.split('-').map(Number);
                     if (winningNumber >= minHalf && winningNumber <= maxHalf && winningNumber !== 0) {
                        win = true;
                        payoutMultiplier = 1; // Pays 1:1 for 1-18, 19-36
                    }
                    break;
            }

            if (win) {
                totalPayout += bet.amount + (bet.amount * payoutMultiplier); // Return bet + payout
            }
        }

        balance += totalPayout; // Assume balance est global
        updateBalanceDisplay(); // Assume updateBalanceDisplay est global
        rouletteGainDisplay.textContent = `Gain du dernier tour : ${totalPayout} €`;

        if (totalPayout > 0) {
            rouletteGainDisplay.classList.add('win-text');
            setTimeout(() => {
                rouletteGainDisplay.classList.remove('win-text');
            }, 1000);
        }

        // Effacer tous les paris après chaque tour
        currentRouletteBets = {};
        updateRouletteTotalBetDisplay();
        renderRouletteBets(); // Supprime les jetons visuels

        spinButton.disabled = false;
        document.getElementById('roulette-table').style.pointerEvents = 'auto'; // Réactiver les clics sur la table
        document.getElementById('clear-bets-button').disabled = false;

    }, 4000); // Increased duration to match new CSS animation
}