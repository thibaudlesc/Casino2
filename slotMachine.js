// Variables spécifiques à la Machine à Sous
let freeSpins = 0;
let lastBetAmount = 0; // Store the bet amount from when free spins were awarded
const NUM_REELS = 5;
const NUM_ROWS = 3;
let autoSpinInterval = null; // Variable to hold the interval for auto-spin
let isSpinning = false; // Flag to prevent multiple spins during animation

// Définition des symboles et de leurs poids pour la volatilité (simplifiée)
const SYMBOLS = ['🍒', '🍊', '🔔', '💎', '7️⃣', 'BAR', '⭐', '💯', '💣']; // Changed '💰' to '💯' and '💩' to '💣'
const SYMBOL_WEIGHTS = { // Adjust weights for volatility and rarity of scatter
    '🍒': 0.25, // Cherry (frequent, low payout)
    '🍊': 0.20,
    '🔔': 0.18,
    '💎': 0.15,
    '7️⃣': 0.11, // Higher payout
    'BAR': 0.07, // Highest payout for BAR combinations
    '⭐': 0.05, // Scatter for Free Spins
    '💯': 0.07, // Jackpot Symbol (appears only during free spins) - Changed from '💰'
    '💣': 0.07 // Malus Symbol (appears only during free spins) - Changed from '💩'
};

// Payout table for 3-row, 5-reel slot machine (per active payline)
const PAYTABLE = {
    // Symbol, count: {payoutMultiplier, isFreeSpinTrigger (optional)}
    '🍒': { 3: { payout: 2 }, 4: { payout: 5 }, 5: { payout: 10 } },
    '🍊': { 3: { payout: 5 }, 4: { payout: 10 }, 5: { payout: 20 } },
    '🔔': { 3: { payout: 10 }, 4: { payout: 20 }, 5: { payout: 40 } },
    '💎': { 3: { payout: 25 }, 4: { payout: 50 }, 5: { payout: 100 } },
    '7️⃣': { 3: { payout: 50 }, 4: { payout: 100 }, 5: { payout: 250 } },
    'BAR': { 3: { payout: 75 }, 4: { payout: 150 }, 5: { payout: 500 } },
    '⭐': { 3: { freeSpins: 5 }, 4: { freeSpins: 10 }, 5: { freeSpins: 20 } }, // Scatter for Free Spins
};

// Define the paylines (indices of symbols on the grid)
const PAYLINES = [
    [0, 1, 2, 3, 4],       // Top Row
    [5, 6, 7, 8, 9],       // Middle Row
    [10, 11, 12, 13, 14] // Bottom Row
];

const BET_AMOUNTS = [100, 250, 500, 1000, 2000, 7500, 10000, 25000, 50000, 75000, 100000, 200000];


// Function to generate the HTML for symbols for each slot
function generateSlotSymbolsHTML() {
    let symbolsHTML = '';
    // Generate enough symbols for smooth scrolling and to allow for random landing positions
    // We'll use 50 symbols per strip for a visually continuous loop.
    for (let i = 0; i < 50; i++) {
        symbolsHTML += `<span>${SYMBOLS[i % SYMBOLS.length]}</span>`;
    }
    return symbolsHTML;
}

