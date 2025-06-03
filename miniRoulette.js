// miniRoulette.js

let rouletteSpinning = false;
let currentBetAmount = 1; // Current chip value selected
let placedBets = {}; // Store { 'betType': amount, 'number_12': amount, 'red': amount }

// Define the segments of the roulette wheel (American Roulette order)
const ROULETTE_NUMBERS = [
    { num: '0', color: 'green' },
    { num: '28', color: 'black' },
    { num: '9', color: 'red' },
    { num: '26', color: 'black' },
    { num: '30', color: 'red' },
    { num: '11', color: 'black' },
    { num: '7', color: 'red' },
    { num: '20', color: 'black' },
    { num: '32', color: 'red' },
    { num: '17', color: 'black' },
    { num: '5', color: 'red' },
    { num: '22', color: 'black' },
    { num: '34', color: 'red' },
    { num: '15', color: 'black' },
    { num: '3', color: 'red' },
    { num: '24', color: 'black' },
    { num: '36', color: 'red' },
    { num: '13', color: 'black' },
    { num: '1', color: 'red' },
    { num: '00', color: 'green' },
    { num: '27', color: 'black' },
    { num: '10', color: 'red' },
    { num: '25', color: 'black' },
    { num: '29', color: 'red' },
    { num: '12', color: 'black' },
    { num: '8', color: 'red' },
    { num: '19', color: 'black' },
    { num: '31', color: 'red' },
    { num: '18', color: 'black' },
    { num: '6', color: 'red' },
    { num: '21', color: 'black' },
    { num: '33', color: 'red' },
    { num: '16', color: 'black' },
    { num: '4', color: 'red' },
    { num: '23', color: 'black' },
    { num: '35', color: 'red' },
    { num: '14', color: 'black' },
    { num: '2', color: 'red' }
];

// Helper to determine if a number is red or black
function getNumberColor(num) {
    if (num === '0' || num === '00') return 'green';
    const numInt = parseInt(num);
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    if (redNumbers.includes(numInt)) {
        return 'red';
    } else {
        return 'black';
    }
}

