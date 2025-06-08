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
function initBlackjack() {
    currentGame = 'blackjack';
    gameStarted = false;
    blackjackBet = 0; // Reset bet for a new game

    // Attach event listeners
    document.getElementById('blackjack-deal-button').addEventListener('click', dealBlackjack);
    document.getElementById('blackjack-hit-button').addEventListener('click', playerHit);
    document.getElementById('blackjack-stand-button').addEventListener('click', playerStand);
    document.getElementById('blackjack-double-button').addEventListener('click', playerDoubleDown); // Add listener for Double Down

    // Reset game state and enable initial controls
    document.getElementById('blackjack-bet-amount').disabled = false;
    document.getElementById('blackjack-deal-button').disabled = false; // Enable deal button
    document.getElementById('blackjack-hit-button').disabled = true;
    document.getElementById('blackjack-stand-button').disabled = true;
    document.getElementById('blackjack-double-button').disabled = true; // Initially disabled

    document.getElementById('blackjack-message').textContent = "Placez votre mise et cliquez sur Distribuer !";
    document.getElementById('player-hand').innerHTML = '';
    document.getElementById('dealer-hand').innerHTML = '';
    document.getElementById('player-score').textContent = '0';
    document.getElementById('dealer-score').textContent = '0';

    updateBalanceDisplay(firebaseService.getUserBalance()); // Update balance display from firebaseService
    updateBlackjackBetDisplay();
    console.log("Blackjack: initBlackjack() appelé, jeu prêt pour la mise.");
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
    console.log("Blackjack: Deck créé et mélangé.");
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

        // If it's the dealer's second card and game has started, hide it
        if (isDealer && gameStarted && index === 1) {
            cardElement.classList.add('facedown');
            cardElement.innerHTML = `<div class="card-back"></div>`;
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
    console.log(`Blackjack: Main ${elementId} affichée.`);
}

// Function to update scores display
function updateScores() {
    document.getElementById('player-score').textContent = calculateHandValue(playerHand);
    
    // If game has started and dealer's second card is hidden, show only the first card's value + '+'
    if (gameStarted && dealerHand.length === 2 && document.querySelector('#dealer-hand .card.facedown')) {
        document.getElementById('dealer-score').textContent = calculateHandValue([dealerHand[0]]) + '+';
    } else {
        // Otherwise, show the full dealer score (either before game start, or after dealer's turn)
        document.getElementById('dealer-score').textContent = calculateHandValue(dealerHand);
    }
    console.log(`Blackjack: Scores mis à jour. Joueur: ${document.getElementById('player-score').textContent}, Croupier: ${document.getElementById('dealer-score').textContent}`);
}

// Function to update blackjack bet display
function updateBlackjackBetDisplay() {
    document.getElementById('blackjack-current-bet').textContent = `Mise actuelle : ${blackjackBet} €`;
}

// Deal initial cards
async function dealBlackjack() {
    console.log("Blackjack: dealBlackjack() appelé.");
    const betInput = document.getElementById('blackjack-bet-amount');
    const bet = parseInt(betInput.value);
    const currentBalance = firebaseService.getUserBalance();

    if (isNaN(bet) || bet <= 0 || bet > currentBalance) {
        document.getElementById('blackjack-message').textContent = "Mise invalide. Veuillez entrer un montant valide.";
        document.getElementById('blackjack-message').classList.add('loss-text');
        setTimeout(() => {
            document.getElementById('blackjack-message').classList.remove('loss-text');
        }, 1000);
        console.log("Blackjack: Mise invalide.");
        return;
    }

    blackjackBet = bet;
    await firebaseService.saveUserBalance(currentBalance - blackjackBet); // Deduct bet
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

    gameStarted = true; // Set gameStarted to true before displaying hands and updating scores
    displayHand(playerHand, 'player-hand');
    displayHand(dealerHand, 'dealer-hand', true); // Hide dealer's second card
    updateScores(); // Update scores after cards are displayed

    betInput.disabled = true;
    document.getElementById('blackjack-deal-button').disabled = true;
    document.getElementById('blackjack-hit-button').disabled = false;
    document.getElementById('blackjack-stand-button').disabled = false;
    // Enable Double button only if player can afford it and has 2 cards
    if (currentBalance >= blackjackBet * 2 && playerHand.length === 2) {
        document.getElementById('blackjack-double-button').disabled = false;
    } else {
        document.getElementById('blackjack-double-button').disabled = true;
    }
    
    console.log("Blackjack: Cartes distribuées, état initial du jeu configuré.");
    checkInitialBlackjack();
}

async function checkInitialBlackjack() {
    console.log("Blackjack: checkInitialBlackjack() appelé.");
    const playerScore = calculateHandValue(playerHand);
    const dealerScore = calculateHandValue(dealerHand);
    let currentBalance = firebaseService.getUserBalance();

    // Temporarily reveal dealer's second card to check for dealer blackjack
    displayHand(dealerHand, 'dealer-hand', false);
    updateScores(); // Update score after revealing for check

    if (playerScore === 21 && dealerScore === 21) {
        document.getElementById('blackjack-message').textContent = "Double Blackjack! C'est une égalité.";
        document.getElementById('blackjack-message').classList.add('win-text');
        await firebaseService.saveUserBalance(currentBalance + blackjackBet); // Return the bet
        console.log("Blackjack: Double Blackjack.");
        setTimeout(() => {
            document.getElementById('blackjack-message').classList.remove('win-text');
            endGameRound();
        }, 2000);
    } else if (playerScore === 21) {
        document.getElementById('blackjack-message').textContent = "Blackjack! Vous gagnez!";
        const payout = blackjackBet * 2.5; // 1.5x win + original bet
        await firebaseService.saveUserBalance(currentBalance + payout);
        document.getElementById('blackjack-message').classList.add('win-text');
        showFloatingWinNumbers(blackjackBet * 1.5, document.getElementById('blackjack-game-area')); 
        console.log("Blackjack: Joueur a Blackjack.");
        setTimeout(() => {
            document.getElementById('blackjack-message').classList.remove('win-text');
            endGameRound();
        }, 2000);
    } else if (dealerScore === 21) {
        document.getElementById('blackjack-message').textContent = "Croupier a Blackjack. Vous perdez.";
        document.getElementById('blackjack-message').classList.add('loss-text');
        console.log("Blackjack: Croupier a Blackjack.");
        setTimeout(() => {
            document.getElementById('blackjack-message').classList.remove('loss-text');
            endGameRound();
        }, 2000);
    } else {
        // If no immediate blackjack, re-hide dealer's second card for player's turn
        displayHand(dealerHand, 'dealer-hand', true);
        updateScores(); // Re-update score to show only first card + '+'
        document.getElementById('blackjack-hit-button').disabled = false;
        document.getElementById('blackjack-stand-button').disabled = false;
        // Re-enable Double button if conditions are still met
        if (firebaseService.getUserBalance() >= blackjackBet * 2 && playerHand.length === 2) {
            document.getElementById('blackjack-double-button').disabled = false;
        }
        console.log("Blackjack: Pas de Blackjack initial, le jeu continue.");
    }
}

// Player chooses to hit
async function playerHit() {
    console.log("Blackjack: playerHit() appelé.");
    playerHand.push(deck.pop());
    displayHand(playerHand, 'player-hand');
    updateScores();

    // Disable Double Down after hitting
    document.getElementById('blackjack-double-button').disabled = true;

    if (calculateHandValue(playerHand) > 21) {
        document.getElementById('blackjack-message').textContent = "Vous avez BUST! Vous perdez.";
        document.getElementById('blackjack-message').classList.add('loss-text');
        console.log("Blackjack: Joueur a BUST.");
        setTimeout(() => {
            document.getElementById('blackjack-message').classList.remove('loss-text');
            endGameRound();
        }, 2000);
    }
}

// Player chooses to stand
function playerStand() {
    console.log("Blackjack: playerStand() appelé.");
    document.getElementById('blackjack-hit-button').disabled = true;
    document.getElementById('blackjack-stand-button').disabled = true;
    document.getElementById('blackjack-double-button').disabled = true; // Disable Double Down on stand

    // Reveal dealer's second card
    displayHand(dealerHand, 'dealer-hand', false);
    updateScores(); // Update dealer's score to show full value

    dealerTurn();
}

// Player chooses to double down
async function playerDoubleDown() {
    console.log("Blackjack: playerDoubleDown() appelé.");
    const currentBalance = firebaseService.getUserBalance();
    if (currentBalance < blackjackBet) { // Check if player can afford to double the current bet
        document.getElementById('blackjack-message').textContent = "Solde insuffisant pour doubler la mise.";
        document.getElementById('blackjack-message').classList.add('loss-text');
        setTimeout(() => {
            document.getElementById('blackjack-message').classList.remove('loss-text');
        }, 1000);
        return;
    }

    await firebaseService.saveUserBalance(currentBalance - blackjackBet); // Deduct a second bet
    blackjackBet *= 2; // Double the current bet
    updateBlackjackBetDisplay();

    playerHand.push(deck.pop()); // Player gets one more card
    displayHand(playerHand, 'player-hand');
    updateScores();

    // Disable all player actions after double down
    document.getElementById('blackjack-hit-button').disabled = true;
    document.getElementById('blackjack-stand-button').disabled = true;
    document.getElementById('blackjack-double-button').disabled = true;

    if (calculateHandValue(playerHand) > 21) {
        document.getElementById('blackjack-message').textContent = "Vous avez BUST! Vous perdez.";
        document.getElementById('blackjack-message').classList.add('loss-text');
        console.log("Blackjack: Joueur a BUST après Double Down.");
        setTimeout(() => {
            document.getElementById('blackjack-message').classList.remove('loss-text');
            endGameRound();
        }, 2000);
    } else {
        dealerTurn(); // Proceed to dealer's turn
    }
}


// Dealer's turn logic
function dealerTurn() {
    console.log("Blackjack: dealerTurn() appelé.");
    let dealerScore = calculateHandValue(dealerHand);

    // Dealer hits on 16 or less, stands on 17 or more
    while (dealerScore < 17) {
        dealerHand.push(deck.pop());
        displayHand(dealerHand, 'dealer-hand', false);
        dealerScore = calculateHandValue(dealerHand);
        updateScores();
        console.log(`Blackjack: Croupier tire. Nouveau score: ${dealerScore}`);
    }

    determineWinner();
}

// Determine the winner
async function determineWinner() {
    console.log("Blackjack: determineWinner() appelé.");
    const playerScore = calculateHandValue(playerHand);
    const dealerScore = calculateHandValue(dealerHand);
    let message = "";
    let payout = 0;
    let currentBalance = firebaseService.getUserBalance();

    if (playerScore > 21) {
        message = "Vous avez BUST! Vous perdez.";
        document.getElementById('blackjack-message').classList.add('loss-text');
    } else if (dealerScore > 21) {
        message = "Croupier a BUST! Vous gagnez!";
        payout = blackjackBet * 2; // Return bet + 1x win
        document.getElementById('blackjack-message').classList.add('win-text');
    } else if (playerScore > dealerScore) {
        message = "Vous gagnez!";
        payout = blackjackBet * 2;
        document.getElementById('blackjack-message').classList.add('win-text');
    } else if (dealerScore > playerScore) {
        message = "Croupier gagne. Vous perdez.";
        document.getElementById('blackjack-message').classList.add('loss-text');
    } else {
        message = "Poussée! C'est une égalité.";
        payout = blackjackBet; // Return the bet
    }

    document.getElementById('blackjack-message').textContent = message;
    await firebaseService.saveUserBalance(currentBalance + payout);

    if (payout > 0) {
        showFloatingWinNumbers(payout, document.getElementById('blackjack-game-area'));
    }
    console.log(`Blackjack: Résultat: ${message}, Gain: ${payout}`);
    setTimeout(() => {
        document.getElementById('blackjack-message').classList.remove('win-text', 'loss-text');
        endGameRound();
    }, 2000); // Increased timeout for better visibility
}

function endGameRound() {
    console.log("Blackjack: endGameRound() appelé.");
    gameStarted = false; // Reset game state
    document.getElementById('blackjack-bet-amount').disabled = false; // Re-enable bet input
    document.getElementById('blackjack-deal-button').disabled = false; // Re-enable deal button
    document.getElementById('blackjack-hit-button').disabled = true; // Disable hit button
    document.getElementById('blackjack-stand-button').disabled = true; // Disable stand button
    document.getElementById('blackjack-double-button').disabled = true; // Disable double button
}