// Function to start the slot machine game
function startSlotMachine() {
    currentGame = 'slot';
    const gameContainer = document.getElementById('game-container');

    let slotsHTML = '';
    for (let row = 0; row < NUM_ROWS; row++) {
        slotsHTML += `<div class="slot-row">`;
        for (let reel = 0; reel < NUM_REELS; reel++) {
            slotsHTML += `
                <div class="slot">
                    <div class="slot-symbol-strip">${generateSlotSymbolsHTML()}</div>
                </div>
            `;
        }
        slotsHTML += `</div>`;
    }

    gameContainer.innerHTML = `
        <h2>✦ MACHINE À SOUS ✦</h2>
        <div id="slots-grid">
            ${slotsHTML}
        </div>

        <p>Solde : <span id="current-balance">${balance}</span> €</p>
        <p id="gain-text">Gain : 0 €</p>
        <p>Tours Gratuits : <span id="free-spins-display">${freeSpins}</span></p>

        <div class="bet-controls">
            <label for="bet-select">Mise :</label>
            <select id="bet-select">
                ${BET_AMOUNTS.map(amount => `<option value="${amount}">${amount >= 10000 ? (amount / 1000) + 'k' : amount}€</option>`).join('')}
            </select>
        </div>
        <br/>
        <button id="spin-button">Lancer</button>
        <button id="auto-spin-button">Auto Spin</button>
        <button onclick="showMainMenu()">Retour au Menu</button>
    `;
    // Initialize display values immediately when slot machine starts
    updateBalanceDisplay();

    document.getElementById('spin-button').addEventListener('click', spinSlots);
    document.getElementById('auto-spin-button').addEventListener('click', toggleAutoSpin);
    // There is no "stop-auto-spin-button" in the generated HTML, so this line is effectively inert
    // document.getElementById('stop-auto-spin-button').addEventListener('click', toggleAutoSpin);

    // Set default bet amount to the first value in the array
    document.getElementById('bet-select').value = BET_AMOUNTS[0];
}

function showMainMenu() {
    // Optional: Stop auto-spin if it's active before reloading
    if (autoSpinInterval) {
        clearInterval(autoSpinInterval);
        autoSpinInterval = null;
    }
    // This line reloads the page, taking you back to the initial state
    location.reload();
}

function updateFreeSpinsDisplay() {
    const freeSpinsSpan = document.getElementById('free-spins-display');
    if (freeSpinsSpan) {
        freeSpinsSpan.textContent = freeSpins;
    }
}

function updateSlotMachineMode() {
    const slotsGrid = document.getElementById('slots-grid');
    const betSelect = document.getElementById('bet-select'); // Changed from bet-input
    const autoSpinButton = document.getElementById('auto-spin-button');

    if (slotsGrid) {
        if (freeSpins > 0) {
            slotsGrid.classList.add('slot-machine-free-spin-mode');
            if (betSelect) { // Changed from betInput
                betSelect.disabled = true; // Disable bet input during free spins
                betSelect.value = lastBetAmount; // Ensure bet is set to last won bet
            }
            if (autoSpinButton) {
                autoSpinButton.disabled = true; // Disable auto-spin during free spins
            }
        } else {
            slotsGrid.classList.remove('slot-machine-free-spin-mode');
            if (betSelect) { // Changed from betInput
                betSelect.disabled = false; // Enable bet input when no free spins
            }
            if (autoSpinButton) {
                autoSpinButton.disabled = false; // Enable auto-spin when no free spins
            }
        }
    }
}

// Function to toggle auto-spin
function toggleAutoSpin() {
    const autoSpinButton = document.getElementById('auto-spin-button');
    const spinButton = document.getElementById('spin-button');
    const betSelect = document.getElementById('bet-select'); // Changed from bet-input

    if (autoSpinInterval) {
        // Stop auto-spin
        clearInterval(autoSpinInterval);
        autoSpinInterval = null;
        autoSpinButton.textContent = 'Auto Spin';
        spinButton.disabled = false;
        betSelect.disabled = false; // Changed from betInput
    } else {
        // Start auto-spin
        autoSpinButton.textContent = 'Arrêter Auto Spin';
        spinButton.disabled = true; // Disable manual spin button
        betSelect.disabled = true; // Disable bet input // Changed from betInput

        // Start the first spin immediately
        spinSlots();

        // Set up interval for subsequent spins
        autoSpinInterval = setInterval(async () => {
            // Check conditions before spinning again
            const currentBet = parseInt(betSelect.value); // Changed from betInput
            if (balance < currentBet && freeSpins === 0) {
                toggleAutoSpin(); // Stop auto-spin if balance is insufficient
                alert("Solde insuffisant pour continuer l'auto-spin !");
                return;
            }
            if (!isSpinning) { // Only spin if not currently spinning
                await spinSlots();
            }
        }, 1000); // Check every 3 seconds for next spin
    }
}


