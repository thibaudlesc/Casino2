// scratchCard.js

// Global variables for the Scratch Card game
let scratchCardPrice = 1000; // Default price for a ticket
let scratchCardValues = []; // Array to hold the generated values for the current card
let revealedCells = new Set(); // Keep track of revealed cell indices
let isCardActive = false; // Flag to indicate if a card is currently being scratched
let scratchCanvas = null;
let scratchCtx = null;
let scratchImg = null; // The image to reveal under the scratchable layer
let scratchPath = []; // Stores points to draw the scratch path
let scratchPercentage = 0; // Percentage of the card scratched
const REVEAL_THRESHOLD = 70; // Percentage scratched to reveal the card fully

const TICKET_COSTS = [4545345315500, 1123123123000, 2512312312312300, 5001231231231230, 11231231231230000]; // Possible ticket costs
const PAYOUT_MULTIPLIERS = { // Multipliers for winning based on ticket cost
    500: { min: 1.5, max: 5 }, // Min 1.5x, Max 5x
    1000: { min: 2, max: 10 },
    2500: { min: 3, max: 20 },
    5000: { min: 5, max: 50 },
    10000: { min: 10, max: 100 }
};

// Function to initialize the Scratch Card game
function initScratchCard() {
    currentGame = 'scratchCard';
    isCardActive = false;
    revealedCells.clear();
    scratchPercentage = 0;

    // Attach event listeners for controls
    const buyButton = document.getElementById('scratch-card-buy-button');
    if (buyButton) {
        buyButton.removeEventListener('click', buyScratchCard); // Prevent duplicate listeners
        buyButton.addEventListener('click', buyScratchCard);
    }

    const resetButton = document.getElementById('scratch-card-reset-button');
    if (resetButton) {
        resetButton.removeEventListener('click', resetScratchCard); // Prevent duplicate listeners
        resetButton.addEventListener('click', resetScratchCard);
    }

    // Populate the ticket price select options
    const priceSelect = document.getElementById('scratch-card-price-select');
    if (priceSelect) {
        priceSelect.innerHTML = TICKET_COSTS.map(amount =>
            `<option value="${amount}">${amount >= 1000 ? (amount / 1000) + 'k' : amount}€</option>`
        ).join('');
        priceSelect.value = scratchCardPrice; // Set default selected value

        priceSelect.removeEventListener('change', updateScratchCardPrice);
        priceSelect.addEventListener('change', updateScratchCardPrice);
    }
    updateScratchCardPriceDisplay(); // Update display for current price

    updateBalanceDisplay(firebaseService.getUserBalance()); // Update balance display
    renderScratchCardGrid(); // Initial render of the grid
    resetScratchCard(false); // Reset to initial state without full balance update
    console.log("ScratchCard: initScratchCard() called, game ready.");
}

// Update the displayed ticket price
function updateScratchCardPriceDisplay() {
    const priceDisplay = document.getElementById('scratch-card-price-display');
    if (priceDisplay) {
        priceDisplay.textContent = `${scratchCardPrice} €`;
    }
}

// Handle change in price select
function updateScratchCardPrice(event) {
    scratchCardPrice = parseInt(event.target.value);
    updateScratchCardPriceDisplay();
    console.log("ScratchCard: Prix du ticket mis à jour à", scratchCardPrice);
}

// Render the 3x3 grid for the scratch card
function renderScratchCardGrid() {
    const gridElement = document.getElementById('scratch-card-grid');
    if (!gridElement) return;
    gridElement.innerHTML = ''; // Clear existing cells

    for (let i = 0; i < 9; i++) { // 3x3 grid
        const cellElement = document.createElement('div');
        cellElement.classList.add('scratch-card-cell');
        cellElement.dataset.index = i; // Store index for identification

        const valueSpan = document.createElement('span');
        valueSpan.classList.add('scratch-value');
        cellElement.appendChild(valueSpan);

        gridElement.appendChild(cellElement);
    }
    console.log("ScratchCard: Grille rendue.");
}

