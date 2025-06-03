// blackjack.js

// Variables globales spécifiques au Blackjack
let deck = [];
let playerHand = [];
let dealerHand = [];
let blackjackBet = 0;
let gameStarted = false;

// Card definitions
const SUITS = ['♠', '♣', '♥', '♦'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Function to start the Blackjack game setup
function startBlackjack() {
    currentGame = 'blackjack';
    gameStarted = false;
    blackjackBet = 0; // Reset bet for a new game

    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <h2>♦ BLACKJACK ♦</h2>
        <p>Solde : <span id="current-balance">${balance}</span> €</p>

        <div id="blackjack-container">
            <h3>Croupier (<span id="dealer-score">0</span>)</h3>
            <div id="dealer-hand" class="blackjack-hand"></div>

            <h3>Joueur (<span id="player-score">0</span>)</h3>
            <div id="player-hand" class="blackjack-hand"></div>

            <p id="blackjack-message" class="blackjack-result">Placez votre mise pour commencer !</p>
            <p id="blackjack-current-bet">Mise actuelle : 0 €</p>

            <div id="blackjack-controls">
                <div class="bet-input-group">
                    <label for="blackjack-bet-amount">Mise (€):</label>
                    <input type="number" id="blackjack-bet-amount" value="10" min="1" step="1">
                    <button id="blackjack-deal-button" class="game-button">DONNER</button>
                </div>
                <div class="game-actions">
                    <button id="blackjack-hit-button" class="game-button" disabled>TIRER</button>
                    <button id="blackjack-stand-button" class="game-button" disabled>RESTER</button>
                    <button id="blackjack-double-button" class="game-button" disabled>DOUBLER</button>
                </div>
            </div>
            <button onclick="showMainMenu()" class="back-button">Retour au Menu</button>
        </div>
    `;

    updateBalanceDisplay();
    setupBlackjackEventListeners();
}

// Setup event listeners for Blackjack game
function setupBlackjackEventListeners() {
    document.getElementById('blackjack-deal-button').addEventListener('click', dealBlackjack);
    document.getElementById('blackjack-hit-button').addEventListener('click', playerHit);
    document.getElementById('blackjack-stand-button').addEventListener('click', playerStand);
    document.getElementById('blackjack-double-button').addEventListener('click', playerDouble);
}

// Create and shuffle a new deck
function createDeck() {
    deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }
    // Shuffle the deck (Fisher-Yates algorithm)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// Calculate hand value
function getHandValue(hand) {
    let value = 0;
    let numAces = 0;
    for (const card of hand) {
        if (card.rank === 'A') {
            numAces++;
            value += 11;
        } else if (['K', 'Q', 'J'].includes(card.rank)) {
            value += 10;
        } else {
            value += parseInt(card.rank);
        }
    }
    // Handle aces as 1 if busting
    while (value > 21 && numAces > 0) {
        value -= 10;
        numAces--;
    }
    return value;
}

// Render cards in hand
function renderHand(hand, handElementId, hideFirstCard = false) {
    const handElement = document.getElementById(handElementId);
    handElement.innerHTML = '';
    hand.forEach((card, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        let cardValue = card.rank;
        if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') {
            cardValue = card.rank; // Display J, Q, K
        } else if (card.rank === 'A') {
            cardValue = 'A'; // Display A
        } else {
            cardValue = card.rank; // Display number
        }

        const suitClass = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';

        // Add 'hidden' class to the second card of the dealer's hand if hideFirstCard is true
        if (hideFirstCard && handElementId === 'dealer-hand' && index === 1) {
            cardDiv.classList.add('hidden');
            cardDiv.innerHTML = `<div class="card-value">?</div>`; // Show a question mark or similar
        } else {
            cardDiv.innerHTML = `
                <div class="card-suit-top-left ${suitClass}">${card.suit}</div>
                <div class="card-value">${cardValue}</div>
                <div class="card-suit-bottom-right ${suitClass}">${card.suit}</div>
            `;
        }
        handElement.appendChild(cardDiv);
    });
}

// Deal initial cards
function dealBlackjack() {
    blackjackBet = parseFloat(document.getElementById('blackjack-bet-amount').value);

    if (isNaN(blackjackBet) || blackjackBet <= 0 || blackjackBet > balance) {
        document.getElementById('blackjack-message').textContent = "Mise invalide. Assurez-vous d'avoir suffisamment de fonds.";
        return;
    }

    balance -= blackjackBet;
    updateBalanceDisplay();

    createDeck();
    playerHand = [];
    dealerHand = [];
    gameStarted = true;

    document.getElementById('blackjack-message').textContent = "Partie en cours...";
    document.getElementById('blackjack-message').classList.remove('win-text', 'loss-text'); // Clear previous messages

    // Deal two cards to player
    playerHand.push(deck.pop());
    playerHand.push(deck.pop());
    renderHand(playerHand, 'player-hand');
    document.getElementById('player-score').textContent = getHandValue(playerHand);

    // Deal two cards to dealer, one hidden
    dealerHand.push(deck.pop());
    dealerHand.push(deck.pop());
    // Modifié pour cacher la deuxième carte du croupier
    renderHand(dealerHand, 'dealer-hand', true); // Pass true to hide the second card
    // Le score du croupier ne montre que la première carte
    document.getElementById('dealer-score').textContent = getHandValue([dealerHand[0]]);


    // Disable bet input and Deal button
    document.getElementById('blackjack-bet-amount').disabled = true;
    document.getElementById('blackjack-deal-button').disabled = true;

    // Enable player action buttons
    document.getElementById('blackjack-hit-button').disabled = false;
    document.getElementById('blackjack-stand-button').disabled = false;

    // Enable double button if balance allows
    document.getElementById('blackjack-double-button').disabled = (balance < blackjackBet);

    // Check for immediate blackjack
    if (getHandValue(playerHand) === 21) {
        document.getElementById('blackjack-message').textContent = "Blackjack !";
        playerStand(); // Automatically stand and let dealer play
    }
}

// Player chooses to hit
function playerHit() {
    playerHand.push(deck.pop());
    renderHand(playerHand, 'player-hand');
    const playerScore = getHandValue(playerHand);
    document.getElementById('player-score').textContent = playerScore;

    if (playerScore > 21) {
        document.getElementById('blackjack-message').textContent = "BUST! Vous perdez.";
        document.getElementById('blackjack-message').classList.add('loss-text');
        endGameRound();
    } else if (playerScore === 21) {
        playerStand();
    }
}

// Player chooses to stand
function playerStand() {
    // Disable player action buttons
    document.getElementById('blackjack-hit-button').disabled = true;
    document.getElementById('blackjack-stand-button').disabled = true;
    document.getElementById('blackjack-double-button').disabled = true;

    // Révéler la carte cachée du croupier
    renderHand(dealerHand, 'dealer-hand', false); // Render all cards, no longer hiding

    dealerTurn();
}

// Player chooses to double down
function playerDouble() {
    if (balance < blackjackBet) {
        document.getElementById('blackjack-message').textContent = "Fonds insuffisants pour doubler !";
        return;
    }

    balance -= blackjackBet; // Double the bet
    blackjackBet *= 2;
    updateBalanceDisplay();
    document.getElementById('blackjack-current-bet').textContent = `Mise actuelle : ${blackjackBet} €`;

    playerHand.push(deck.pop()); // Only one more card
    renderHand(playerHand, 'player-hand');
    const playerScore = getHandValue(playerHand);
    document.getElementById('player-score').textContent = playerScore;

    if (playerScore > 21) {
        document.getElementById('blackjack-message').textContent = "BUST! Vous perdez.";
        document.getElementById('blackjack-message').classList.add('loss-text');
        endGameRound();
    } else {
        playerStand(); // Automatically stand after doubling
    }
}


// Dealer's turn
function dealerTurn() {
    let dealerScore = getHandValue(dealerHand);
    document.getElementById('dealer-score').textContent = dealerScore; // Update dealer score after revealing

    // Delay dealer's actions for better user experience
    const dealerInterval = setInterval(() => {
        if (dealerScore < 17) {
            dealerHand.push(deck.pop());
            renderHand(dealerHand, 'dealer-hand');
            dealerScore = getHandValue(dealerHand);
            document.getElementById('dealer-score').textContent = dealerScore;
        } else {
            clearInterval(dealerInterval);
            determineWinner();
        }
    }, 1000); // Dealer draws a card every second
}

// Determine the winner
function determineWinner() {
    const playerScore = getHandValue(playerHand);
    const dealerScore = getHandValue(dealerHand);
    let message = "";
    let payout = 0;

    if (playerScore > 21) {
        message = "Vous avez BUST! Vous perdez.";
    } else if (dealerScore > 21) {
        message = "Croupier a BUST! Vous gagnez!";
        payout = blackjackBet * 2; // Return bet + 1x win
    } else if (playerScore > dealerScore) {
        message = "Vous gagnez!";
        payout = blackjackBet * 2;
    } else if (dealerScore > playerScore) {
        message = "Croupier gagne. Vous perdez.";
    } else {
        message = "Poussée! C'est une égalité.";
        payout = blackjackBet; // Return the bet
    }

    document.getElementById('blackjack-message').textContent = message;
    balance += payout;
    updateBalanceDisplay();

    if (payout > 0) {
        document.getElementById('blackjack-message').classList.add('win-text');
        // showFloatingWinNumbers(payout, document.getElementById('blackjack-container')); // Uncomment if showFloatingWinNumbers is available
        setTimeout(() => {
            document.getElementById('blackjack-message').classList.remove('win-text');
        }, 1000);
    }
    endGameRound();
}

function endGameRound() {
    gameStarted = false; // Reset game state
    document.getElementById('blackjack-bet-amount').disabled = false; // Re-enable bet input
    document.getElementById('blackjack-deal-button').disabled = false; // Re-enable deal button
    document.getElementById('blackjack-hit-button').disabled = true;
    document.getElementById('blackjack-stand-button').disabled = true;
    document.getElementById('blackjack-double-button').disabled = true;
}