// Function to spin the slots
async function spinSlots() {
    if (isSpinning) return; // Prevent multiple calls while spinning
    isSpinning = true;

    const betSelect = document.getElementById('bet-select'); // Changed from bet-input
    const spinButton = document.getElementById('spin-button');
    const autoSpinButton = document.getElementById('auto-spin-button');
    const slotsGrid = document.getElementById('slots-grid');
    const gameContainer = document.getElementById('game-container');
    let bet = parseInt(betSelect.value); // Changed from betInput

    let isFreeSpinRound = (freeSpins > 0);

    if (isFreeSpinRound) {
        freeSpins--;
        bet = lastBetAmount;
        updateFreeSpinsDisplay();
    } else {
        if (isNaN(bet) || bet <= 0) {
            alert("Veuillez entrer une mise valide (nombre entier positif).");
            toggleAutoSpin(); // Stop auto-spin if bet is invalid
            isSpinning = false;
            return;
        }
        lastBetAmount = bet;
        const totalBetCost = bet;

        if (balance < totalBetCost) {
            alert("Solde insuffisant pour cette mise !");
            toggleAutoSpin(); // Stop auto-spin if balance is insufficient
            isSpinning = false;
            return;
        }
    }

    // Disable buttons during the spin animation
    spinButton.disabled = true;
    betSelect.disabled = true; // Changed from betInput
    if (autoSpinInterval) {
        autoSpinButton.disabled = true;
    }

    if (!isFreeSpinRound) {
        balance -= bet;
        updateBalanceDisplay();
    }

    const slotElements = document.querySelectorAll('#slots-grid .slot');
    const slotSymbolStrips = document.querySelectorAll('#slots-grid .slot-symbol-strip');
    const finalSymbolsGrid = [];

    // Clear previous win/animation classes
    slotElements.forEach(slotEl => {
        slotEl.classList.remove('pop');
    });
    // Remove all specific animation classes before applying new ones
    slotsGrid.classList.remove('slot-machine-new-free-spins', 'slot-machine-big-win', 'slot-machine-jackpot-win', 'slot-machine-malus-mode'); // Added malus-mode
    document.getElementById('gain-text').classList.remove('win-animation');

    // Generate random symbols for all 15 positions in the grid
    for (let i = 0; i < NUM_REELS * NUM_ROWS; i++) {
        // If it's a free spin round, we can have the '💯' or '💣' symbol
        if (isFreeSpinRound) {
            finalSymbolsGrid.push(getRandomSymbolByWeight(true)); // Pass true to allow jackpot and malus symbols
        } else {
            finalSymbolsGrid.push(getRandomSymbolByWeight(false)); // Pass false to disallow jackpot and malus symbols
        }
    }

    const gainText = document.getElementById('gain-text');
    gainText.textContent = `Gain : 0 €`;


    // Start spinning animation for all reels
    slotElements.forEach(slotEl => {
        slotEl.classList.add('spinning');
    });


    const totalSpinDuration = 2000;
    // Dynamically get the height of a single symbol span
    // This makes the spin animation responsive to changes in symbol height via CSS
    const firstSymbolSpan = document.querySelector('.slot-symbol-strip span');
    const symbolHeight = firstSymbolSpan ? firstSymbolSpan.offsetHeight : 110; // Fallback to 110px

    const spinPromises = Array.from(slotSymbolStrips).map((strip, index) => {
        return new Promise(resolve => {
            const targetSymbol = finalSymbolsGrid[index];
            const targetSymbolIndexInSymbolsArray = SYMBOLS.indexOf(targetSymbol);

            // Calculate the position to land on the target symbol within the strip
            // We add extra spins to ensure the animation looks like a full rotation before landing
            const totalSymbolsInStrip = SYMBOLS.length; // Number of unique symbols in the strip
            const extraSpins = 3; // Number of full rotations before landing on target
            const finalStopPosition = (extraSpins * totalSymbolsInStrip * symbolHeight) + (targetSymbolIndexInSymbolsArray * symbolHeight);

            // Reset transform and transition to instantly snap to the start of the "next" loop
            strip.style.transition = 'none';
            strip.style.transform = `translateY(0px)`;
            void strip.offsetWidth; // Trigger reflow for transition 'none' to apply immediately

            // Apply the spinning transition with a delay for staggered reel stops
            const delay = index * 100; // Stagger delay per reel
            strip.style.transition = `transform ${totalSpinDuration + delay}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`; // Ease-out cubic-bezier

            // Apply the final transform to land on the target symbol
            strip.style.transform = `translateY(-${finalStopPosition}px)`;

            // Resolve the promise after the animation duration plus its delay
            setTimeout(() => {
                slotElements[index].classList.remove('spinning'); // Remove spinning class once animation is done
                resolve();
            }, totalSpinDuration + delay);
        });
    });

    await Promise.all(spinPromises); // Wait for all reels to stop

    // After reels stop, calculate payout
    const result = calculatePayout(finalSymbolsGrid, bet);
    let totalPayout = result.totalPayout;
    let newFreeSpinsEarned = result.newFreeSpins;
    const winningElementsIndices = result.winningElementsIndices;

    // Check for Malus win (5 '💣' symbols during free spins)
    const malusSymbol = '💣'; // Changed from '💩'
    let malusSymbolCount = 0;
    finalSymbolsGrid.forEach(symbol => {
        if (symbol === malusSymbol) {
            malusSymbolCount++;
        }
    });

    if (malusSymbolCount >= 5 && isFreeSpinRound) {
        balance = Math.floor(balance / 2); // Divide balance by 2
        document.getElementById('gain-text').textContent = `MALUS! Votre solde est divisé par 2 !`;
        triggerMalusPhrase(gameContainer); // Trigger the custom malus phrase animation
        
        // Add malus animation class to the grid outline
        if (slotsGrid) {
            slotsGrid.classList.add('slot-machine-malus-mode');
            setTimeout(() => {
                slotsGrid.classList.remove('slot-machine-malus-mode');
            }, 3500); // Animation duration for malus glow
        }
    }

    // Check for Jackpot win
    const jackpotSymbol = '💯'; // Changed from '💰'
    let jackpotSymbolCount = 0;
    finalSymbolsGrid.forEach(symbol => {
        if (symbol === jackpotSymbol) {
            jackpotSymbolCount++;
        }
    });

    if (jackpotSymbolCount >= 5 && isFreeSpinRound) {
        totalPayout += progressiveJackpot; // Award the progressive jackpot
        document.getElementById('gain-text').textContent = `JACKPOT! Vous avez gagné ${progressiveJackpot.toFixed(2)} € !`;
        // Reset the progressive jackpot after it's won
        progressiveJackpot = 10000; // Reset to initial value
        saveProgressiveJackpot();
        updateProgressiveJackpotDisplay();
        triggerConfetti('jackpot-win', gameContainer); // Trigger confetti for jackpot
        triggerJackpotWordAnimation(gameContainer); // Trigger new jackpot word animation
        
        balance += progressiveJackpot; // Add jackpot to balance
        triggerFloatingWinNumbers(progressiveJackpot, gameContainer); // Show floating numbers for jackpot
        
        // Add the new jackpot animation class for the grid outline
        if (slotsGrid) {
            slotsGrid.classList.add('slot-machine-jackpot-win');
            setTimeout(() => {
                slotsGrid.classList.remove('slot-machine-jackpot-win');
            }, 3500); // Animation duration is 3s, remove after 3.5s
        }

    }


    if (newFreeSpinsEarned > 0 && slotsGrid) {
        slotsGrid.classList.add('slot-machine-new-free-spins');
        triggerConfetti('new-free-spins', gameContainer);
        setTimeout(() => {
            slotsGrid.classList.remove('slot-machine-new-free-spins');
        }, 600);
    }

    balance += totalPayout; // Apply total payout after malus check (if no malus occurred)
    freeSpins += newFreeSpinsEarned;

    updateBalanceDisplay();
    updateFreeSpinsDisplay();
    updateSlotMachineMode();

    // Update gain text only if it wasn't a malus (malus has its own text)
    if (malusSymbolCount < 5) {
        gainText.textContent = `Gain : ${totalPayout} €`; 
    }
    
    if (totalPayout > 0 || newFreeSpinsEarned > 0 || jackpotSymbolCount >= 5 || malusSymbolCount >= 5) { // Include malus win in animation check
        gainText.classList.add('win-animation');

        const isBigWin = totalPayout >= (bet * 10) || newFreeSpinsEarned > 0 || jackpotSymbolCount >= 5; // Updated big win condition
        // Only apply 'slot-machine-big-win' if it's not a jackpot win or malus win
        if (isBigWin && slotsGrid && jackpotSymbolCount < 5 && malusSymbolCount < 5) {
            slotsGrid.classList.add('slot-machine-big-win');
            triggerConfetti('big-win', gameContainer);
            setTimeout(() => {
                slotsGrid.classList.remove('slot-machine-big-win');
            }, 2000);
        }

        // Floating numbers only for positive gains (not for malus)
        if (totalPayout > 0) {
            triggerFloatingWinNumbers(totalPayout, gameContainer);
        }

        winningElementsIndices.forEach(idx => {
            if (slotElements[idx]) {
                slotElements[idx].classList.add('pop');
            }
        });

        setTimeout(() => {
            slotElements.forEach(slotEl => slotEl.classList.remove('pop'));
            gainText.classList.remove('win-animation');
        }, 1500);
    }

    // This is where the 3-second delay *after* the result display happens
    setTimeout(() => {
        isSpinning = false; // Reset the spinning flag after the delay

        if (freeSpins > 0) {
            // If there are still free spins, trigger the next one automatically
            // A slight delay ensures the UI updates and animations complete before the next spin starts
            setTimeout(() => {
                spinSlots();
            }, 1000); // Short delay (e.g., 1 second) between automatic free spins
        } else {
            // If no free spins left, or it was a regular spin
            if (!autoSpinInterval) {
                // If auto-spin is not active, re-enable manual spin and bet controls
                spinButton.disabled = false;
                betSelect.disabled = false;
            } else {
                // If auto-spin was active and free spins just finished, re-enable auto-spin button
                // and potentially bet select if auto-spin is managing regular spins now.
                // The autoSpinInterval itself will trigger the next regular spin.
                autoSpinButton.disabled = false;
                betSelect.disabled = false; // Re-enable bet select for regular auto-spin
            }
        }
    }, 3000); // This is the 3-second pause after results are shown for all spins
}