// Function to buy a scratch card
async function buyScratchCard() {
    console.log("ScratchCard: buyScratchCard() called.");
    const currentBalance = firebaseService.getUserBalance();
    const messageElement = document.getElementById('scratch-card-message');
    const buyButton = document.getElementById('scratch-card-buy-button');
    const resetButton = document.getElementById('scratch-card-reset-button');
    const priceSelect = document.getElementById('scratch-card-price-select');
    const gameArea = document.getElementById('scratch-card-game-container'); // For floating numbers

    if (currentBalance < scratchCardPrice) {
        messageElement.textContent = "Solde insuffisant pour acheter un ticket !";
        messageElement.classList.add('loss-text');
        setTimeout(() => messageElement.classList.remove('loss-text'), 2000);
        console.log("ScratchCard: Solde insuffisant.");
        return;
    }

    // Deduct cost from balance
    await firebaseService.saveUserBalance(currentBalance - scratchCardPrice);
    updateBalanceDisplay(firebaseService.getUserBalance());

    // Generate random values for the scratch card
    scratchCardValues = generateScratchCardValues();
    console.log("ScratchCard: Valeurs générées:", scratchCardValues);

    // Populate values into hidden spans
    document.querySelectorAll('.scratch-card-cell .scratch-value').forEach((span, index) => {
        span.textContent = scratchCardValues[index];
        span.classList.remove('revealed'); // Ensure hidden initially
        span.parentElement.classList.remove('match-highlight'); // Remove any previous highlights
    });

    // Reset and prepare the canvas for scratching
    resetScratchCanvas();

    isCardActive = true;
    revealedCells.clear();
    scratchPercentage = 0;

    messageElement.textContent = "Grattez pour révéler les numéros !";
    messageElement.classList.remove('win-text', 'loss-text');

    buyButton.disabled = true;
    priceSelect.disabled = true;
    resetButton.disabled = false; // Enable reset after buying a card
    console.log("ScratchCard: Ticket acheté et prêt à gratter.");
}

