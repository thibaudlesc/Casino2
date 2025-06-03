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
    { num: '7', 'color': 'red' },
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
    { num: '27', color: 'red' },
    { num: '10', color: 'black' },
    { num: '25', color: 'red' },
    { num: '29', color: 'black' },
    { num: '12', color: 'red' },
    { num: '8', color: 'black' },
    { num: '19', color: 'red' },
    { num: '31', color: 'black' },
    { num: '18', color: 'red' },
    { num: '6', color: 'black' },
    { num: '21', color: 'red' },
    { num: '33', color: 'black' },
    { num: '16', color: 'red' },
    { num: '4', color: 'black' },
    { num: '23', color: 'red' },
    { num: '35', color: 'black' },
    { num: '14', color: 'red' },
    { num: '2', color: 'black' }
];

// Payouts for different bet types
const PAYOUTS = {
    'number': 35,
    'color': 1, // 1:1 for red/black
    'parity': 1, // 1:1 for even/odd
    'half': 1, // 1:1 for 1-18/19-36
    'dozen': 2, // 2:1 for dozens
    'column': 2 // 2:1 for columns
};


function startMiniRoulette() {
    currentGame = 'miniRoulette';
    rouletteSpinning = false;
    placedBets = {}; // Reset bets for a new game

    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <h2>🎡 MINI ROULETTE 💰</h2>
        <p>Solde : <span id="current-balance">${balance}</span> €</p>

        <div id="roulette-game-container">
            <div class="roulette-wheel-wrapper">
                <div class="wheel-pointer"></div>
                <div class="roulette-wheel">
                    <div class="wheel-inner">
                        </div>
                </div>
            </div>

            <div class="roulette-controls">
                <div>
                    <label for="roulette-bet-input">Mise Par Jeton : </label>
                    <input type="number" id="roulette-bet-input" value="1" min="1" step="1">
                </div>
                <button id="roulette-spin-button" class="game-button" disabled>Tourner la Roue</button>
                <button id="roulette-clear-bets" class="game-button">Effacer les Mises</button>
            </div>

            <p id="roulette-placed-bets">Mises Placées : Aucune</p>
            <p id="roulette-result-message"></p>
            
            <div id="roulette-board-layout">
                </div>
        </div>
        <button onclick="showMainMenu()" class="game-button">Retour au Menu</button>
    `;

    document.getElementById('roulette-spin-button').addEventListener('click', spinRoulette);
    document.getElementById('roulette-clear-bets').addEventListener('click', clearAllBets);
    document.getElementById('roulette-bet-input').addEventListener('change', (e) => {
        currentBetAmount = parseInt(e.target.value);
        if (isNaN(currentBetAmount) || currentBetAmount <= 0) {
            currentBetAmount = 1; // Default to 1 if invalid
            e.target.value = 1;
        }
    });


    generateRouletteWheel();
    generateBettingBoard();
    updateBalanceDisplay();
    updateBetDisplay(); // Initialize bet display
}

function generateRouletteWheel() {
    const wheelInner = document.querySelector('.wheel-inner');
    wheelInner.innerHTML = ''; // Clear existing segments

    const totalSegments = ROULETTE_NUMBERS.length;
    const anglePerSegment = 360 / totalSegments;

    ROULETTE_NUMBERS.forEach((segment, index) => {
        const segmentElement = document.createElement('div');
        segmentElement.classList.add('wheel-segment');
        segmentElement.classList.add(`${segment.color}-segment`); // e.g., 'red-segment'

        segmentElement.style.transform = `rotate(${index * anglePerSegment}deg) skewY(-${90 - anglePerSegment}deg)`;
        segmentElement.style.backgroundColor = segment.color === 'red' ? '#cc0000' : segment.color === 'black' ? '#333333' : '#006400';

        // Add number label to the segment
        const numberLabel = document.createElement('span');
        numberLabel.textContent = segment.num;
        numberLabel.style.transform = `skewY(${90 - anglePerSegment}deg) rotate(${anglePerSegment / 2}deg)`; // Counter-skew and rotate
        numberLabel.style.display = 'block';
        numberLabel.style.position = 'absolute';
        numberLabel.style.top = '10%';
        numberLabel.style.left = '50%';
        numberLabel.style.transformOrigin = '0% 0%';
        numberLabel.style.color = 'white';
        numberLabel.style.fontWeight = 'bold';
        numberLabel.style.fontSize = '0.8em';

        segmentElement.appendChild(numberLabel);
        wheelInner.appendChild(segmentElement);
    });
}


function generateBettingBoard() {
    const boardLayout = document.getElementById('roulette-board-layout');
    boardLayout.innerHTML = ''; // Clear existing cells

    // Create 0 and 00 cells (if applicable for American Roulette)
    const zeroCell = document.createElement('div');
    zeroCell.classList.add('board-cell', 'green');
    zeroCell.dataset.betType = 'number';
    zeroCell.dataset.number = '0';
    zeroCell.textContent = '0';
    boardLayout.appendChild(zeroCell);

    // If American roulette, add 00
    const doubleZeroSegment = ROULETTE_NUMBERS.find(s => s.num === '00');
    if (doubleZeroSegment) {
        const doubleZeroCell = document.createElement('div');
        doubleZeroCell.classList.add('board-cell', 'green');
        doubleZeroCell.dataset.betType = 'number';
        doubleZeroCell.dataset.number = '00';
        doubleZeroCell.textContent = '00';
        // Place 00 cell
        doubleZeroCell.style.gridColumn = '5'; // Last column
        doubleZeroCell.style.gridRow = '1 / span 12'; // Spans across all 12 rows of numbers
        boardLayout.appendChild(doubleZeroCell);

        // Adjust 0 cell to occupy only first column
        zeroCell.style.gridColumn = '1';
        zeroCell.style.gridRow = '1 / span 12';
    } else {
        // For European roulette, 0 cell spans across the first 2 columns
        zeroCell.style.gridColumn = '1 / span 2';
        zeroCell.style.gridRow = '1 / span 12';
    }


    // Create number cells (1-36)
    for (let i = 1; i <= 36; i++) {
        const cell = document.createElement('div');
        cell.classList.add('board-cell');
        const numberData = ROULETTE_NUMBERS.find(n => n.num === String(i));
        if (numberData) {
            cell.classList.add(numberData.color);
        }
        cell.dataset.betType = 'number';
        cell.dataset.number = i;
        cell.textContent = i;

        // Calculate grid position (3 columns)
        const col = (i % 3 === 0) ? 4 : (i % 3 === 1) ? 2 : 3;
        const row = Math.ceil(i / 3); // 12 rows
        
        cell.style.gridColumn = col;
        cell.style.gridRow = row;
        boardLayout.appendChild(cell);
    }

    // Create column bets (2:1)
    for (let i = 1; i <= 3; i++) {
        const colCell = document.createElement('div');
        colCell.classList.add('board-cell');
        colCell.dataset.betType = 'column';
        colCell.dataset.columnIndex = i;
        colCell.textContent = '2:1';
        colCell.style.gridColumn = i === 1 ? 2 : i === 2 ? 3 : 4;
        colCell.style.gridRow = '13'; // Placed below number grid
        boardLayout.appendChild(colCell);
    }

    // Create dozens bets (1st 12, 2nd 12, 3rd 12)
    for (let i = 1; i <= 3; i++) {
        const dozenCell = document.createElement('div');
        dozenCell.classList.add('board-cell');
        dozenCell.dataset.betType = 'dozen';
        dozenCell.dataset.dozenIndex = i;
        dozenCell.textContent = `${i}st 12`;
        if (i === 2) dozenCell.textContent = '2nd 12';
        if (i === 3) dozenCell.textContent = '3rd 12';
        dozenCell.style.gridColumn = i === 1 ? 2 : i === 2 ? 3 : 4;
        dozenCell.style.gridRow = '14'; // Placed below column bets
        boardLayout.appendChild(dozenCell);
    }
    
    // Create half bets (1-18, Even, Red, Black, Odd, 19-36)
    const bottomRowBets = document.createElement('div');
    bottomRowBets.classList.add('bottom-row-bets'); // For proper layout in CSS
    boardLayout.appendChild(bottomRowBets);


    const halfBets = [
        { type: 'half', value: '1-18', text: '1-18' },
        { type: 'parity', value: 'even', text: 'PAIR' },
        { type: 'color', value: 'red', text: 'ROUGE', class: 'red' },
        { type: 'color', value: 'black', text: 'NOIR', class: 'black' },
        { type: 'parity', value: 'odd', text: 'IMPAIR' },
        { type: 'half', value: '19-36', text: '19-36' }
    ];

    halfBets.forEach(bet => {
        const cell = document.createElement('div');
        cell.classList.add('board-cell');
        cell.dataset.betType = bet.type;
        cell.dataset.betValue = bet.value;
        cell.textContent = bet.text;
        if (bet.class) cell.classList.add(bet.class);
        bottomRowBets.appendChild(cell);
    });

    // Add event listeners to all board cells
    document.querySelectorAll('.board-cell').forEach(cell => {
        cell.addEventListener('click', handleBoardCellClick);
    });
}

function handleBoardCellClick(event) {
    if (rouletteSpinning) return;

    const cell = event.currentTarget;
    const betType = cell.dataset.betType;
    let betKey;

    if (betType === 'number') {
        betKey = `number_${cell.dataset.number}`;
    } else if (betType === 'color') {
        betKey = `color_${cell.dataset.value}`;
    } else if (betType === 'parity') {
        betKey = `parity_${cell.dataset.value}`;
    } else if (betType === 'half') {
        betKey = `half_${cell.dataset.value}`;
    } else if (betType === 'dozen') {
        betKey = `dozen_${cell.dataset.dozenIndex}`;
    } else if (betType === 'column') {
        betKey = `column_${cell.dataset.columnIndex}`;
    } else {
        return; // Unknown bet type
    }

    if (balance < currentBetAmount) {
        document.getElementById('roulette-result-message').textContent = "Solde insuffisant pour placer cette mise !";
        return;
    }

    placedBets[betKey] = (placedBets[betKey] || 0) + currentBetAmount;
    balance -= currentBetAmount;
    updateBalanceDisplay();
    updateBetDisplay();
    updateCellChip(cell, placedBets[betKey]);

    document.getElementById('roulette-spin-button').disabled = false; // Enable spin button
    document.getElementById('roulette-result-message').textContent = ""; // Clear previous messages
}

function updateCellChip(cellElement, amount) {
    let chip = cellElement.querySelector('.bet-chip');
    if (!chip) {
        chip = document.createElement('div');
        chip.classList.add('bet-chip');
        cellElement.appendChild(chip);
    }
    chip.textContent = amount;
    cellElement.classList.add('active-bet');
}

function updateBetDisplay() {
    const placedBetsElement = document.getElementById('roulette-placed-bets');
    const totalBet = Object.values(placedBets).reduce((sum, bet) => sum + bet, 0);

    if (totalBet === 0) {
        placedBetsElement.textContent = "Mises Placées : Aucune";
        document.getElementById('roulette-spin-button').disabled = true; // Disable if no bets
    } else {
        let displayString = "Mises Placées : ";
        const betEntries = Object.entries(placedBets);
        displayString += betEntries.map(([key, amount]) => {
            let label = key.replace('_', ' ').replace('number', '#');
            if (label.startsWith('color')) label = label.split(' ')[1].toUpperCase();
            if (label.startsWith('parity')) label = label.split(' ')[1].toUpperCase();
            if (label.startsWith('half')) label = label.split(' ')[1];
            if (label.startsWith('dozen')) label = label.split(' ')[1] + ' (Douzaine)';
            if (label.startsWith('column')) label = label.split(' ')[1] + ' (Colonne)';

            return `${label}: ${amount}€`;
        }).join(', ');
        placedBetsElement.textContent = displayString;
    }
}

function clearAllBets() {
    if (rouletteSpinning) return;

    for (const key in placedBets) {
        balance += placedBets[key]; // Return money to balance
    }
    placedBets = {};
    updateBalanceDisplay();
    updateBetDisplay();

    document.querySelectorAll('.board-cell').forEach(cell => {
        cell.classList.remove('active-bet');
        const chip = cell.querySelector('.bet-chip');
        if (chip) chip.remove();
    });
    document.getElementById('roulette-result-message').textContent = "Toutes les mises ont été effacées.";
    document.getElementById('roulette-spin-button').disabled = true; // Disable spin button
}


function spinRoulette() {
    if (Object.keys(placedBets).length === 0) {
        document.getElementById('roulette-result-message').textContent = "Veuillez placer une mise avant de tourner !";
        return;
    }
    if (rouletteSpinning) return;

    rouletteSpinning = true;
    document.getElementById('roulette-spin-button').disabled = true;
    document.getElementById('roulette-clear-bets').disabled = true;
    document.getElementById('roulette-bet-input').disabled = true;
    document.querySelectorAll('.board-cell').forEach(cell => cell.classList.add('disabled-cell'));

    document.getElementById('roulette-result-message').textContent = "La roue tourne...";

    const wheel = document.querySelector('.wheel-inner');
    const randomIndex = Math.floor(Math.random() * ROULETTE_NUMBERS.length);
    const winningNumberData = ROULETTE_NUMBERS[randomIndex];

    // Calculate the rotation needed to land on the winning number
    // We add multiple full rotations to make it spin for a while
    const baseRotation = 360 * 5; // Spin 5 full times
    // Each segment is (360 / ROULETTE_NUMBERS.length) degrees wide.
    // We want the pointer to land in the middle of the target segment.
    const rotationForTarget = (randomIndex * (360 / ROULETTE_NUMBERS.length));
    
    // Adjust to land precisely
    // A slight random offset within the segment for more natural feel
    const randomOffset = (Math.random() * (360 / ROULETTE_NUMBERS.length)) - ((360 / ROULETTE_NUMBERS.length) / 2);

    // Apply the rotation in reverse because the wheel spins, not the pointer
    wheel.style.setProperty('--spin-rotation', `${baseRotation + rotationForTarget + randomOffset}deg`);
    // Ensure the wheel starts from a known state (0 deg relative to its own previous state)
    wheel.style.transform = `rotate(${baseRotation + rotationForTarget + randomOffset}deg)`;

    // Store the final rotation as current-rotation for next spin
    const currentRotation = parseFloat(wheel.style.transform.replace('rotate(', '').replace('deg)', '')) || 0;
    wheel.style.setProperty('--current-rotation', `${currentRotation}deg`);


    setTimeout(() => {
        rouletteSpinning = false;
        determineRouletteWinner(winningNumberData.num, winningNumberData.color);
    }, 6000); // Duration of the CSS transition
}


function determineRouletteWinner(winningNumber, winningColor) {
    let totalWin = 0;

    // Check individual number bets
    const numBetKey = `number_${winningNumber}`;
    if (placedBets[numBetKey]) {
        totalWin += placedBets[numBetKey] * PAYOUTS.number;
    }

    // Check color bets
    const colorBetKey = `color_${winningColor}`;
    if (placedBets[colorBetKey] && winningColor !== 'green') { // No payout on green for color bets
        totalWin += placedBets[colorBetKey] * PAYOUTS.color;
    }

    // Check parity bets (Even/Odd)
    if (winningNumber !== '0' && winningNumber !== '00') { // 0 and 00 are neither even nor odd in roulette
        const num = parseInt(winningNumber);
        if (num % 2 === 0 && placedBets['parity_even']) {
            totalWin += placedBets['parity_even'] * PAYOUTS.parity;
        } else if (num % 2 !== 0 && placedBets['parity_odd']) {
            totalWin += placedBets['parity_odd'] * PAYOUTS.parity;
        }
    }

    // Check half bets (1-18 / 19-36)
    if (winningNumber !== '0' && winningNumber !== '00') {
        const num = parseInt(winningNumber);
        if (num >= 1 && num <= 18 && placedBets['half_1-18']) {
            totalWin += placedBets['half_1-18'] * PAYOUTS.half;
        } else if (num >= 19 && num <= 36 && placedBets['half_19-36']) {
            totalWin += placedBets['half_19-36'] * PAYOUTS.half;
        }
    }

    // Check dozen bets (1st 12, 2nd 12, 3rd 12)
    if (winningNumber !== '0' && winningNumber !== '00') {
        const num = parseInt(winningNumber);
        if (num >= 1 && num <= 12 && placedBets['dozen_1']) {
            totalWin += placedBets['dozen_1'] * PAYOUTS.dozen;
        } else if (num >= 13 && num <= 24 && placedBets['dozen_2']) {
            totalWin += placedBets['dozen_2'] * PAYOUTS.dozen;
        } else if (num >= 25 && num <= 36 && placedBets['dozen_3']) {
            totalWin += placedBets['dozen_3'] * PAYOUTS.dozen;
        }
    }

    // Check column bets
    if (winningNumber !== '0' && winningNumber !== '00') {
        const num = parseInt(winningNumber);
        // Column 1: 1, 4, 7, ..., 34
        if (num % 3 === 1 && placedBets['column_1']) {
            totalWin += placedBets['column_1'] * PAYOUTS.column;
        }
        // Column 2: 2, 5, 8, ..., 35
        else if (num % 3 === 2 && placedBets['column_2']) {
            totalWin += placedBets['column_2'] * PAYOUTS.column;
        }
        // Column 3: 3, 6, 9, ..., 36
        else if (num % 3 === 0 && placedBets['column_3']) {
            totalWin += placedBets['column_3'] * PAYOUTS.column;
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

}


function resetRouletteGame() {
    placedBets = {}; // Clear all bets
    updateBetDisplay();

    document.getElementById('roulette-spin-button').disabled = true;
    document.getElementById('roulette-clear-bets').disabled = false;
    document.getElementById('roulette-bet-input').disabled = false;
    document.querySelectorAll('.board-cell').forEach(cell => cell.classList.remove('disabled-cell'));

    // Remove all chips from the board
    document.querySelectorAll('.bet-chip').forEach(chip => chip.remove());
    document.querySelectorAll('.board-cell').forEach(cell => cell.classList.remove('active-bet'));
}