// --- FONCTIONS DE CALCUL DES GAINS ET TOURS GRATUITS ---
function calculatePayout(finalSymbolsGrid, betPerSpin) {
    let totalPayout = 0;
    let newFreeSpins = 0;
    const winningElementsIndices = new Set();

    // Helper to add winning indices
    const addWinningIndices = (indices) => {
        indices.forEach(idx => winningElementsIndices.add(idx));
    };

    // 1. Check each defined payline (horizontal wins)
    PAYLINES.forEach(paylineIndices => {
        const lineSymbols = paylineIndices.map(idx => finalSymbolsGrid[idx]);

        let currentSymbol = lineSymbols[0];
        let currentCount = 1;

        // Check for consecutive matches from left to right on this line
        for (let i = 1; i < NUM_REELS; i++) {
            if (lineSymbols[i] === currentSymbol) {
                currentCount++;
            } else {
                break; // Sequence broken
            }
        }

        // Check payout for the longest sequence (must be 3 or more)
        if (currentCount >= 3) {
            const symbolPayouts = PAYTABLE[currentSymbol];
            if (symbolPayouts && symbolPayouts[currentCount]) {
                const winData = symbolPayouts[currentCount];
                if (winData.payout) {
                    totalPayout += betPerSpin * winData.payout;
                    for (let i = 0; i < currentCount; i++) {
                        addWinningIndices([paylineIndices[i]]); // Add symbols that formed the win
                    }
                }
                // Free spins can be triggered by line wins if defined in PAYTABLE (though usually for scatters)
                if (winData.freeSpins) {
                    newFreeSpins += winData.freeSpins;
                    for (let i = 0; i < currentCount; i++) {
                        addWinningIndices([paylineIndices[i]]);
                    }
                }
            }
        }
    });

    // 2. Check for scatter wins (any 3+ Star symbols anywhere on the grid)
    const scatterSymbol = '⭐';
    let scatterCount = 0;
    const scatterIndices = [];
    finalSymbolsGrid.forEach((symbol, index) => {
        if (symbol === scatterSymbol) {
            scatterCount++;
            scatterIndices.push(index);
        }
    });

    if (scatterCount >= 3) {
        const scatterPayouts = PAYTABLE[scatterSymbol];
        if (scatterPayouts && scatterPayouts[scatterCount] && scatterPayouts[scatterCount].freeSpins) {
            newFreeSpins += scatterPayouts[scatterCount].freeSpins;
            addWinningIndices(scatterIndices); // Highlight all scatters
        }
    }

    // --- NEW RULES ---

    // 3. More than 4 of the same item (anywhere on the grid) - x0.4 the bet
    const symbolCounts = {};
    finalSymbolsGrid.forEach(symbol => {
        symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
    });

    for (const symbol in symbolCounts) {
        if (symbolCounts[symbol] >= 4) { // Changed condition to >=4 as per your note for "4 or more"
            totalPayout += betPerSpin * 0.25; // This is x0.25 as per your current code logic. If you meant x0.4 from your comment, change this to 0.4.
            // Optionally highlight all occurrences of this symbol
            finalSymbolsGrid.forEach((s, idx) => {
                if (s === symbol) {
                    winningElementsIndices.add(idx);
                }
            });
        }
    }

    // 4. Full column of the same item - x0.45 the bet
    for (let reel = 0; reel < NUM_REELS; reel++) {
        const colSymbols = [
            finalSymbolsGrid[reel],          // Top row of this reel
            finalSymbolsGrid[reel + NUM_REELS], // Middle row of this reel
            finalSymbolsGrid[reel + NUM_REELS * 2]   // Bottom row of this reel
        ];
        if (colSymbols[0] === colSymbols[1] && colSymbols[1] === colSymbols[2]) {
            totalPayout += betPerSpin * 0.25; // This is x0.25 as per your current code logic. If you meant x0.45 from your comment, change this to 0.45.
            addWinningIndices([reel, reel + NUM_REELS, reel + NUM_REELS * 2]);
        }
    }

    // 5. Diagonal (top-left to bottom-right) - x0.2 the bet
    // Indices for the main diagonal: 0, 6, 12
    const diagonalSymbols = [
        finalSymbolsGrid[0],  // Top-left
        finalSymbolsGrid[6],  // Middle-middle
        finalSymbolsGrid[12] // Bottom-right
    ];

    if (diagonalSymbols[0] === diagonalSymbols[1] && diagonalSymbols[1] === diagonalSymbols[2]) {
        totalPayout += betPerSpin * 0.1; // This is x0.1 as per your current code logic. If you meant x0.2 from your comment, change this to 0.2.
        addWinningIndices([0, 6, 12]);
    }

    return {
        totalPayout: totalPayout,
        newFreeSpins: newFreeSpins,
        winningElementsIndices: Array.from(winningElementsIndices) // Convert Set to Array
    };
}