// Generate random values for the scratch card (3x3 grid, 9 values)
function generateScratchCardValues() {
    const possibleEmojis = ['🍒', '🍋', '🔔', '💎', '🍀', '💰', '⭐', '🌈', '👑'];
    let values = Array(9).fill(''); // Initialize 9 empty cells

    // Define win probabilities (adjust these to meet the 30-40% target return)
    const probabilities = {
        superJackpot: 0.00005, // 1 in 20,000
        bombCombo: 0.0005,    // 1 in 2,000
        bonusWord: 0.002,     // 1 in 500
        fourMatch: 0.02,      // 1 in 50
        threeAligned: 0.15,   // 1 in ~6-7
        surprise: 0.12,       // 1 in ~8
        rejoue: 0.10          // 1 in 10
    };

    // Determine the type of card to generate based on probabilities (highest rarity first)
    if (Math.random() < probabilities.superJackpot) {
        // Generate Super Jackpot card (3 💰 aligned)
        const jackpotEmoji = '💰';
        const winLines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];
        const randomLine = winLines[Math.floor(Math.random() * winLines.length)];
        randomLine.forEach(idx => values[idx] = jackpotEmoji);
        fillRemainingWithLosingEmojis(values, jackpotEmoji, possibleEmojis);
    } else if (Math.random() < probabilities.bombCombo) {
        // Generate Bomb Combo card
        const bombEmoji = '💣'; // Assuming 💣 is one of the possibleEmojis
        const corners = [0, 2, 6, 8];
        const randomCorner = corners[Math.floor(Math.random() * corners.length)];
        values[randomCorner] = bombEmoji;

        let pairEmoji;
        do {
            pairEmoji = possibleEmojis[Math.floor(Math.random() * possibleEmojis.length)];
        } while (pairEmoji === bombEmoji);

        const otherIndices = Array.from({ length: 9 }, (_, i) => i).filter(i => i !== randomCorner);
        const pairIndices = new Set();
        while (pairIndices.size < 2) {
            pairIndices.add(otherIndices[Math.floor(Math.random() * otherIndices.length)]);
        }
        pairIndices.forEach(idx => values[idx] = pairEmoji);
        fillRemainingWithLosingEmojis(values, bombEmoji, possibleEmojis, pairEmoji); // Fill ensuring no other wins
    } else if (Math.random() < probabilities.bonusWord) {
        // Generate BONUS card (5 specific emojis)
        // User implied "BONUS" word, but with emojis it's difficult.
        // Let's assume 'BONUS' implies a specific set of 5 unique emojis, for example: ['👑', '🌈', '⭐', '💎', '💰']
        const bonusSet = ['👑', '🌈', '⭐', '💎', '💰']; // Example bonus set
        const indices = Array.from({ length: 9 }, (_, i) => i);
        const shuffledIndices = indices.sort(() => Math.random() - 0.5);
        for (let i = 0; i < 5; i++) {
            values[shuffledIndices[i]] = bonusSet[i];
        }
        fillRemainingWithLosingEmojis(values, ...bonusSet, possibleEmojis); // Fill with non-bonus emojis
    } else if (Math.random() < probabilities.fourMatch) {
        // Generate 4 identical symbols card
        const fourMatchEmoji = possibleEmojis[Math.floor(Math.random() * possibleEmojis.length)];
        const indices = Array.from({ length: 9 }, (_, i) => i);
        const shuffledIndices = indices.sort(() => Math.random() - 0.5);
        for (let i = 0; i < 4; i++) {
            values[shuffledIndices[i]] = fourMatchEmoji;
        }
        fillRemainingWithLosingEmojis(values, fourMatchEmoji, possibleEmojis);
    } else if (Math.random() < probabilities.threeAligned) {
        // Generate 3 identical symbols aligned card
        const winLines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];
        const randomLine = winLines[Math.floor(Math.random() * winLines.length)];
        const alignedEmoji = possibleEmojis[Math.floor(Math.random() * possibleEmojis.length)];
        randomLine.forEach(idx => values[idx] = alignedEmoji);
        fillRemainingWithLosingEmojis(values, alignedEmoji, possibleEmojis);
    } else if (Math.random() < probabilities.surprise) {
        // Generate Surprise card (1 🎁)
        const surpriseEmoji = '🎁';
        const randomIndex = Math.floor(Math.random() * 9);
        values[randomIndex] = surpriseEmoji;
        fillRemainingWithLosingEmojis(values, surpriseEmoji, possibleEmojis);
    } else if (Math.random() < probabilities.rejoue) {
        // Generate Rejoue card (1 🔁)
        const rejoueEmoji = '🔁';
        const randomIndex = Math.floor(Math.random() * 9);
        values[randomIndex] = rejoueEmoji;
        fillRemainingWithLosingEmojis(values, rejoueEmoji, possibleEmojis);
    } else {
        // Generate a guaranteed losing card
        // Ensure no emoji appears 3 or more times, and no other special conditions are met.
        let tempValues = [];
        const counts = {}; // To track counts of each emoji for 3-match check
        const twoMatchEmojis = new Set(); // To track emojis that appear twice

        // Generate values ensuring no more than two of the same emoji appear
        for (let i = 0; i < 9; i++) {
            let emoji;
            let tries = 0;
            do {
                emoji = possibleEmojis[Math.floor(Math.random() * possibleEmojis.length)];
                tries++;
                if (tries > 50) { // Safeguard
                    console.warn("Could not find suitable emoji for losing card easily, relaxing constraints.");
                    // Relax constraint for very edge cases, might rarely create a 3-match losing card
                    break;
                }
            } while (counts[emoji] && counts[emoji] >= 2); // Avoid creating 3 of a kind

            tempValues.push(emoji);
            counts[emoji] = (counts[emoji] || 0) + 1;
            if (counts[emoji] === 2) {
                twoMatchEmojis.add(emoji);
            }
        }

        // Shuffle the values to prevent accidental alignments
        for (let i = tempValues.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tempValues[i], tempValues[j]] = [tempValues[j], tempValues[i]];
        }
        values = tempValues;
    }

    // Final shuffle to ensure winning patterns aren't always in predictable spots
    for (let i = values.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [values[i], values[j]] = [values[j], values[i]];
    }

    return values;
}

// Helper function to fill remaining empty cells with emojis that don't create additional wins
function fillRemainingWithLosingEmojis(currentValues, ...excludeEmojis) {
    const possibleEmojis = ['🍒', '🍋', '🔔', '💎', '🍀', '💰', '⭐', '🌈', '👑'];
    for (let i = 0; i < 9; i++) {
        if (currentValues[i] === '') {
            let randomEmoji;
            do {
                randomEmoji = possibleEmojis[Math.floor(Math.random() * possibleEmojis.length)];
            } while (excludeEmojis.includes(randomEmoji)); // Exclude emojis that might create specific win patterns
            currentValues[i] = randomEmoji;
        }
    }
    return currentValues;
}

// Implementing `determineScratchCardWinner`
// Need functions to check for each win condition.

