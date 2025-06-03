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
                <div class="bet-controls">
                    <label for="blackjack-bet-amount">Mise : </label>
                    <input type="number" id="blackjack-bet-amount" value="10" min="1" step="1">
                </div>
                <div class="blackjack-actions">
                    <button id="blackjack-deal-button" class="game-button">Distribuer</button>
                    <button id="blackjack-hit-button" class="game-button" disabled>Tirer</button>
                    <button id="blackjack-stand-button" class="game-button" disabled>Rester</button>
                </div>
            </div>
        </div>
        <button onclick="showMainMenu()" class="game-button">Retour au Menu</button>
    `;

    document.getElementById('blackjack-deal-button').addEventListener('click', dealBlackjack);
    document.getElementById('blackjack-hit-button').addEventListener('click', playerHit);
    document.getElementById('blackjack-stand-button').addEventListener('click', playerStand);

    updateBalanceDisplay();
    updateBlackjackBetDisplay();
}

// Function to create a new deck
function createDeck() {
    deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ rank, suit });
        }
    }
    shuffleDeck(deck);
}

// Function to shuffle the deck
function shuffleDeck(deckToShuffle) {
    for (let i = deckToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deckToShuffle[i], deckToShuffle[j]] = [deckToShuffle[j], deckToShuffle[i]];
    }
}

// Function to get card value
function getCardValue(card) {
    if (card.rank === 'A') return 11;
    if (['K', 'Q', 'J'].includes(card.rank)) return 10;
    return parseInt(card.rank);
}

// Function to calculate hand value
function calculateHandValue(hand) {
    let value = 0;
    let numAces = 0;

    for (const card of hand) {
        value += getCardValue(card);
        if (card.rank === 'A') {
            numAces++;
        }
    }

    while (value > 21 && numAces > 0) {
        value -= 10;
        numAces--;
    }
    return value;
}

// Function to display cards
function displayHand(hand, elementId, isDealer = false) {
    const handElement = document.getElementById(elementId);
    handElement.innerHTML = '';
    hand.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');

        // If it's the dealer's second card and not the end of the game, hide it
        if (isDealer && gameStarted && index === 1) {
            cardElement.classList.add('facedown');
            cardElement.innerHTML = `
                <div class="card-back"></div>
            `;
        } else {
            const suitColorClass = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
            cardElement.innerHTML = `
                <div class="card-suit-top-left ${suitColorClass}">${card.suit}</div>
                <div class="card-value">${card.rank}</div>
                <div class="card-suit-bottom-right ${suitColorClass}">${card.suit}</div>
            `;
        }
        handElement.appendChild(cardElement);
    });
}

// Function to update scores display
function updateScores() {
    document.getElementById('player-score').textContent = calculateHandValue(playerHand);
    // Dealer's score is only fully revealed at the end of the game or if player busts
    if (!gameStarted || calculateHandValue([dealerHand[0]]) === 21) { // Show full score if blackjack on deal for dealer
         document.getElementById('dealer-score').textContent = calculateHandValue(dealerHand);
    } else {
        // If game is started and dealer's first card is revealed, show only that value
        document.getElementById('dealer-score').textContent = calculateHandValue([dealerHand[0]]) + (gameStarted ? '+' : '');
    }
}

// Function to update blackjack bet display
function updateBlackjackBetDisplay() {
    document.getElementById('blackjack-current-bet').textContent = `Mise actuelle : ${blackjackBet} €`;
}

// Deal initial cards
function dealBlackjack() {
    const betInput = document.getElementById('blackjack-bet-amount');
    const bet = parseInt(betInput.value);

    if (isNaN(bet) || bet <= 0 || bet > balance) {
        document.getElementById('blackjack-message').textContent = "Mise invalide. Veuillez entrer un montant valide.";
        return;
    }

    blackjackBet = bet;
    balance -= blackjackBet;
    updateBalanceDisplay();
    updateBlackjackBetDisplay();

    createDeck();
    playerHand = [];
    dealerHand = [];
    document.getElementById('blackjack-message').textContent = "";

    // Initial deal
    playerHand.push(deck.pop());
    dealerHand.push(deck.pop());
    playerHand.push(deck.pop());
    dealerHand.push(deck.pop());

    displayHand(playerHand, 'player-hand');
    displayHand(dealerHand, 'dealer-hand', true); // Hide dealer's second card
    updateScores();

    gameStarted = true;
    betInput.disabled = true;
    document.getElementById('blackjack-deal-button').disabled = true;
    document.getElementById('blackjack-hit-button').disabled = false;
    document.getElementById('blackjack-stand-button').disabled = false;

    checkInitialBlackjack();
}

function checkInitialBlackjack() {
    const playerScore = calculateHandValue(playerHand);
    const dealerScore = calculateHandValue(dealerHand);

    if (playerScore === 21 && dealerScore === 21) {
        document.getElementById('blackjack-message').textContent = "Double Blackjack! C'est une égalité.";
        balance += blackjackBet; // Return the bet
        updateBalanceDisplay();
        endGameRound();
    } else if (playerScore === 21) {
        document.getElementById('blackjack-message').textContent = "Blackjack! Vous gagnez!";
        balance += blackjackBet * 2.5; // 1.5x win + original bet
        updateBalanceDisplay();
        document.getElementById('blackjack-message').classList.add('win-text');
        // showFloatingWinNumbers(blackjackBet * 1.5, document.getElementById('blackjack-container')); // Uncomment if showFloatingWinNumbers is available
        setTimeout(() => {
            document.getElementById('blackjack-message').classList.remove('win-text');
        }, 1000);
        endGameRound();
    } else if (dealerScore === 21) {
        document.getElementById('blackjack-message').textContent = "Croupier a Blackjack. Vous perdez.";
        endGameRound();
    }
}

// Player chooses to hit
function playerHit() {
    playerHand.push(deck.pop());
    displayHand(playerHand, 'player-hand');
    updateScores();

    if (calculateHandValue(playerHand) > 21) {
        document.getElementById('blackjack-message').textContent = "Vous avez BUST! Vous perdez.";
        endGameRound();
    }
}

// Player chooses to stand
function playerStand() {
    document.getElementById('blackjack-hit-button').disabled = true;
    document.getElementById('blackjack-stand-button').disabled = true;

    // Reveal dealer's second card
    displayHand(dealerHand, 'dealer-hand', false);
    updateScores(); // Update dealer's score to show full value

    dealerTurn();
}

// Dealer's turn logic
function dealerTurn() {
    let dealerScore = calculateHandValue(dealerHand);

    // Dealer hits on 16 or less, stands on 17 or more
    while (dealerScore < 17) {
        dealerHand.push(deck.pop());
        displayHand(dealerHand, 'dealer-hand', false);
        dealerScore = calculateHandValue(dealerHand);
        updateScores();
    }

    determineWinner();
}

// Determine the winner
function determineWinner() {
    const playerScore = calculateHandValue(playerHand);
    const dealerScore = calculateHandValue(dealerHand);
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
    document.getElementById('blackjack-hit-button').disabled = true; // Disable hit button
    document.getElementById('blackjack-stand-button').disabled = true; // Disable stand button
}