// Utility function to get a random symbol based on weights
function getRandomSymbolByWeight(allowSpecialSymbols = false) {
    let weightedSymbols = [];
    let symbolsAndWeights = {};

    // Clone the original SYMBOL_WEIGHTS for safe modification
    for (const sym in SYMBOL_WEIGHTS) {
        symbolsAndWeights[sym] = SYMBOL_WEIGHTS[sym];
    }

    // Remove special symbols if not allowed
    if (!allowSpecialSymbols) {
        delete symbolsAndWeights['💯']; // Removed jackpot symbol
        delete symbolsAndWeights['💣']; // Removed malus symbol
    }

    // Populate weightedSymbols array based on scaled weights
    for (const symbol in symbolsAndWeights) {
        // Multiply by 100 for better granularity and to avoid floating point issues
        const count = Math.round(symbolsAndWeights[symbol] * 100);
        for (let i = 0; i < count; i++) {
            weightedSymbols.push(symbol);
        }
    }

    if (weightedSymbols.length === 0) {
        // Fallback in case no symbols are left (should ideally not happen with valid weights)
        console.error("Aucun symbole disponible pour la sélection pondérée ! Retour d'un symbole par défaut.");
        return '❓'; // Return a default placeholder symbol
    }

    // Pick a random symbol from the weighted array
    return weightedSymbols[Math.floor(Math.random() * weightedSymbols.length)];
}