function checkWinConditions(valuesOnCard) {
    const counts = {};
    valuesOnCard.forEach(value => {
        counts[value] = (counts[value] || 0) + 1;
    });

    const winLines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    const corners = [0, 2, 6, 8];

    // Priority order for checking wins (highest payout first)
    // 1. Super Jackpot (3 💰 aligned)
    for (const line of winLines) {
        if (valuesOnCard[line[0]] === '💰' && valuesOnCard[line[1]] === '💰' && valuesOnCard[line[2]] === '💰') {
            return { type: 'Super Jackpot', multiplier: 2000, value: '💰' };
        }
    }

    // 2. Bomb Combo (💣 in a corner + 2 identical elsewhere)
    const bombEmoji = '💣';
    let bombInCorner = false;
    for (const cornerIdx of corners) {
        if (valuesOnCard[cornerIdx] === bombEmoji) {
            bombInCorner = true;
            break;
        }
    }
    if (bombInCorner) {
        for (const emoji in counts) {
            if (emoji !== bombEmoji && counts[emoji] >= 2) {
                // Ensure these two identical emojis are NOT the bomb itself
                // And that the bomb in corner is one of the 9 cells
                return { type: 'Bomb Combo', multiplier: 7, value: bombEmoji };
            }
        }
    }

    // 3. BONUS (5 specific emojis)
    const bonusSet = ['👑', '🌈', '⭐', '💎', '💰']; // Must match the one in generate
    let bonusCount = 0;
    valuesOnCard.forEach(emoji => {
        if (bonusSet.includes(emoji)) {
            bonusCount++;
        }
    });
    if (bonusCount >= 5) { // Check if at least 5 bonus emojis are present (can be more if duplicates exist)
        return { type: 'Bonus Word', multiplier: 5, value: 'BONUS' };
    }


    // 4. 4 identical symbols anywhere
    for (const emoji in counts) {
        if (counts[emoji] >= 4) {
            return { type: 'Four Match', multiplier: 3, value: emoji };
        }
    }

    // 5. 3 identical symbols aligned
    for (const line of winLines) {
        const val1 = valuesOnCard[line[0]];
        const val2 = valuesOnCard[line[1]];
        const val3 = valuesOnCard[line[2]];
        if (val1 === val2 && val2 === val3 && val1 !== '') {
            // Specific multipliers for certain aligned emojis
            if (val1 === '👑') return { type: 'Three Aligned', multiplier: 10, value: val1 };
            if (val1 === '💎') return { type: 'Three Aligned', multiplier: 7, value: val1 };
            // Super Jackpot already checked, so '💰' won't be caught here for 3-aligned non-jackpot.
            return { type: 'Three Aligned', multiplier: 2, value: val1 }; // Default for others
        }
    }

    // 6. Surprise (🎁 alone)
    if (counts['🎁'] === 1) { // Exactly one 🎁 on the card
        const randomMultiplier = Math.random() * (10 - 1) + 1; // x1 to x10 random
        return { type: 'Surprise', multiplier: randomMultiplier, value: '🎁' };
    }

    // 7. Rejoue (🔁 alone)
    if (counts['🔁'] === 1) { // Exactly one 🔁 on the card
        return { type: 'Rejoue', multiplier: 1, value: '🔁' }; // Multiplier 1 to just return the cost
    }

    return null; // No win
}


// Setup and clear the canvas for scratching
function resetScratchCanvas() {
    const gridElement = document.getElementById('scratch-card-grid');
    // Remove existing canvas if any
    if (scratchCanvas) {
        scratchCanvas.removeEventListener('mousedown', startScratching);
        scratchCanvas.removeEventListener('mousemove', scratch);
        scratchCanvas.removeEventListener('mouseup', stopScratching);
        scratchCanvas.removeEventListener('mouseleave', stopScratching);
        scratchCanvas.removeEventListener('touchstart', startScratching);
        scratchCanvas.removeEventListener('touchmove', scratch);
        scratchCanvas.removeEventListener('touchend', stopScratching);
        scratchCanvas.remove();
    }

    scratchCanvas = document.createElement('canvas');
    scratchCanvas.classList.add('scratch-canvas');
    scratchCanvas.width = gridElement.offsetWidth;
    scratchCanvas.height = gridElement.offsetHeight;
    gridElement.appendChild(scratchCanvas);

    scratchCtx = scratchCanvas.getContext('2d');

    // Create the scratchable layer (silver/gold coating)
    drawScratchLayer(scratchCtx, scratchCanvas.width, scratchCanvas.height);

    // Add event listeners for scratching
    scratchCanvas.addEventListener('mousedown', startScratching);
    scratchCanvas.addEventListener('mousemove', scratch);
    scratchCanvas.addEventListener('mouseup', stopScratching);
    scratchCanvas.addEventListener('mouseleave', stopScratching); // Stop scratching if mouse leaves canvas

    // Add touch event listeners
    scratchCanvas.addEventListener('touchstart', startScratching, { passive: false });
    scratchCanvas.addEventListener('touchmove', scratch, { passive: false });
    scratchCanvas.addEventListener('touchend', stopScratching);

    scratchImg = new Image();
    scratchImg.src = 'https://placehold.co/300x300/CCCCCC/808080?text=GRATTEZ'; // Placeholder for the scratchable surface
    scratchImg.onload = () => {
        drawScratchLayer(scratchCtx, scratchCanvas.width, scratchCanvas.height);
    };

    scratchPath = []; // Clear previous scratch path
    console.log("ScratchCard: Canvas réinitialisé et prêt.");
}