function startMiniRoulette() {
    currentGame = 'roulette';
    rouletteSpinning = false;
    placedBets = {}; // Clear bets for a new game
    updateBalanceDisplay();

    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <h2>🎰 ROULETTE AMÉRICAINE 🎰</h2>
        <p>Solde : <span id="current-balance">${balance}</span> €</p>

        <div id="roulette-game-container">
            <div class="roulette-wheel-wrapper">
                <div class="roulette-wheel" id="roulette-wheel"></div>
                <div class="roulette-pointer"></div>
            </div>

            <p id="roulette-result-message" class="roulette-result">Placez vos mises sur le tableau !</p>

            <div id="roulette-controls">
                <label for="roulette-bet-input">Mise par jeton : </label>
                <input type="number" id="roulette-bet-input" min="1" value="1" placeholder="Valeur Jeton">
                <button id="roulette-spin-button" onclick="spinRoulette()" disabled>Lancer la Roue !</button>
                <button id="roulette-clear-bets" onclick="clearAllBets()">Effacer les mises</button>
            </div>

            <div id="roulette-board-layout">
                <div class="board-cell green-cell" data-bet-type="number" data-number="0">0</div>
                <div class="board-cell green-cell" data-bet-type="number" data-number="00">00</div>

                <div class="board-cell" data-bet-type="dozen1">1ère Douzaine</div>
                <div class="board-cell" data-bet-type="dozen2">2ème Douzaine</div>
                <div class="board-cell" data-bet-type="dozen3">3ème Douzaine</div>

                <div class="bottom-row-bets">
                    <div class="board-cell" data-bet-type="1to18">1-18</div>
                    <div class="board-cell" data-bet-type="even">PAIR</div>
                    <div class="board-cell red-cell" data-bet-type="red">ROUGE</div>
                    <div class="board-cell black-cell" data-bet-type="black">NOIR</div>
                    <div class="board-cell" data-bet-type="odd">IMPAIR</div>
                    <div class="board-cell" data-bet-type="19to36">19-36</div>
                </div>
            </div>
            <div id="roulette-current-bet-display">Mises totales : <span class="total-bet-amount">0</span> €</div>

            <button onclick="showMainMenu()" class="back-button">Retour au menu</button>
        </div>
    `;
    updateBalanceDisplay();
    setupRouletteWheel();
    setupBettingBoard();
    updateSpinButtonState();

    document.getElementById('roulette-bet-input').addEventListener('input', (event) => {
        let value = parseInt(event.target.value);
        if (isNaN(value) || value < 1) {
            value = 1;
            event.target.value = 1;
        }
        currentBetAmount = value;
    });
}

function setupRouletteWheel() {
    const wheel = document.getElementById('roulette-wheel');
    const numSegments = ROULETTE_NUMBERS.length;
    const anglePerSegment = 360 / numSegments;

    wheel.innerHTML = ''; // Clear existing segments

    ROULETTE_NUMBERS.forEach((segment, index) => {
        const segDiv = document.createElement('div');
        segDiv.classList.add('wheel-segment');
        segDiv.classList.add(segment.color); // Add color class (green, red, black)

        const rotation = anglePerSegment * index;
        // Skewing for segment shape, then rotate the whole segment
        segDiv.style.transform = `rotate(${rotation}deg) skewY(calc(90deg - ${anglePerSegment}deg))`;

        const valueSpan = document.createElement('span');
        valueSpan.textContent = segment.num;
        // Counter-rotate the text to make it readable
        valueSpan.style.setProperty('--angle', `${-rotation}deg`);
        segDiv.appendChild(valueSpan);

        wheel.appendChild(segDiv);
    });
}

function setupBettingBoard() {
    const boardLayout = document.getElementById('roulette-board-layout');

    // Generate numbers 1-36 cells
    for (let i = 1; i <= 36; i++) {
        const cell = document.createElement('div');
        cell.classList.add('board-cell');
        const color = getNumberColor(i.toString());
        cell.classList.add(`${color}-cell`);
        cell.textContent = i;
        cell.dataset.betType = 'number';
        cell.dataset.number = i.toString();
        cell.style.gridColumn = `${(i % 3 === 1 ? 2 : (i % 3 === 2 ? 3 : 4))}`; // Column based on modulo 3
        cell.style.gridRow = `${Math.ceil(i / 3) + 2}`; // Rows start from 3 (after 0, 00)
        boardLayout.appendChild(cell);
    }

    // Generate Column bets
    for (let i = 1; i <= 3; i++) {
        const cell = document.createElement('div');
        cell.classList.add('board-cell');
        cell.textContent = `COL ${i}`;
        cell.dataset.betType = `column${i}`;
        cell.style.gridColumn = '5';
        cell.style.gridRow = `${i === 1 ? '3 / span 12' : (i === 2 ? '3 / span 12' : '3 / span 12')}`; // All columns span 12 rows
        cell.style.gridRow = `${(i * 3) - 2 + 2} / span 12`; // Adjust grid row based on column
        cell.style.gridRow = `${((i -1) * 12) + 3} / span 12`;
        cell.style.gridRow = `${3 + (i - 1) * 12} / span 12`;
        if (i === 1) cell.style.gridRow = '3 / span 12';
        else if (i === 2) cell.style.gridRow = '3 / span 12';
        else if (i === 3) cell.style.gridRow = '3 / span 12';

        // Re-adjust for correct visual grid position for columns
        if (i === 1) { cell.style.gridRow = '3 / span 12'; cell.style.gridColumn = '5'; }
        if (i === 2) { cell.style.gridRow = '3 / span 12'; cell.style.gridColumn = '5'; }
        if (i === 3) { cell.style.gridRow = '3 / span 12'; cell.style.gridColumn = '5'; }
        // This is complex for grid, simpler to do it manually for columns
        // For column 1 (1, 4, 7...34), it spans rows corresponding to these numbers
        // For column 2 (2, 5, 8...35)
        // For column 3 (3, 6, 9...36)
        // Let's just create 3 column cells at the bottom right.
        // It's easier to use the specific CSS for columns in the CSS file.
        // I will remove the dynamic column generation here and rely on the fixed board layout in CSS.
    }

    // Attach event listeners to all board cells
    document.querySelectorAll('.board-cell').forEach(cell => {
        cell.addEventListener('click', () => {
            if (rouletteSpinning) return;

            const betAmount = currentBetAmount;
            if (balance < betAmount) {
                document.getElementById('roulette-result-message').textContent = "Solde insuffisant pour cette mise !";
                return;
            }

            const betType = cell.dataset.betType;
            const betKey = cell.dataset.number ? `${betType}_${cell.dataset.number}` : betType;

            if (!placedBets[betKey]) {
                placedBets[betKey] = 0;
            }
            placedBets[betKey] += betAmount;
            balance -= betAmount;
            updateBalanceDisplay();
            updateBetDisplay();
            addBetChip(cell, betAmount);
            document.getElementById('roulette-result-message').textContent = `Mise de ${betAmount}€ placée sur ${cell.textContent}.`;
            updateSpinButtonState();
        });
    });
}

function addBetChip(cellElement, amount) {
    let chipContainer = cellElement.querySelector('.bet-chip-container');
    if (!chipContainer) {
        chipContainer = document.createElement('div');
        chipContainer.classList.add('bet-chip-container');
        cellElement.appendChild(chipContainer);
    }

    const chip = document.createElement('div');
    chip.classList.add('bet-chip');
    chip.textContent = amount;
    chipContainer.appendChild(chip);

    // Optional: animate chip
    chip.style.transform = 'scale(0)';
    setTimeout(() => {
        chip.style.transform = 'scale(1)';
    }, 10);
}

function clearAllBets() {
    if (rouletteSpinning) return;
    for (const key in placedBets) {
        balance += placedBets[key]; // Return money to balance
    }
    placedBets = {};
    updateBalanceDisplay();
    updateBetDisplay();
    document.getElementById('roulette-result-message').textContent = "Toutes les mises ont été effacées.";

    // Remove all chips from the board
    document.querySelectorAll('.bet-chip-container').forEach(container => {
        container.remove();
    });
    updateSpinButtonState();
}

function updateBetDisplay() {
    let totalBet = 0;
    for (const key in placedBets) {
        totalBet += placedBets[key];
    }
    document.querySelector('.total-bet-amount').textContent = totalBet.toFixed(2);
    // You could also iterate placedBets and display them individually if desired
}

function updateSpinButtonState() {
    const spinButton = document.getElementById('roulette-spin-button');
    const totalBet = Object.values(placedBets).reduce((sum, bet) => sum + bet, 0);
    spinButton.disabled = rouletteSpinning || totalBet === 0;
}


function spinRoulette() {
    if (rouletteSpinning || Object.keys(placedBets).length === 0) return;

    rouletteSpinning = true;
    document.getElementById('roulette-spin-button').disabled = true;
    document.getElementById('roulette-clear-bets').disabled = true;
    document.getElementById('roulette-bet-input').disabled = true;
    document.querySelectorAll('.board-cell').forEach(cell => cell.classList.add('disabled-cell'));


    document.getElementById('roulette-result-message').textContent = "La roue tourne...";
    const wheel = document.getElementById('roulette-wheel');

    // Randomly select a winning segment index
    const winningSegmentIndex = Math.floor(Math.random() * ROULETTE_NUMBERS.length);
    const numRevolutions = 5; // Spin at least 5 full circles
    const degreesPerSegment = 360 / ROULETTE_NUMBERS.length;

    // Calculate the target rotation to land on the chosen segment
    // Adjust for the pointer position, assuming it points to the top.
    // The segments are drawn from 0 at the top, clockwise.
    // To land on `winningSegmentIndex`, we need to rotate to position that segment under the pointer.
    const targetAngle = (winningSegmentIndex * degreesPerSegment) + (degreesPerSegment / 2); // Center of the segment
    const rotationAdjustment = 360 - targetAngle; // Angle to bring the chosen segment to the top (under pointer)
    const finalRotation = (numRevolutions * 360) + rotationAdjustment;


    wheel.style.transition = 'transform 6s cubic-bezier(0.2, 0.8, 0.2, 1)';
    wheel.style.transform = `rotate(${finalRotation}deg)`;

    setTimeout(() => {
        rouletteSpinning = false;
        wheel.style.transition = 'none'; // Reset transition for instant snap back for next spin
        // Snap the wheel to the exact final position after the animation to avoid cumulative errors
        wheel.style.transform = `rotate(${finalRotation % 360}deg)`;

        const winningNumberData = ROULETTE_NUMBERS[winningSegmentIndex];
        const winningNumber = winningNumberData.num;
        const winningColor = winningNumberData.color;

        let totalWin = 0;
        let winDetails = []; // To store details of wins

        for (const betKey in placedBets) {
            const betAmount = placedBets[betKey];
            let winMultiplier = 0;
            let betWon = false;

            if (betKey.startsWith('number_')) {
                const betNum = betKey.split('_')[1];
                if (betNum === winningNumber) {
                    winMultiplier = 35; // Straight up bet
                    betWon = true;
                }
            } else if (betKey === 'red') {
                if (winningColor === 'red') {
                    winMultiplier = 1; // Even money bet
                    betWon = true;
                }
            } else if (betKey === 'black') {
                if (winningColor === 'black') {
                    winMultiplier = 1; // Even money bet
                    betWon = true;
                }
            } else if (betKey === 'even') {
                if (parseInt(winningNumber) % 2 === 0 && winningNumber !== '0' && winningNumber !== '00') {
                    winMultiplier = 1;
                    betWon = true;
                }
            } else if (betKey === 'odd') {
                if (parseInt(winningNumber) % 2 !== 0 && winningNumber !== '0' && winningNumber !== '00') {
                    winMultiplier = 1;
                    betWon = true;
                }
            } else if (betKey === '1to18') {
                const num = parseInt(winningNumber);
                if (num >= 1 && num <= 18) {
                    winMultiplier = 1;
                    betWon = true;
                }
            } else if (betKey === '19to36') {
                const num = parseInt(winningNumber);
                if (num >= 19 && num <= 36) {
                    winMultiplier = 1;
                    betWon = true;
                }
            } else if (betKey === 'dozen1') { // 1-12
                const num = parseInt(winningNumber);
                if (num >= 1 && num <= 12) {
                    winMultiplier = 2;
                    betWon = true;
                }
            } else if (betKey === 'dozen2') { // 13-24
                const num = parseInt(winningNumber);
                if (num >= 13 && num <= 24) {
                    winMultiplier = 2;
                    betWon = true;
                }
            } else if (betKey === 'dozen3') { // 25-36
                const num = parseInt(winningNumber);
                if (num >= 25 && num <= 36) {
                    winMultiplier = 2;
                    betWon = true;
                }
            } else if (betKey === 'column1') { // 1,4,7...34
                const num = parseInt(winningNumber);
                if (num % 3 === 1 && num !== 0 && num !== '00') {
                    winMultiplier = 2;
                    betWon = true;
                }
            } else if (betKey === 'column2') { // 2,5,8...35
                const num = parseInt(winningNumber);
                if (num % 3 === 2 && num !== 0 && num !== '00') {
                    winMultiplier = 2;
                    betWon = true;
                }
            } else if (betKey === 'column3') { // 3,6,9...36
                const num = parseInt(winningNumber);
                if (num % 3 === 0 && num !== 0 && num !== '00') {
                    winMultiplier = 2;
                    betWon = true;
                }
            }
            // Add more complex bets (splits, streets, corners, etc.) here if needed
            // These would require more detailed data-attributes on the cells

            if (betWon) {
                totalWin += (betAmount * winMultiplier) + betAmount; // Return bet + win
                winDetails.push(`${betKey} (+${(betAmount * winMultiplier).toFixed(2)}€)`);
            }
        }

        balance += totalWin;
        updateBalanceDisplay();

        let message = `Le numéro gagnant est : <span class="${winningColor}-text">${winningNumber}</span> !`;
        if (totalWin > 0) {
            message += `<br>Vous gagnez un total de ${totalWin.toFixed(2)} € !`;
            document.getElementById('roulette-result-message').classList.add('win-text');
            setTimeout(() => {
                document.getElementById('roulette-result-message').classList.remove('win-text');
            }, 1000);
            showFloatingWinNumbers(totalWin, document.getElementById('roulette-game-container'));
        } else {
            message += `<br>Désolé, aucune de vos mises n'a gagné.`;
        }

        document.getElementById('roulette-result-message').innerHTML = message;

        resetRouletteGame();

    }, 6000); // Duration of the CSS transition
}


function resetRouletteGame() {
    placedBets = {}; // Clear all bets
    updateBetDisplay();

    document.getElementById('roulette-spin-button').disabled = true;
    document.getElementById('roulette-clear-bets').disabled = false;
    document.getElementById('roulette-bet-input').disabled = false;
    document.querySelectorAll('.board-cell').forEach(cell => cell.classList.remove('disabled-cell'));

    // Remove all chips from the board
    document.querySelectorAll('.bet-chip-container').forEach(container => {
        container.remove();
    });
}