// --- CONFETTI FUNCTION ---
function triggerConfetti(type, parentElement) {
    if (!parentElement) return;

    let confettiContainer = parentElement.querySelector('.confetti-container');
    if (!confettiContainer) {
        confettiContainer = document.createElement('div');
        confettiContainer.classList.add('confetti-container');
        parentElement.appendChild(confettiContainer);
    } else {
        confettiContainer.innerHTML = ''; // Clear previous confetti
    }

    // Adjust confetti count based on the win type
    const numConfetti = (type === 'jackpot-win') ? 300 : ((type === 'big-win' || type === 'new-free-spins') ? 100 : 50);

    for (let i = 0; i < numConfetti; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');

        // Position confetti relative to the parent element's dimensions
        const startLeft = Math.random() * parentElement.offsetWidth;
        // Start from the top 20% of the parent element, slightly random
        const startTop = Math.random() * parentElement.offsetHeight * 0.2;
        // Random horizontal movement at the end
        const randX = (Math.random() - 0.1) * 2; // -1 to 1

        confetti.style.setProperty('--start-left', `${startLeft}px`);
        confetti.style.setProperty('--start-top', `${startTop}px`);
        confetti.style.setProperty('--rand-x', `${randX}`); // Pass random factor to CSS

        confetti.style.width = `${Math.random() * 8 + 5}px`;
        confetti.style.height = confetti.style.width;
        const colors = ['#f0f', '#0ff', '#ff0', '#0f0', '#f00', '#00f'];
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        confetti.style.animationDuration = `${Math.random() * 1.5 + 1.5}s`;

        confettiContainer.appendChild(confetti);
    }

    setTimeout(() => {
        if (confettiContainer) {
            confettiContainer.remove();
        }
    }, 3000); // Ensure this matches the longest confetti animation duration + delay
}