// Draw the initial scratchable layer
function drawScratchLayer(ctx, width, height) {
    ctx.clearRect(0, 0, width, height); // Clear anything previous

    // Draw a "silver" gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#A8A8A8'); // Light silver
    gradient.addColorStop(0.5, '#7C7C7C'); // Darker silver
    gradient.addColorStop(1, '#A8A8A8'); // Light silver
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add some texture/noise (optional)
    for (let i = 0; i < 2000; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
        ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
    }

    // Optional: Draw a "scratch here" text or icon
    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = '#444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GRATTEZ ICI', width / 2, height / 2);
}

let isScratching = false;

function getEventPos(e) {
    const rect = scratchCanvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function startScratching(e) {
    if (!isCardActive) return;
    e.preventDefault(); // Prevent scrolling on touch devices
    isScratching = true;
    const pos = getEventPos(e);
    scratchCtx.beginPath();
    scratchCtx.moveTo(pos.x, pos.y);
    scratchPath.push({ x: pos.x, y: pos.y }); // Store for path calculation
    console.log("ScratchCard: Début du grattage.");
}

function scratch(e) {
    if (!isScratching || !isCardActive) return;
    e.preventDefault(); // Prevent scrolling on touch devices
    const pos = getEventPos(e);
    scratchCtx.lineTo(pos.x, pos.y);
    scratchCtx.strokeStyle = 'rgba(0,0,0,1)'; // Set stroke style to black for erasing
    scratchCtx.lineWidth = 40; // Size of the "eraser"
    scratchCtx.lineCap = 'round';
    scratchCtx.lineJoin = 'round';
    scratchCtx.globalCompositeOperation = 'destination-out'; // This is key to erase
    scratchCtx.stroke();
    scratchCtx.beginPath(); // Start a new path for next segment
    scratchCtx.moveTo(pos.x, pos.y);

    scratchPath.push({ x: pos.x, y: pos.y });
    updateScratchPercentage();
}

function stopScratching() {
    if (!isScratching) return;
    isScratching = false;
    scratchCtx.globalCompositeOperation = 'source-over'; // Reset composite operation
    console.log("ScratchCard: Fin du grattage.");
    checkCardCompletion();
}

// Calculate the percentage of the canvas that has been scratched
function updateScratchPercentage() {
    const imageData = scratchCtx.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] === 0) { // Check alpha channel
            transparentPixels++;
        }
    }
    scratchPercentage = (transparentPixels / (imageData.width * imageData.height)) * 100;
    // console.log(`Scratch percentage: ${scratchPercentage.toFixed(2)}%`); // Too verbose
}

// Check if enough of the card is scratched to reveal results
function checkCardCompletion() {
    if (!isCardActive) return;

    if (scratchPercentage >= REVEAL_THRESHOLD) {
        revealAllCardValues();
        isCardActive = false; // Card is revealed, game round ends
        determineScratchCardWinner();
    } else {
        // Optionally show message about needing to scratch more
        // document.getElementById('scratch-card-message').textContent = "Continuez à gratter !";
    }
}

// Immediately reveal all values (after threshold is met or reset)
function revealAllCardValues() {
    document.querySelectorAll('.scratch-card-cell .scratch-value').forEach(span => {
        span.classList.add('revealed');
    });
    // Clear the scratchable layer from the canvas
    if (scratchCtx) {
        scratchCtx.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
    }
    console.log("ScratchCard: Toutes les valeurs révélées.");
}

