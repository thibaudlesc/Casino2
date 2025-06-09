// Variables spécifiques à la Machine à Sous
let freeSpins = 0;
let lastBetAmount = 0; // Store the bet amount from when free spins were awarded
const NUM_REELS = 5;
const NUM_ROWS = 3;
let autoSpinInterval = null; // Variable to hold the interval for auto-spin
let isSpinning = false; // Flag to prevent multiple calls while spinning
let autoSpinRemaining = 0; // New: Variable to track remaining auto spins

// Définition des symboles et de leurs poids pour la volatilité (simplifiée)
const SYMBOLS = ['🍒', '🍊', '🔔', '💎', '7️⃣', 'BAR', '⭐', '💯', '💣']; // Changed '💰' to '💯' and '💩' to '💣'

// Original SYMBOL_WEIGHTS. We will modify a copy based on active cosmetics.
const ORIGINAL_SYMBOL_WEIGHTS = {
    '🍒': 0.25, // Cherry (frequent, low payout)
    '🍊': 0.20,
    '🔔': 0.18,
    '💎': 0.15,
    '7️⃣': 0.11, // Higher payout
    'BAR': 0.07, // Highest payout for BAR combinations
    '⭐': 0.05, // Scatter for Free Spins
    '💯': 0.06, // Jackpot Symbol (appears only during free spins) - Changed from '💰'
    '💣': 0.10 // Malus Symbol (appears only during free spins) - Changed from '💩'
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
function initSlotMachine() {
    currentGame = 'slot';
    // Populate the bet select options
    const betSelect = document.getElementById('bet-select');
    betSelect.innerHTML = BET_AMOUNTS.map(amount => `<option value="${amount}">${amount >= 10000 ? (amount / 1000) + 'k' : amount}€</option>`).join('');

    // Generate slot reels HTML
    const slotsGrid = document.getElementById('slots-grid');
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
    slotsGrid.innerHTML = slotsHTML;

    // Add the symbol stats display element below the slots grid
    const symbolStatsDisplayHTML = `
        <div id="symbol-stats-display" class="symbol-stats-display">
            <h4>Statistiques des symboles</h4>
            <div class="symbol-stats-grid">
                <!-- Symbol stats will be populated here by JavaScript -->
            </div>
        </div>
    `;
    const gameContainer = document.querySelector('#slot-machine-container');
    if (gameContainer) {
        // Insérer les statistiques des symboles après les boutons de contrôle
        const backToMenuButton = document.getElementById('back-to-menu-slot');
        if (backToMenuButton) {
            backToMenuButton.insertAdjacentHTML('afterend', symbolStatsDisplayHTML);
        } else {
            // Fallback if the button is not found (should not happen with current structure)
            gameContainer.insertAdjacentHTML('beforeend', symbolStatsDisplayHTML);
        }
    }

    // Initialize display values immediately when slot machine starts
    updateBalanceDisplay(firebaseService.getUserBalance());

    document.getElementById('spin-button').addEventListener('click', spinSlots);
    document.getElementById('auto-spin-button').addEventListener('click', toggleAutoSpin);

    // Set default bet amount to the first value in the array
    betSelect.value = BET_AMOUNTS[0];
    updateFreeSpinsDisplay();
    updateSlotMachineMode();
    updateSymbolStatsDisplay(); // Call to display symbol stats on init
    updateAutoSpinDisplay(); // Initial call to update auto-spin display

    // Make sure to re-apply cosmetic visuals if any are active
    const activeCosmetics = firebaseService.getActiveCosmetics();
    applyActiveCosmeticsToSlot(activeCosmetics);
}

function updateFreeSpinsDisplay() {
    const freeSpinsSpan = document.getElementById('free-spins-display');
    if (freeSpinsSpan) {
        freeSpinsSpan.textContent = freeSpins;
    }
}

// New: Function to update the display for remaining auto spins
function updateAutoSpinDisplay() {
    const autoSpinRemainingDisplay = document.getElementById('auto-spin-remaining-display');
    if (autoSpinRemainingDisplay) {
        if (autoSpinInterval && autoSpinRemaining > 0) {
            autoSpinRemainingDisplay.textContent = `Tours auto restants : ${autoSpinRemaining}`;
        } else {
            autoSpinRemainingDisplay.textContent = ''; // Clear text if auto-spin is not active
        }
    }
}


function updateSlotMachineMode() {
    const slotsGrid = document.getElementById('slots-grid');
    const betSelect = document.getElementById('bet-select');
    const autoSpinButton = document.getElementById('auto-spin-button');

    if (slotsGrid) {
        if (freeSpins > 0) {
            slotsGrid.classList.add('slot-machine-free-spin-mode');
            if (betSelect) {
                betSelect.disabled = true; // Disable bet input during free spins
                betSelect.value = lastBetAmount; // Ensure bet is set to last won bet
            }
            if (autoSpinButton) {
                autoSpinButton.disabled = true; // Disable auto-spin during free spins
            }
        } else {
            slotsGrid.classList.remove('slot-machine-free-spin-mode');
            if (betSelect) {
                betSelect.disabled = false; // Enable bet input when no free spins
            }
            if (autoSpinButton) {
                // Only enable if autoSpinRemaining is not active
                autoSpinButton.disabled = (autoSpinRemaining > 0);
            }
        }
    }
}

// Function to toggle auto-spin
function toggleAutoSpin() {
    const autoSpinButton = document.getElementById('auto-spin-button');
    const spinButton = document.getElementById('spin-button');
    const betSelect = document.getElementById('bet-select');
    const gameContainer = document.getElementById('game-container'); // Get the main game container for message box

    if (autoSpinInterval) {
        // Stop auto-spin
        clearInterval(autoSpinInterval);
        autoSpinInterval = null;
        autoSpinRemaining = 0; // Reset remaining spins
        autoSpinButton.textContent = 'Auto Spin';
        spinButton.disabled = false;
        betSelect.disabled = false;
        updateAutoSpinDisplay(); // Update display to show no remaining spins
    } else {
        // Start auto-spin
        const currentBet = parseInt(betSelect.value);
        if (currentBet <= 0 || isNaN(currentBet)) {
            showMessageBox("Veuillez entrer une mise valide pour l'auto-spin.", gameContainer, 'loss');
            return;
        }
        if (firebaseService.getUserBalance() < currentBet && freeSpins === 0) {
            showMessageBox("Solde insuffisant pour démarrer l'auto-spin !", gameContainer, 'loss');
            return;
        }

        autoSpinRemaining = 100; // New: Set max auto spins
        autoSpinButton.textContent = 'Arrêter Auto Spin';
        spinButton.disabled = true; // Disable manual spin button
        betSelect.disabled = true;
        updateAutoSpinDisplay(); // Initial update for auto-spin display

        // Start the first spin immediately
        spinSlots();

        // Set up interval for subsequent spins
        autoSpinInterval = setInterval(async () => {
            // New: Stop if auto-spin remaining is 0 or less, or if balance is insufficient
            if (autoSpinRemaining <= 0 || (firebaseService.getUserBalance() < currentBet && freeSpins === 0)) {
                toggleAutoSpin(); // Stop auto-spin
                if (firebaseService.getUserBalance() < currentBet && freeSpins === 0) {
                     showMessageBox("Solde insuffisant pour continuer l'auto-spin !", gameContainer, 'loss');
                } else if (autoSpinRemaining <= 0) {
                    showMessageBox("Auto-spin terminé (100 tours atteints).", gameContainer, 'info');
                }
                return;
            }
            if (!isSpinning) { // Only spin if not currently spinning
                await spinSlots();
            }
        }, 3000); // Check every 3 seconds for next spin (adjust as needed for animation duration)
    }
}


// Function to spin the slots
async function spinSlots() {
    if (isSpinning) return; // Prevent multiple calls while spinning
    isSpinning = true;

    const betSelect = document.getElementById('bet-select');
    const spinButton = document.getElementById('spin-button');
    const autoSpinButton = document.getElementById('auto-spin-button');
    const slotsGrid = document.getElementById('slots-grid');
    const gameContainer = document.querySelector('#game-container'); // Get the main game container for floating numbers
    let bet = parseInt(betSelect.value);

    let isFreeSpinRound = (freeSpins > 0);

    if (isFreeSpinRound) {
        freeSpins--;
        bet = lastBetAmount;
        updateFreeSpinsDisplay();
    } else {
        if (isNaN(bet) || bet <= 0) {
            // Using a custom message box instead of alert()
            showMessageBox("Veuillez entrer une mise valide (nombre entier positif).", gameContainer, 'loss');
            toggleAutoSpin(); // Stop auto-spin if bet is invalid
            isSpinning = false;
            return;
        }
        lastBetAmount = bet;
        const totalBetCost = bet;

        if (firebaseService.getUserBalance() < totalBetCost) {
            // Using a custom message box instead of alert()
            showMessageBox("Solde insuffisant pour cette mise !", gameContainer, 'loss');
            toggleAutoSpin(); // Stop auto-spin if balance is insufficient
            isSpinning = false;
            return;
        }
    }

    // Disable buttons during the spin animation
    spinButton.disabled = true;
    betSelect.disabled = true;
    if (autoSpinInterval) {
        autoSpinButton.disabled = true;
    }

    if (!isFreeSpinRound) {
        await firebaseService.saveUserBalance(firebaseService.getUserBalance() - bet); // Deduct bet
    }

    // New: If auto-spin is active, decrement the count and update display
    if (autoSpinInterval) {
        autoSpinRemaining--;
        updateAutoSpinDisplay();
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

    // Get active cosmetics to modify symbol weights and apply visuals
    const activeCosmetics = firebaseService.getActiveCosmetics();
    console.log("SlotMachine: Active cosmetics before spin:", activeCosmetics); // Debug log

    // Generate random symbols for all 15 positions in the grid
    for (let i = 0; i < NUM_REELS * NUM_ROWS; i++) {
        // Pass activeCosmetics to getRandomSymbolByWeight to apply debuffs
        if (isFreeSpinRound) {
            finalSymbolsGrid.push(getRandomSymbolByWeight(true));
        } else {
            finalSymbolsGrid.push(getRandomSymbolByWeight(false));
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

            // Reset transform and transition to instantly snap to the "next" loop
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
    const malusSymbol = '💣';
    let malusSymbolCount = 0;
    finalSymbolsGrid.forEach(symbol => {
        if (symbol === malusSymbol) {
            malusSymbolCount++;
        }
    });

    if (malusSymbolCount >= 5 && isFreeSpinRound) {
        await firebaseService.saveUserBalance(Math.floor(firebaseService.getUserBalance() / 2)); // Divide balance by 2
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
    const jackpotSymbol = '💯'; // Correct symbol for jackpot
    let jackpotSymbolCount = 0;
    finalSymbolsGrid.forEach(symbol => {
        if (symbol === jackpotSymbol) {
            jackpotSymbolCount++;
        }
    });

    if (jackpotSymbolCount >= 5 && isFreeSpinRound) {
        console.log("SlotMachine: Jackpot remporté !");
        const jackpotAmount = firebaseService.getProgressiveJackpot();
        totalPayout += jackpotAmount; // Award the progressive jackpot
        document.getElementById('gain-text').textContent = `JACKPOT! Vous avez gagné ${jackpotAmount.toFixed(2)} € !`;
        // Reset the progressive jackpot to half its current value after it's won
        await firebaseService.saveProgressiveJackpot(jackpotAmount / 2); 
        updateProgressiveJackpotDisplay(firebaseService.getProgressiveJackpot());
        await firebaseService.incrementUserJackpotWins(); // Increment jackpotWins in DB
        triggerConfetti('jackpot-win', gameContainer); // Trigger confetti for jackpot
        triggerJackpotWordAnimation(gameContainer); // Trigger new jackpot word animation

        await firebaseService.saveUserBalance(firebaseService.getUserBalance() + jackpotAmount); // Add jackpot to balance
        showFloatingWinNumbers(jackpotAmount, gameContainer); // Show floating numbers for jackpot

        // Add the new jackpot animation class for the grid outline
        if (slotsGrid) {
            slotsGrid.classList.add('slot-machine-jackpot-win');
            setTimeout(() => {
                slotsGrid.classList.remove('slot-machine-jackpot-win');
            }, 3500); // Animation duration is 3s, remove after 3.5s
        }

    }


    // Only add totalPayout if it wasn't a malus win (malus handled separately)
    if (malusSymbolCount < 5) {
        await firebaseService.saveUserBalance(firebaseService.getUserBalance() + totalPayout);
    }

    freeSpins += newFreeSpinsEarned;

    updateFreeSpinsDisplay();
    updateSlotMachineMode();
    updateSymbolStatsDisplay(); // Update symbol stats after each spin

    // Update gain text only if it wasn't a malus (malus has its own text)
    if (malusSymbolCount < 5) {
        gainText.textContent = `Gain : ${totalPayout.toFixed(2)} €`;
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
            showFloatingWinNumbers(totalPayout, gameContainer);
        } else if (malusSymbolCount >= 5) {
            showFloatingWinNumbers( - (firebaseService.getUserBalance() * 0.5), gameContainer); // Show negative impact of malus
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
            // New: Check if auto-spin is active and remaining spins are more than 0
            if (autoSpinInterval && autoSpinRemaining > 0) {
                // If auto-spin is active and free spins just finished, re-enable auto-spin button
                // and potentially bet select if auto-spin is managing regular spins now.
                // The autoSpinInterval itself will trigger the next regular spin.
                autoSpinButton.disabled = false;
                betSelect.disabled = false; // Re-enable bet select for regular auto-spin
            } else if (!autoSpinInterval) {
                // If auto-spin is not active, re-enable manual spin and bet controls
                spinButton.disabled = false;
                betSelect.disabled = false;
            }
             // New: If auto-spin finished due to reaching 0 spins, ensure it's stopped and display cleared
             if (autoSpinInterval && autoSpinRemaining <= 0) {
                toggleAutoSpin(); // This will stop the interval and reset the display
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
        if (symbolCounts[symbol] >= 4) {
            totalPayout += betPerSpin * 0.25;
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
            totalPayout += betPerSpin * 0.25;
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
        totalPayout += betPerSpin * 0.1;
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
    let currentSymbolWeights = { ...ORIGINAL_SYMBOL_WEIGHTS }; // Start with a copy of original weights
    let totalWeight = 0;

    // Apply cosmetic bonuses/debuffs for individual symbol drop rates
    const activeCosmetics = firebaseService.getActiveCosmetics();
    console.log("getRandomSymbolByWeight: Cosmétiques actifs (pour la détermination du symbole):", activeCosmetics); // Debug log

    SYMBOLS.forEach(symbol => {
        // activeCosmetics for drop rate boosts/debuffs stores the NET effect for a symbol
        const netDropRateEffect = activeCosmetics[symbol] || 0; // If no active cosmetic, effect is 0
        currentSymbolWeights[symbol] = (currentSymbolWeights[symbol] || 0) + netDropRateEffect;
    });

    console.log("getRandomSymbolByWeight: Poids des symboles après application des cosmétiques (avant vérification de la négativité):", currentSymbolWeights); // Debug log

    // Ensure weights don't become negative (cannot have a negative drop chance)
    for (const symbol in currentSymbolWeights) {
        if (currentSymbolWeights[symbol] < 0) {
            currentSymbolWeights[symbol] = 0;
        }
    }

    // Remove special symbols if not allowed, then re-normalize weights
    if (!allowSpecialSymbols) {
        delete currentSymbolWeights['💯']; // Removed jackpot symbol
        delete currentSymbolWeights['💣']; // Removed malus symbol
    }

    // Recalculate totalWeight based on allowed symbols and their modified weights
    for (const symbol in currentSymbolWeights) {
        totalWeight += currentSymbolWeights[symbol];
    }

    let weightedSymbols = [];

    if (totalWeight === 0) {
        console.error("getRandomSymbolByWeight: Le poids total est de zéro après l'application des bonus et le filtrage. Impossible de sélectionner le symbole. Retour à un symbole non spécial aléatoire.");
        // Fallback: If totalWeight is 0, pick a random non-special symbol
        const nonSpecialSymbols = SYMBOLS.filter(s => s !== '💯' && s !== '💣');
        if (nonSpecialSymbols.length > 0) {
            return nonSpecialSymbols[Math.floor(Math.random() * nonSpecialSymbols.length)];
        }
        return '❓'; // Final fallback if even non-special symbols fail
    }


    for (const symbol in currentSymbolWeights) {
        // Only add symbols that are allowed in the current spin mode and have a weight > 0
        if (currentSymbolWeights[symbol] > 0) {
             // Scale weights by 10000 for better granularity when dealing with small decimals
            const count = Math.round((currentSymbolWeights[symbol] / totalWeight) * 10000);
            for (let i = 0; i < count; i++) {
                weightedSymbols.push(symbol);
            }
        }
    }

    if (weightedSymbols.length === 0) {
        console.error("getRandomSymbolByWeight: Aucun symbole disponible pour la sélection pondérée (après remplissage) ! Retour d'un symbole par défaut.");
        // Fallback if weightedSymbols still ends up empty (e.g., due to rounding or extreme debuffs)
        const nonSpecialSymbols = SYMBOLS.filter(s => s !== '💯' && s !== '💣');
        if (nonSpecialSymbols.length > 0) {
            return nonSpecialSymbols[Math.floor(Math.random() * nonSpecialSymbols.length)];
        }
        return '❓'; // Return a default placeholder symbol
    }

    // Pick a random symbol from the weighted array
    return weightedSymbols[Math.floor(Math.random() * weightedSymbols.length)];
}

/**
 * Updates the display showing current drop rates and levels for each symbol.
 */
function updateSymbolStatsDisplay() {
    const symbolStatsGrid = document.querySelector('#symbol-stats-display .symbol-stats-grid');
    if (!symbolStatsGrid) {
        console.warn("updateSymbolStatsDisplay: La grille d'affichage des statistiques de symboles n'a pas été trouvée.");
        return;
    }

    symbolStatsGrid.innerHTML = ''; // Clear existing stats

    const allAvailableCosmetics = firebaseService.getAllAvailableCosmetics();
    const userOwnedCosmetics = firebaseService.getUserOwnedCosmetics();
    const activeCosmetics = firebaseService.getActiveCosmetics(); // Contains the *net effect* value for drop rates
    console.log("updateSymbolStatsDisplay: Cosmétiques actifs (pour l'affichage des statistiques):", activeCosmetics); // Debug log


    // Iterate over all symbols that can have a drop rate boost or debuff
    // Filter out '❓' as it's a fallback, not a standard symbol for stats.
    const symbolsForStats = SYMBOLS.filter(s => s !== '❓');
    const MAX_LEVEL = 5; // Assuming max level is 5 for both boosts and debuffs

    symbolsForStats.forEach(symbol => {
        let originalWeight = ORIGINAL_SYMBOL_WEIGHTS[symbol] || 0;
        let highestLevelOwned = 0;
        // Get the accumulated effect value directly from activeCosmetics
        // This 'value' is the actual drop rate modifier (e.g., +0.01, -0.005)
        let cosmeticEffectValue = 0; 
        if (typeof activeCosmetics[symbol] === 'number') { // Ensure it's a numerical effect
            cosmeticEffectValue = activeCosmetics[symbol];
        }

        // Find the highest level owned for this symbol's drop rate bonus/debuff type
        allAvailableCosmetics.forEach(cosmetic => {
            if ((cosmetic.type === 'slot_symbol_drop_rate_bonus' || cosmetic.type === 'slot_bomb_drop_rate_debuff') &&
                cosmetic.symbol === symbol && userOwnedCosmetics.includes(cosmetic.id)) {
                if (cosmetic.level > highestLevelOwned) {
                    highestLevelOwned = cosmetic.level;
                }
            }
        });

        // Calculate the current displayed drop rate
        let currentDisplayedDropRate = originalWeight + cosmeticEffectValue;
        if (currentDisplayedDropRate < 0) currentDisplayedDropRate = 0; // Drop rate cannot be negative

        const statItem = document.createElement('div');
        statItem.classList.add('symbol-stat-item');

        // Add glow class if max level is reached
        if (highestLevelOwned === MAX_LEVEL) {
            statItem.classList.add('max-level-glow');
        }

        // Calculate the percentage change from the original weight
        const percentageChange = (cosmeticEffectValue * 100); 
        const effectText = percentageChange >= 0 ? `+${percentageChange.toFixed(0)}%` : `${percentageChange.toFixed(0)}%`;


        statItem.innerHTML = `
            <span class="symbol-icon">${symbol}</span>
            <span class="symbol-info">
                Taux de drop: ${(currentDisplayedDropRate * 100).toFixed(2)}%<br>
                Niveau: ${highestLevelOwned} (${effectText})
            </span>
        `;
        symbolStatsGrid.appendChild(statItem);
        console.log(`updateSymbolStatsDisplay: Symbole: ${symbol}, Poids Original: ${originalWeight}, Effet Cosmétique: ${cosmeticEffectValue}, Niveau le plus élevé possédé: ${highestLevelOwned}, Taux de drop affiché: ${currentDisplayedDropRate}`); // Debug log
    });
}

/**
 * Applies cosmetic visual classes to the slot machine elements.
 * This function is called by gameLogic.js when active cosmetics are updated.
 * @param {Object} activeCosmeticsObject - The object containing active cosmetic types and their values.
 */
function applyActiveCosmeticsToSlot(activeCosmeticsObject) {
    const slotsGrid = document.getElementById('slots-grid');
    if (!slotsGrid) {
        console.warn("SlotMachine: La grille de la machine à sous n'a pas été trouvée pour l'application des cosmétiques.");
        return;
    }

    // Clear all existing slot-related cosmetic classes first
    const classesToRemove = Array.from(slotsGrid.classList).filter(cls =>
        cls.startsWith('slot-theme-') ||
        cls.startsWith('slot-symbols-') ||
        cls.startsWith('slot-border-') ||
        cls.startsWith('slot-win-effect-') ||
        cls.startsWith('slot-spin-effect-')
    );
    classesToRemove.forEach(cls => slotsGrid.classList.remove(cls));

    // Apply new classes based on active cosmetics
    for (const type in activeCosmeticsObject) {
        const value = activeCosmeticsObject[type];
        // Only apply visual effects, not numerical drop rate modifiers
        // We look for the cosmetic detail to determine its type and if it's a visual effect
        const cosmeticDetails = firebaseService.getAllAvailableCosmetics().find(c => {
            // Find by ID if 'type' in activeCosmeticsObject is an actual cosmetic ID (e.g., for themes)
            if (c.id === type && (c.type === 'slot_theme' || c.type === 'slot_symbols' || c.type === 'slot_border' || c.type === 'slot_win_effect' || c.type === 'slot_spin_effect')) {
                return true;
            }
            // If 'type' is a symbol (like '🍒'), it's a drop rate bonus/debuff, which shouldn't apply visual classes
            return false;
        });

        if (cosmeticDetails) { // If it's a visual cosmetic
            slotsGrid.classList.add(`${cosmeticDetails.type}-${value}`);
        }
    }
    console.log("SlotMachine: Cosmétiques visuels actifs appliqués:", activeCosmeticsObject);
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
        confetti.style.animationDuration = `${Math.random() * 1 + 2.5}s`;

        confettiContainer.appendChild(confetti);
    }

    setTimeout(() => {
        if (confettiContainer) {
            confettiContainer.remove();
        }
    }, 3000); // Ensure this matches the longest confetti animation duration + delay
}

// Utility function for custom message boxes (instead of alert/confirm)
function showMessageBox(message, parentElement, type = 'info') {
    const messageBox = document.createElement('div');
    messageBox.classList.add('message-box');
    messageBox.textContent = message;

    if (type === 'loss') {
        messageBox.classList.add('loss-text');
    } else if (type === 'win') {
        messageBox.classList.add('win-text');
    }

    // Style for positioning within the parent (e.g., game-container)
    messageBox.style.position = 'absolute';
    messageBox.style.top = '50%';
    messageBox.style.left = '50%';
    messageBox.style.transform = 'translate(-50%, -50%)';
    messageBox.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    messageBox.style.padding = '15px 25px';
    messageBox.style.borderRadius = '10px';
    messageBox.style.zIndex = '1000';
    messageBox.style.textAlign = 'center';
    messageBox.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
    messageBox.style.fontSize = '1.2em';
    messageBox.style.maxWidth = '80%';

    parentElement.appendChild(messageBox);

    setTimeout(() => {
        messageBox.remove();
    }, 2500); // Message disappears after 2.5 seconds
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

// Expose these functions globally so gameLogic.js can call them.
window.updateSlotSymbolStats = updateSymbolStatsDisplay;
window.updateSlotCosmeticVisuals = applyActiveCosmeticsToSlot;