// --- FLOATING WIN NUMBERS FUNCTION ---
function triggerFloatingWinNumbers(amount, parentElement) {
    if (!parentElement || amount === 0) return; // Only trigger for non-zero amounts

    let floatingContainer = parentElement.querySelector('.floating-win-number-container');
    if (!floatingContainer) {
        floatingContainer = document.createElement('div');
        floatingContainer.classList.add('floating-win-number-container');
        parentElement.appendChild(floatingContainer);
    } else {
        floatingContainer.innerHTML = ''; // Clear previous numbers
    }

    // Determine prefix based on amount (positive or negative)
    const prefix = amount > 0 ? '+' : '';
    const displayAmount = Math.abs(amount);

    // Number of floating numbers to generate, more for larger amounts
    const numNumbers = Math.min(Math.floor(displayAmount / 20) + 1, 10);
    const baseValue = Math.floor(displayAmount / numNumbers);
    const remainingValue = displayAmount % numNumbers;

    for (let i = 0; i < numNumbers; i++) {
        const numberSpan = document.createElement('span');
        numberSpan.classList.add('floating-win-number');

        let value = baseValue;
        if (i < remainingValue) { // Distribute remainder
            value++;
        }
        numberSpan.textContent = `${prefix}${value}€`;

        // Random starting position within the parent element
        // Distribute within a reasonable central area of the parent for better visibility
        const startX = Math.random() * (parentElement.offsetWidth * 0.6) + (parentElement.offsetWidth * 0.2);
        const startY = Math.random() * (parentElement.offsetHeight * 0.6) + (parentElement.offsetHeight * 0.2);
        const endOffsetX = (Math.random() - 0.5) * 100; // Float slightly left or right

        numberSpan.style.setProperty('--start-x', `${startX}px`);
        numberSpan.style.setProperty('--start-y', `${startY}px`);
        numberSpan.style.setProperty('--end-offset-x', `${endOffsetX}px`);
        numberSpan.style.animationDelay = `${Math.random() * 0.2}s`; // Stagger animation start
        numberSpan.style.animationDuration = `${Math.random() * 0.8 + 1.5}s`; // Vary duration

        // Add a class for negative numbers to potentially style them differently (e.g., red)
        if (amount < 0) {
            numberSpan.classList.add('negative-floating-number');
        }

        floatingContainer.appendChild(numberSpan);
    }

    setTimeout(() => {
        if (floatingContainer) {
            floatingContainer.remove();
        }
    }, 1500); // Ensure this matches the longest floating number animation duration + delay
}


