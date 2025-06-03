// Variables spécifiques à la Machine à Sous
let freeSpins = 0;
let lastBetAmount = 0; // Store the bet amount from when free spins were awarded
const NUM_REELS = 5;
const NUM_ROWS = 3;

// Définition des symboles et de leurs poids pour la volatilité (simplifiée)
const SYMBOLS = ['🍒', '🍊', '🔔', '💎', '7️⃣', 'BAR', '⭐']; // Added '⭐' for Scatter
const SYMBOL_WEIGHTS = { // Adjust weights for volatility and rarity of scatter
    '🍒': 0.25, // Cherry (frequent, low payout)
    '🍊': 0.20,
    '🔔': 0.18,
    '💎': 0.15,
    '7️⃣': 0.10, // Higher payout
    'BAR': 0.07, // Highest payout for BAR combinations
    '⭐': 0.05 // Scatter for Free Spins
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
    [0, 1, 2, 3, 4],     // Top Row
    [5, 6, 7, 8, 9],     // Middle Row
    [10, 11, 12, 13, 14] // Bottom Row
];


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
        <input type="number" id="bet-input" value="10" min="1">
        <button id="spin-button" onclick="spinSlots()">Lancer</button>
        <button onclick="showMainMenu()">Retour</button>
    `;
    updateBalanceDisplay();
    updateFreeSpinsDisplay();
    updateSlotMachineMode();
    // Initialize lastBetAmount if it's the first time entering slot machine
    const betInput = document.getElementById('bet-input');
    lastBetAmount = parseInt(betInput.value); // Set initial bet amount
}

function updateFreeSpinsDisplay() {
    const freeSpinsSpan = document.getElementById('free-spins-display');
    if (freeSpinsSpan) {
        freeSpinsSpan.textContent = freeSpins;
    }
}

function updateSlotMachineMode() {
    const slotsGrid = document.getElementById('slots-grid');
    const betInput = document.getElementById('bet-input');
    if (slotsGrid) {
        if (freeSpins > 0) {
            slotsGrid.classList.add('slot-machine-free-spin-mode');
            if (betInput) {
                betInput.disabled = true; // Disable bet input during free spins
                betInput.value = lastBetAmount; // Ensure bet is set to last won bet
            }
        } else {
            slotsGrid.classList.remove('slot-machine-free-spin-mode');
            if (betInput) {
                betInput.disabled = false; // Enable bet input when no free spins
            }
        }
    }
}

// Function to spin the slots
async function spinSlots() {
    const betInput = document.getElementById('bet-input');
    const spinButton = document.getElementById('spin-button');
    const slotsGrid = document.getElementById('slots-grid');
    const gameContainer = document.getElementById('game-container');
    let bet = parseInt(betInput.value);

    let isFreeSpinRound = (freeSpins > 0);

    // If it's a free spin round, use the stored bet amount
    if (isFreeSpinRound) {
        freeSpins--;
        bet = lastBetAmount; // Use the bet from when free spins were awarded
        updateFreeSpinsDisplay();
    } else {
        if (isNaN(bet) || bet <= 0) {
            alert("Veuillez entrer une mise valide (nombre entier positif).");
            return;
        }
        lastBetAmount = bet; // Store the current bet for future free spins
        const totalBetCost = bet;

        if (balance < totalBetCost) {
            alert("Solde insuffisant pour cette mise !");
            return;
        }
    }

    spinButton.disabled = true;
    betInput.disabled = true; // Disable bet input during spin

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
    slotsGrid.classList.remove('slot-machine-new-free-spins', 'slot-machine-big-win');
    document.getElementById('gain-text').classList.remove('win-animation');

    // Generate random symbols for all 15 positions in the grid
    for (let i = 0; i < NUM_REELS * NUM_ROWS; i++) {
        finalSymbolsGrid.push(getRandomSymbolByWeight());
    }

    const gainText = document.getElementById('gain-text');
    gainText.textContent = `Gain : 0 €`;


    // Start spinning animation for all reels
    slotElements.forEach(slotEl => {
        slotEl.classList.add('spinning');
    });


    const totalSpinDuration = 2000;
    const symbolHeight = 110;

    const spinPromises = Array.from(slotSymbolStrips).map((strip, index) => {
        return new Promise(resolve => {
            const targetSymbol = finalSymbolsGrid[index];
            // Find the index of the target symbol in the SYMBOLS array
            const targetSymbolIndexInSymbolsArray = SYMBOLS.indexOf(targetSymbol);

            // Calculate the position to stop the strip at, ensuring the target symbol is visible
            // We want the target symbol to align with the middle of the slot,
            // or rather, for simplicity, just show up correctly at the top visible position.
            // Given that each symbol span is 110px high and strip has 50 symbols,
            // we calculate the translateY to land on the correct symbol.
            // We add a few full cycles (SYMBOLS.length * X * symbolHeight) to make it look like a spin.
            const totalSymbolsInStrip = SYMBOLS.length;
            const extraSpins = 3; // Ensure it spins enough times
            const finalStopPosition = (extraSpins * totalSymbolsInStrip * symbolHeight) + (targetSymbolIndexInSymbolsArray * symbolHeight);

            strip.style.transition = 'none'; // Clear any previous transition
            strip.style.transform = `translateY(0px)`; // Reset position
            void strip.offsetWidth; // Force reflow for reset to take effect

            const delay = index * 100; // Stagger reels start/stop
            strip.style.transition = `transform ${totalSpinDuration + delay}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`; // Smoother ease-out

            // Apply the final transform
            strip.style.transform = `translateY(-${finalStopPosition}px)`;

            setTimeout(() => {
                slotElements[index].classList.remove('spinning');
                // Snap to the correct visual position for the *actual* symbol on the grid
                // This means the symbol should be visible at the top of the slot element.
                // The strip should end with the target symbol at its "top" visible position.
                // Since our strip contains multiple copies, we just need to ensure the final
                // symbol displayed is correct. The animation ends with `finalStopPosition`.
                // If we want the first row to align to the 0th index, the second to the 1st etc.
                // (which is common in slot machine visuals), we'd need to adjust target index.
                // For a 3-row display where the top symbol is what we care about,
                // the final `transform` will effectively show the symbol at `targetSymbolIndexInSymbolsArray`.
                // However, since we generated a long strip, the symbol at the visual
                // position `targetSymbolIndexInSymbolsArray` will be `finalSymbolsGrid[index]`.
                // The current `finalStopPosition` should land it correctly.
                resolve();
            }, totalSpinDuration + delay);
        });
    });

    await Promise.all(spinPromises);

    const result = calculatePayout(finalSymbolsGrid, bet);
    let totalPayout = result.totalPayout;
    let newFreeSpinsEarned = result.newFreeSpins;
    const winningElementsIndices = result.winningElementsIndices;

    if (newFreeSpinsEarned > 0 && slotsGrid) {
        slotsGrid.classList.add('slot-machine-new-free-spins');
        triggerConfetti('new-free-spins', gameContainer); // Pass main gameContainer for confetti
        setTimeout(() => {
            slotsGrid.classList.remove('slot-machine-new-free-spins');
        }, 600); // Remove burst class after quick animation
    }

    balance += totalPayout;
    freeSpins += newFreeSpinsEarned;

    updateBalanceDisplay();
    updateFreeSpinsDisplay();
    updateSlotMachineMode(); // Update mode for free spin glow and bet input state

    gainText.textContent = `Gain : ${totalPayout} €`;
    if (totalPayout > 0 || newFreeSpinsEarned > 0) {
        gainText.classList.add('win-animation');

        const isBigWin = totalPayout >= (bet * 10) || newFreeSpinsEarned > 0;
        if (isBigWin && slotsGrid) {
            slotsGrid.classList.add('slot-machine-big-win');
            triggerConfetti('big-win', gameContainer); // Trigger confetti for big wins
            setTimeout(() => {
                slotsGrid.classList.remove('slot-machine-big-win');
            }, 2000); // Remove big win animation after a short delay
        }

        // Trigger floating win numbers if there's a monetary payout
        if (totalPayout > 0) {
            triggerFloatingWinNumbers(totalPayout, gameContainer); // Pass gameContainer for numbers
        }

        // Highlight winning slots
        winningElementsIndices.forEach(idx => {
            if (slotElements[idx]) {
                slotElements[idx].classList.add('pop');
            }
        });

        setTimeout(() => {
            slotElements.forEach(slotEl => slotEl.classList.remove('pop'));
            // Remove text animation after its cycle (if not already removed by blink)
            gainText.classList.remove('win-animation');
        }, 1500); // Increased duration to match bounce-in animation

    }

    if (freeSpins > 0) {
        setTimeout(() => {
            spinSlots(); // Auto-spin for free spins
        }, 2500); // Delay before next free spin
    } else {
        spinButton.disabled = false;
        // Re-enable bet input only if not in free spin mode
        if (freeSpins === 0) {
            betInput.disabled = false;
        }
    }
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
        if (symbolCounts[symbol] >= 5) {
            totalPayout += betPerSpin * 0.3;
            // Optionally highlight all occurrences of this symbol
            finalSymbolsGrid.forEach((s, idx) => {
                if (s === symbol) {
                    winningElementsIndices.add(idx);
                }
            });
            // If the rule is "more than 4", meaning 5 or more, adjust the condition.
            // For "plus de 4" (more than 4), it means >= 5.
            // If you meant "4 or more", then >= 4 is correct. I'll use >=4 as per your code.
        }
    }

    // 4. Full column of the same item - x0.45 the bet
    for (let reel = 0; reel < NUM_REELS; reel++) {
        const colSymbols = [
            finalSymbolsGrid[reel],             // Top row of this reel
            finalSymbolsGrid[reel + NUM_REELS], // Middle row of this reel
            finalSymbolsGrid[reel + NUM_REELS * 2]  // Bottom row of this reel
        ];
        if (colSymbols[0] === colSymbols[1] && colSymbols[1] === colSymbols[2]) {
            totalPayout += betPerSpin * 0.15;
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
function getRandomSymbolByWeight() {
    let totalWeight = 0;
    for (let symbol in SYMBOL_WEIGHTS) {
        totalWeight += SYMBOL_WEIGHTS[symbol];
    }

    let random = Math.random() * totalWeight;
    for (let symbol in SYMBOL_WEIGHTS) {
        random -= SYMBOL_WEIGHTS[symbol];
        if (random <= 0) {
            return symbol;
        }
    }
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]; // Fallback
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

    const numConfetti = (type === 'big-win' || type === 'new-free-spins') ? 100 : 50;

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
    if (!parentElement || amount <= 0) return;

    let floatingContainer = parentElement.querySelector('.floating-win-number-container');
    if (!floatingContainer) {
        floatingContainer = document.createElement('div');
        floatingContainer.classList.add('floating-win-number-container');
        parentElement.appendChild(floatingContainer);
    } else {
        floatingContainer.innerHTML = ''; // Clear previous numbers
    }

    // Number of floating numbers to generate, more for larger wins
    const numNumbers = Math.min(Math.floor(amount / 20) + 1, 10);
    const baseValue = Math.floor(amount / numNumbers);
    const remainingValue = amount % numNumbers;

    for (let i = 0; i < numNumbers; i++) {
        const numberSpan = document.createElement('span');
        numberSpan.classList.add('floating-win-number');

        let value = baseValue;
        if (i < remainingValue) { // Distribute remainder
            value++;
        }
        numberSpan.textContent = `+${value}€`;

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

        floatingContainer.appendChild(numberSpan);
    }

    setTimeout(() => {
        if (floatingContainer) {
            floatingContainer.remove();
        }
    }, 2500); // Ensure this matches the longest floating number animation duration + delay
}