// Determine the winner and award payout
async function determineScratchCardWinner() {
    console.log("ScratchCard: Détermination du gagnant...");
    const valuesOnCard = Array.from(document.querySelectorAll('.scratch-card-cell .scratch-value')).map(span => span.textContent);
    const messageElement = document.getElementById('scratch-card-message');
    const gameArea = document.getElementById('scratch-card-game-container'); // For floating numbers

    let winResult = checkWinConditions(valuesOnCard);

    let payout = 0;
    let currentBalance = firebaseService.getUserBalance();
    let winMessage = "";

    if (winResult) {
        if (winResult.type === 'Rejoue') {
            winMessage = `Rejoue ! Vous récupérez le prix du ticket : ${scratchCardPrice} € !`;
            payout = scratchCardPrice; // Return the ticket price
        } else {
            payout = scratchCardPrice * winResult.multiplier;
            winMessage = `Gagné ! ${winResult.type} (${winResult.value ? winResult.value + ' - ' : ''}x${winResult.multiplier}) ! Vous gagnez ${payout.toFixed(2)} € !`;
        }
        messageElement.classList.add('win-text');
        
        // Highlight winning cells based on the win type if needed
        if (winResult.type === 'Three Aligned' || winResult.type === 'Super Jackpot') {
             const winLines = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
                [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
                [0, 4, 8], [2, 4, 6]             // Diagonals
            ];
            for (const line of winLines) {
                const val1 = valuesOnCard[line[0]];
                const val2 = valuesOnCard[line[1]];
                const val3 = valuesOnCard[line[2]];
                if (val1 === val2 && val2 === val3 && val1 === winResult.value) {
                     line.forEach(idx => document.querySelector(`.scratch-card-cell[data-index="${idx}"]`).classList.add('match-highlight'));
                     break; // Only highlight one line if multiple exist
                }
            }
        } else if (winResult.type === 'Four Match') {
            valuesOnCard.forEach((emoji, index) => {
                if (emoji === winResult.value) {
                    document.querySelector(`.scratch-card-cell[data-index="${index}"]`).classList.add('match-highlight');
                }
            });
        }
        showFloatingWinNumbers(payout, gameArea);
        
    } else {
        winMessage = "Désolé, pas de chance cette fois. Réessayez !";
        messageElement.classList.add('loss-text');
        showFloatingWinNumbers(-scratchCardPrice, gameArea);
    }

    messageElement.textContent = winMessage;
    await firebaseService.saveUserBalance(currentBalance + payout);

    // Re-enable controls after a short delay
    setTimeout(() => {
        document.getElementById('scratch-card-buy-button').disabled = false;
        document.getElementById('scratch-card-price-select').disabled = false;
        document.getElementById('scratch-card-reset-button').disabled = false; // Reset button always active
        messageElement.classList.remove('win-text', 'loss-text');
    }, 2000); // Allow time for message to be read

    console.log("ScratchCard: Résultat:", winMessage);
    console.log("ScratchCard: Gain:", payout);
}

// Reset the scratch card game to initial state (ready to buy new card)
function resetScratchCard(fullReset = true) {
    isCardActive = false;
    scratchCardValues = [];
    revealedCells.clear();
    scratchPercentage = 0;

    // Clear content and hide values
    document.querySelectorAll('.scratch-card-cell .scratch-value').forEach(span => {
        span.textContent = '';
        span.classList.remove('revealed');
        span.parentElement.classList.remove('match-highlight');
    });

    // Remove the canvas if it exists
    if (scratchCanvas) {
        scratchCanvas.removeEventListener('mousedown', startScratching);
        scratchCanvas.removeEventListener('mousemove', scratch);
        scratchCanvas.removeEventListener('mouseup', stopScratching);
        scratchCanvas.removeEventListener('mouseleave', stopScratching);
        scratchCanvas.removeEventListener('touchstart', startScratching);
        scratchCanvas.removeEventListener('touchmove', scratch);
        scratchCanvas.removeEventListener('touchend', stopScratching);
        scratchCanvas.remove();
        scratchCanvas = null;
        scratchCtx = null;
    }

    document.getElementById('scratch-card-message').textContent = "Achetez un ticket pour commencer !";
    document.getElementById('scratch-card-message').classList.remove('win-text', 'loss-text');

    document.getElementById('scratch-card-buy-button').disabled = false;
    document.getElementById('scratch-card-price-select').disabled = false;
    document.getElementById('scratch-card-reset-button').disabled = true; // Initially disabled until a card is bought

    if (fullReset) { // Only update balance display on explicit reset/re-entry
        updateBalanceDisplay(firebaseService.getUserBalance());
    }
    console.log("ScratchCard: Jeu réinitialisé.");
}

// Expose relevant functions globally if needed by gameLogic.js
window.initScratchCard = initScratchCard;
window.buyScratchCard = buyScratchCard;
window.resetScratchCard = resetScratchCard;