// Nouvelle fonction pour l'animation du mot "JACKPOT"
function triggerJackpotWordAnimation(parentElement) {
    if (!parentElement) return;

    // Crée un conteneur temporaire pour le mot JACKPOT afin de gérer le z-index et la position
    let jackpotWordContainer = document.createElement('div');
    jackpotWordContainer.style.position = 'absolute';
    jackpotWordContainer.style.top = '0';
    jackpotWordContainer.style.left = '0';
    jackpotWordContainer.style.width = '100%';
    jackpotWordContainer.style.height = '100%';
    jackpotWordContainer.style.display = 'flex';
    jackpotWordContainer.style.justifyContent = 'center';
    jackpotWordContainer.style.alignItems = 'center';
    jackpotWordContainer.style.pointerEvents = 'none'; // Permet de cliquer à travers
    jackpotWordContainer.style.zIndex = '100'; // S'assurer qu'il est au-dessus de tout

    parentElement.appendChild(jackpotWordContainer);

    // Un seul mot "JACKPOT"
    const jackpotWordSpan = document.createElement('span');
    jackpotWordSpan.classList.add('jackpot-word');
    jackpotWordSpan.textContent = 'JACKPOT';

    // Teinte aléatoire pour une couleur vive
    const randomHue = Math.floor(Math.random() * 360);
    jackpotWordSpan.style.setProperty('--hue', randomHue); // Transmet la teinte au CSS

    // Ajuster la taille de police pour un impact maximum
    jackpotWordSpan.style.fontSize = `4em`; // Taille fixe et grande pour un mot unique

    jackpotWordContainer.appendChild(jackpotWordSpan);

    // Supprimer le conteneur après l'animation
    setTimeout(() => {
        jackpotWordContainer.remove();
    }, 4500); // Doit correspondre à la durée de l'animation CSS + un peu de marge
}

// Nouvelle fonction pour l'animation du mot de malus
function triggerMalusPhrase(parentElement) {
    if (!parentElement) return;

    let malusWordContainer = document.createElement('div');
    malusWordContainer.style.position = 'absolute';
    malusWordContainer.style.top = '0';
    malusWordContainer.style.left = '0';
    malusWordContainer.style.width = '100%';
    malusWordContainer.style.height = '100%';
    malusWordContainer.style.display = 'flex';
    malusWordContainer.style.justifyContent = 'center';
    malusWordContainer.style.alignItems = 'center';
    malusWordContainer.style.pointerEvents = 'none';
    malusWordContainer.style.zIndex = '102'; // Encore plus élevé pour s'assurer qu'il est au-dessus du jackpot

    parentElement.appendChild(malusWordContainer);

    const malusWordSpan = document.createElement('span');
    malusWordSpan.classList.add('malus-phrase');
    malusWordSpan.textContent = 'Big Zgeg -50%';

    malusWordContainer.appendChild(malusWordSpan);

    setTimeout(() => {
        malusWordContainer.remove();
    }, 3500); // Durée de l'animation du malus phrase + un peu de marge
}