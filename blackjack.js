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
                <input type="number" id="blackjack-bet-amount" value="10" min="1" step="1">
                <button id="blackjack-deal-button" onclick="placeBlackjackBet()">Miser & Distribuer</button>
                <button id="blackjack-hit-button" onclick="playerHit()" disabled>Tirer</button>
                <button id="blackjack-stand-button" onclick="playerStand()" disabled>Rester</button>
                <button id="blackjack-double-button" onclick="playerDoubleDown()" disabled>Doubler</button>
            </div>
        </div>
        <button onclick="showMainMenu()">Retour</button>
    `;
    updateBalanceDisplay();
    resetBlackjackGame();
}

// Resets the game state without changing balance or betting amounts
function resetBlackjackGame() {
    deck = createDeck();
    shuffleDeck(deck);
    playerHand = [];
    dealerHand = [];
    document.getElementById('player-hand').innerHTML = '';
    document.getElementById('dealer-hand').innerHTML = '';
    document.getElementById('player-score').textContent = '0';
    document.getElementById('dealer-score').textContent = '0';
    document.getElementById('blackjack-message').textContent = 'Placez votre mise pour commencer !';
    document.getElementById('blackjack-current-bet').textContent = `Mise actuelle : ${blackjackBet} €`;

    // Disable all game action buttons initially
    document.getElementById('blackjack-deal-button').disabled = false;
    document.getElementById('blackjack-hit-button').disabled = true;
    document.getElementById('blackjack-stand-button').disabled = true;
    document.getElementById('blackjack-double-button').disabled = true;
    document.getElementById('blackjack-bet-amount').disabled = false;
}

// Creates a standard 52-card deck
function createDeck() {
    const newDeck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            newDeck.push({ rank, suit });
        }
    }
    return newDeck;
}

// Shuffles the deck using Fisher-Yates algorithm
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]]; // Swap
    }
}

// Deals a card from the deck
function dealCard(hand, isHidden = false) {
    if (deck.length === 0) {
        // If deck is empty, create and shuffle a new one
        deck = createDeck();
        shuffleDeck(deck);
        console.warn("Deck ran out of cards. A new deck has been created and shuffled.");
    }
    const card = deck.pop();
    hand.push(card);
    renderHand(hand, hand === dealerHand && isHidden); // Render dealer's first card hidden
    return card;
}

// Renders a hand of cards in the HTML
function renderHand(hand, hideFirstCard = false) {
    const handElement = hand === playerHand ? document.getElementById('player-hand') : document.getElementById('dealer-hand');
    handElement.innerHTML = ''; // Clear existing cards

    hand.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');

        let displayRank = card.rank;
        let suitSymbol = card.suit;
        let suitClass = (card.suit === '♥' || card.suit === '♦') ? 'red-suit' : 'black-suit';

        if (hand === dealerHand && hideFirstCard && index === 0) {
            cardElement.classList.add('hidden');
            // Display question mark or back of card if hidden
            cardElement.innerHTML = `<span class="card-value">?</span>`;
        } else {
            cardElement.innerHTML = `
                <span class="card-suit-top ${suitClass}">${suitSymbol}</span>
                <span class="card-value">${displayRank}</span>
                <span class="card-suit-bottom ${suitClass}">${suitSymbol}</span>
            `;
        }
        handElement.appendChild(cardElement);
    });

    updateScores();
}

// Calculates the value of a hand
function calculateHandValue(hand) {
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

    // Adjust for Aces (if value > 21, convert 11 to 1)
    while (value > 21 && numAces > 0) {
        value -= 10;
        numAces--;
    }
    return value;
}

// Updates scores display
function updateScores() {
    const playerScore = calculateHandValue(playerHand);
    const dealerScore = calculateHandValue(dealerHand);

    document.getElementById('player-score').textContent = playerScore;
    // Dealer's score for display, only show the value of the visible card initially
    if (gameStarted && dealerHand.length === 2 && document.getElementById('dealer-hand').children[0].classList.contains('hidden')) {
        const visibleCard = dealerHand[1]; // The second card is visible
        let visibleValue;
        if (visibleCard.rank === 'A') {
            visibleValue = 11;
        } else if (['K', 'Q', 'J'].includes(visibleCard.rank)) {
            visibleValue = 10;
        } else {
            visibleValue = parseInt(visibleCard.rank);
        }
        document.getElementById('dealer-score').textContent = `${visibleValue}`;
    } else {
        document.getElementById('dealer-score').textContent = dealerScore;
    }
}

// --- Game Flow Functions ---

function placeBlackjackBet() {
    if (gameStarted) { // Prevent placing new bets during an active game
        alert("Le jeu est déjà en cours. Veuillez terminer ou recommencer.");
        return;
    }

    const betAmountInput = document.getElementById('blackjack-bet-amount');
    const newBet = parseInt(betAmountInput.value);

    if (isNaN(newBet) || newBet <= 0) {
        alert("Veuillez entrer un montant de pari valide (nombre entier positif).");
        return;
    }
    if (balance < newBet) {
        alert("Solde insuffisant pour cette mise !");
        return;
    }

    blackjackBet = newBet;
    balance -= blackjackBet;
    updateBalanceDisplay();
    document.getElementById('blackjack-current-bet').textContent = `Mise actuelle : ${blackjackBet} €`;
    document.getElementById('blackjack-bet-amount').disabled = true; // Disable bet input
    document.getElementById('blackjack-deal-button').disabled = true; // Disable deal button until round ends

    startGameRound();
}

function startGameRound() {
    gameStarted = true;
    playerHand = [];
    dealerHand = [];
    document.getElementById('player-hand').innerHTML = '';
    document.getElementById('dealer-hand').innerHTML = '';
    document.getElementById('blackjack-message').textContent = 'Bonne chance !';

    // Deal initial cards
    dealCard(playerHand); // Player card 1
    dealCard(dealerHand, true); // Dealer card 1 (hidden)
    dealCard(playerHand); // Player card 2
    dealCard(dealerHand); // Dealer card 2 (visible)

    updateScores();
    checkInitialBlackjack();
}

function checkInitialBlackjack() {
    const playerScore = calculateHandValue(playerHand);
    const dealerScore = calculateHandValue(dealerHand);

    if (playerScore === 21 && dealerScore === 21) {
        document.getElementById('blackjack-message').textContent = "Poussée! Blackjack pour les deux!";
        revealDealerCard();
        balance += blackjackBet; // Return the bet
        endGameRound();
    } else if (playerScore === 21) {
        document.getElementById('blackjack-message').textContent = "BLACKJACK! Vous gagnez!";
        revealDealerCard();
        balance += blackjackBet * 2.5; // Payout 1.5x bet + original bet
        document.getElementById('blackjack-message').classList.add('win-text');
        endGameRound();
    } else if (dealerScore === 21) {
        document.getElementById('blackjack-message').textContent = "Blackjack du croupier! Vous perdez.";
        revealDealerCard();
        endGameRound();
    } else {
        // Enable player actions
        document.getElementById('blackjack-hit-button').disabled = false;
        document.getElementById('blackjack-stand-button').disabled = false;
        // Enable double down if player has enough balance and exactly 2 cards
        if (playerHand.length === 2 && balance >= blackjackBet) {
            document.getElementById('blackjack-double-button').disabled = false;
        } else {
            document.getElementById('blackjack-double-button').disabled = true;
        }
    }
}

function playerHit() {
    dealCard(playerHand);
    const playerScore = calculateHandValue(playerHand);
    document.getElementById('blackjack-message').textContent = `Vous avez tiré. Score: ${playerScore}`;
    document.getElementById('blackjack-double-button').disabled = true; // Cannot double down after hit

    if (playerScore > 21) {
        document.getElementById('blackjack-message').textContent = "Vous avez BUST! Vous perdez.";
        endGameRound();
    }
}

function playerStand() {
    document.getElementById('blackjack-message').textContent = "Vous restez. Au tour du croupier.";
    document.getElementById('blackjack-hit-button').disabled = true;
    document.getElementById('blackjack-stand-button').disabled = true;
    document.getElementById('blackjack-double-button').disabled = true;
    revealDealerCard();
    dealerTurn();
}

function playerDoubleDown() {
    if (balance < blackjackBet) {
        alert("Solde insuffisant pour doubler la mise !");
        return;
    }
    balance -= blackjackBet;
    blackjackBet *= 2; // Double the current bet
    updateBalanceDisplay();
    document.getElementById('blackjack-current-bet').textContent = `Mise actuelle : ${blackjackBet} €`;

    dealCard(playerHand); // Player gets one more card
    const playerScore = calculateHandValue(playerHand);
    document.getElementById('blackjack-double-button').disabled = true; // Cannot hit/double after double down
    document.getElementById('blackjack-hit-button').disabled = true;
    document.getElementById('blackjack-stand-button').disabled = true;


    if (playerScore > 21) {
        document.getElementById('blackjack-message').textContent = "Vous avez BUST! Vous perdez.";
        endGameRound();
    } else {
        document.getElementById('blackjack-message').textContent = `Vous avez doublé et tiré. Votre score : ${playerScore}. Au tour du croupier.`;
        dealerTurn();
    }
}

function revealDealerCard() {
    const dealerHandElement = document.getElementById('dealer-hand');
    if (dealerHandElement.children.length > 0 && dealerHandElement.children[0].classList.contains('hidden')) {
        dealerHandElement.children[0].classList.remove('hidden');
        renderHand(dealerHand); // Re-render to show value
    }
}

function dealerTurn() {
    let dealerScore = calculateHandValue(dealerHand);
    document.getElementById('blackjack-message').textContent = `Croupier tire. Score: ${dealerScore}`;

    const dealerTurnInterval = setInterval(() => {
        if (dealerScore < 17) {
            dealCard(dealerHand);
            dealerScore = calculateHandValue(dealerHand);
            document.getElementById('blackjack-message').textContent = `Croupier tire. Score: ${dealerScore}`;
        } else {
            clearInterval(dealerTurnInterval);
            determineWinner();
        }
    }, 1000); // Dealer takes a card every 1 second
}

function determineWinner() {
    const playerScore = calculateHandValue(playerHand);
    const dealerScore = calculateHandValue(dealerHand);
    let message = '';
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

    document.getElementById('blackjack-current-bet').textContent = `Mise actuelle : 0 €`;
    blackjackBet = 0; // Reset bet for next round
}