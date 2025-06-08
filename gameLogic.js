// gameLogic.js
// This file handles all UI interactions and game flow,
// interacting with firebaseService.js for data operations.

// Global variables for game state and UI elements
let currentGame = null; // Stores the currently active game (e.g., 'slotMachine', 'blackjack')
let progressiveJackpotInterval = null;
let rewardCountdownInterval = null;

// New formatter for currency display with French locale for thousands separator
const currencyFormatter = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

document.addEventListener('DOMContentLoaded', () => {
    setupAuthUIListeners(); // Set up listeners for authentication UI
    setupGameMenuListeners(); // Set up listeners for game selection

    // Set up callbacks for Firebase Service to notify gameLogic
    firebaseService.setAuthStateChangedCallback(handleAuthStateChange);
    firebaseService.setUserDataLoadedCallback(handleUserDataLoaded);
    firebaseService.setBalanceUpdatedCallback(updateBalanceDisplay);
    firebaseService.setJackpotUpdatedCallback(updateProgressiveJackpotDisplay);
    firebaseService.setLeaderboardUpdatedCallback(updateLeaderboardDisplay);
    firebaseService.setRewardDataLoadedCallback(handleRewardDataLoaded);
    firebaseService.onUserCosmeticsUpdated(handleUserCosmeticsUpdated); // New: Listen for user cosmetics
    firebaseService.onActiveCosmeticsUpdated(handleActiveCosmeticsUpdated); // New: Listen for active cosmetics
    firebaseService.onAllCosmeticsLoaded(handleAllCosmeticsLoaded); // New: Listen for all available cosmetics
});

/**
 * Handles changes in the Firebase authentication state.
 * @param {firebase.User|null} user - The Firebase user object or null if logged out.
 */
async function handleAuthStateChange(user) {
    const authContainer = document.getElementById('auth-container');
    const gameContainer = document.getElementById('game-container');

    if (user) {
        // User logged in
        console.log("GameLogic: User logged in, showing game menu.");
        authContainer.style.display = 'none';
        gameContainer.style.display = 'block';
        displayGameSelectionMenu(); // Show the main menu
        // All data (balance, jackpot, leaderboard, reward, cosmetics) will be loaded by firebaseService
        // and its callbacks will update the UI accordingly.
        startJackpotIncrement(); // Start the jackpot increment ticker
        startRewardCountdown(); // Start the reward countdown
    } else {
        // User logged out
        console.log("GameLogic: User logged out, showing auth screen.");
        authContainer.style.display = 'flex';
        gameContainer.style.display = 'none';

        // Reset auth forms
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('initial-auth-options').style.display = 'flex';
        document.getElementById('auth-prompt-message').textContent = "Veuillez choisir une option :";

        document.getElementById('email-input').value = '';
        document.getElementById('password-input').value = '';
        document.getElementById('register-email-input').value = '';
        document.getElementById('register-password-input').value = '';
        document.getElementById('username-input').value = '';

        const authMessage = document.getElementById('auth-message');
        if (authMessage) {
            authMessage.textContent = '';
            authMessage.classList.remove('win-text', 'loss-text');
        }

        stopJackpotIncrement(); // Stop the jackpot increment ticker
        stopRewardCountdown(); // Stop reward countdown
        updateProgressiveJackpotDisplay(0); // Reset jackpot display
        // Hide leaderboard if it was visible
        const leaderboardContainer = document.getElementById('leaderboard-container');
        if (leaderboardContainer) {
            leaderboardContainer.style.display = 'none'; 
        }
        // Remove any active cosmetic classes from the body
        applyActiveCosmetics({});
    }
}

/**
 * Handles user data loaded from Firebase Service.
 * @param {number} balance - The loaded user balance.
 */
function handleUserDataLoaded(balance) {
    console.log("GameLogic: User data loaded, updating balance display:", balance);
    updateBalanceDisplay(balance);
}

/**
 * Handles reward data loaded from Firebase Service.
 * @param {number} timestamp - The last reward timestamp.
 */
function handleRewardDataLoaded(timestamp) {
    console.log("GameLogic: Reward data loaded, starting countdown.");
    startRewardCountdown(); // Start or update the countdown based on new timestamp
}

/**
 * Handles user cosmetics data loaded or updated from Firebase Service.
 * @param {Array<string>} cosmetics - The array of cosmetic IDs owned by the user.
 */
function handleUserCosmeticsUpdated(cosmetics) {
    console.log("GameLogic: User owned cosmetics updated:", cosmetics);
    // If shop is open, re-render it to reflect new ownership
    if (currentGame === 'shop') {
        console.log("GameLogic: Shop is active, re-rendering shop after user cosmetics update.");
        // We ensure that _allCosmetics in shop.js is up-to-date
        // The initShop function will fetch active and owned cosmetics from firebaseService directly.
        initShop(updateBalanceDisplay, showFloatingWinNumbers, currencyFormatter, firebaseService.getAllAvailableCosmetics());
    }
}

/**
 * Handles active cosmetics data loaded or updated from Firebase Service.
 * @param {Object} activeCosmetics - The object of currently active cosmetics.
 */
function handleActiveCosmeticsUpdated(activeCosmetics) {
    console.log("GameLogic: Active cosmetics updated:", activeCosmetics);
    applyActiveCosmetics(activeCosmetics);
    // If shop is open, re-render it to reflect new active state
    if (currentGame === 'shop') {
        console.log("GameLogic: Shop is active, re-rendering shop after active cosmetics update.");
        initShop(updateBalanceDisplay, showFloatingWinNumbers, currencyFormatter, firebaseService.getAllAvailableCosmetics());
    } else if (currentGame === 'slot') {
        // Also update slot machine visuals if we are currently in the slot game
        // Pass the activeCosmetics object directly to updateSlotCosmeticVisuals
        if (typeof updateSlotCosmeticVisuals === 'function') {
            updateSlotCosmeticVisuals(activeCosmetics);
        }
    }
}

/**
 * Handles all available cosmetics data loaded from Firebase Service.
 * This is the primary entry point for displaying shop items.
 * @param {Array<Object>} allCosmetics - The array of all available cosmetic objects.
 */
function handleAllCosmeticsLoaded(allCosmetics) {
    console.log("GameLogic: All available cosmetics loaded:", allCosmetics);
    // If shop is currently the active game, initialize it with the loaded data
    if (currentGame === 'shop') {
        console.log("GameLogic: Shop is current game, initializing shop with all available cosmetics.");
        initShop(updateBalanceDisplay, showFloatingWinNumbers, currencyFormatter, allCosmetics);
    }
}

// --- Authentication UI Logic ---

/**
 * Sets up listeners for authentication related buttons.
 */
function setupAuthUIListeners() {
    document.getElementById('show-login-form').addEventListener('click', () => showAuthForm('login'));
    document.getElementById('show-register-form').addEventListener('click', () => showAuthForm('register'));
    document.getElementById('login-button').addEventListener('click', handleLogin);
    document.getElementById('create-account-button').addEventListener('click', handleRegister);
    document.getElementById('forgot-password-button').addEventListener('click', handleForgotPassword);
    document.getElementById('back-to-auth-options').addEventListener('click', showInitialAuthOptions);
    document.getElementById('back-to-auth-options-register').addEventListener('click', showInitialAuthOptions);
}

/**
 * Displays the specified authentication form.
 * @param {string} formType - 'login' or 'register'.
 */
function showAuthForm(formType) {
    document.getElementById('initial-auth-options').style.display = 'none';
    document.getElementById('auth-prompt-message').textContent = '';
    document.getElementById('auth-message').textContent = '';

    if (formType === 'login') {
        document.getElementById('login-form').style.display = 'flex';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('auth-prompt-message').textContent = "Veuillez vous connecter :";
    } else if (formType === 'register') {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'flex';
        document.getElementById('auth-prompt-message').textContent = "Veuillez créer votre compte :";
    }
}

/**
 * Shows the initial authentication options (Login/Register buttons).
 */
function showInitialAuthOptions() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('initial-auth-options').style.display = 'flex';
    document.getElementById('auth-prompt-message').textContent = "Veuillez choisir une option :";
    document.getElementById('auth-message').textContent = '';
}

/**
 * Handles user login attempt.
 */
async function handleLogin() {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const authMessage = document.getElementById('auth-message');

    if (!email || !password) {
        authMessage.textContent = "Veuillez entrer votre email et mot de passe.";
        authMessage.classList.add('loss-text');
        authMessage.classList.remove('win-text');
        return;
    }

    const result = await firebaseService.signInUser(email, password);
    if (result.success) {
        authMessage.textContent = "Connexion réussie !";
        authMessage.classList.add('win-text');
        authMessage.classList.remove('loss-text');
        // UI will transition via handleAuthStateChange callback
    } else {
        let errorMessage = "Erreur de connexion.";
        if (result.error.code === 'auth/user-not-found' || result.error.code === 'auth/wrong-password') {
            errorMessage = "Email ou mot de passe incorrect.";
        } else if (result.error.code === 'auth/invalid-email') {
            errorMessage = "Format d'email invalide.";
        } else if (result.error.code === 'auth/too-many-requests') {
            errorMessage = "Trop de tentatives de connexion échouées. Veuillez réessayer plus tard.";
        } else {
            errorMessage = result.error.message;
        }
        authMessage.textContent = errorMessage;
        authMessage.classList.add('loss-text');
        authMessage.classList.remove('win-text');
    }
}

/**
 * Handles new user registration attempt.
 */
async function handleRegister() {
    const username = document.getElementById('username-input').value;
    const email = document.getElementById('register-email-input').value;
    const password = document.getElementById('register-password-input').value;
    const authMessage = document.getElementById('auth-message');

    if (!username || !email || !password) {
        authMessage.textContent = "Veuillez remplir tous les champs (Nom d'utilisateur, Email, Mot de passe).";
        authMessage.classList.add('loss-text');
        authMessage.classList.remove('win-text');
        return;
    }
    if (password.length < 6) {
        authMessage.textContent = "Le mot de passe doit contenir au moins 6 caractères.";
        authMessage.classList.add('loss-text');
        authMessage.classList.remove('win-text');
        return;
    }

    const result = await firebaseService.registerUser(username, email, password);
    if (result.success) {
        authMessage.textContent = "Compte créé avec succès ! Vous pouvez maintenant vous connecter.";
        authMessage.classList.add('win-text');
        authMessage.classList.remove('loss-text');
        showAuthForm('login'); // Show login form after successful registration
    } else {
        let errorMessage = "Erreur lors de la création du compte.";
        if (result.error.code === 'auth/email-already-in-use') {
            errorMessage = "Cet email est déjà utilisé.";
        } else if (result.error.code === 'auth/weak-password') {
            errorMessage = "Mot de passe trop faible (doit contenir au moins 6 caractères).";
        } else if (result.error.code === 'auth/invalid-email') {
            errorMessage = "Format d'email invalide.";
        } else {
            errorMessage = result.error.message;
        }
        authMessage.textContent = errorMessage;
        authMessage.classList.add('loss-text');
        authMessage.classList.remove('win-text');
    }
}

/**
 * Handles password reset request.
 */
async function handleForgotPassword() {
    const emailInput = document.getElementById('email-input');
    const email = emailInput.value;
    const authMessage = document.getElementById('auth-message');

    if (!email) {
        authMessage.textContent = "Veuillez entrer votre email pour réinitialiser votre mot de passe.";
        authMessage.classList.add('loss-text');
        authMessage.classList.remove('win-text');
        return;
    }

    const result = await firebaseService.sendPasswordResetEmail(email);
    if (result.success) {
        authMessage.textContent = "Un email de réinitialisation de mot de passe a été envoyé à votre adresse.";
        authMessage.classList.add('win-text');
        authMessage.classList.remove('loss-text');
    } else {
        let errorMessage = "Erreur lors de l'envoi de l'email de réinitialisation.";
        if (result.error.code === 'auth/user-not-found') {
            errorMessage = "Aucun utilisateur trouvé avec cet email.";
        } else if (result.error.code === 'auth/invalid-email') {
            errorMessage = "Format d'email invalide.";
        } else {
            errorMessage = result.error.message;
        }
        authMessage.textContent = errorMessage;
        authMessage.classList.add('loss-text');
        authMessage.classList.remove('win-text');
    }
}

/**
 * Handles user logout.
 */
async function logout() {
    await firebaseService.logoutUser();
    // UI will be updated by handleAuthStateChange callback
}

// --- Game Menu & Navigation Logic ---

/**
 * Displays the main game selection menu.
 * This function rebuilds the HTML for the game container.
 */
function displayGameSelectionMenu() {
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <div class="main-menu">
            <h1>BIENVENUE AU JEWBUZZ CASINO !</h1>
            <p>Solde : <span id="current-balance">${currencyFormatter.format(firebaseService.getUserBalance())}</span> €</p>
            <!-- Jackpot here -->
            <div id="progressive-jackpot-container">
                <p>JACKPOT : <span id="progressive-jackpot-display">${currencyFormatter.format(firebaseService.getProgressiveJackpot())}</span> €</p>
            </div>
            <h1>Choisissez votre jeu</h1>
            <div class="game-buttons">
                <button class="game-button" onclick="startSlotMachine()">Machines à Sous</button>
                <button class="game-button" onclick="startBlackjack()">Blackjack</button>
                <button class="game-button" onclick="startChickenGame()">Jeu du Poulet</button>
                <button class="game-button" onclick="startShop()">Boutique</button> <!-- New: Shop button -->
                <!-- Free Reward Button -->
                <button id="free-reward-button" class="game-button free-reward-button">Récompense Gratuite</button>
            </div>
            <div id="free-reward-countdown" class="free-reward-countdown"></div>
        </div>

        <!-- Leaderboard container needs to be present in the main menu view -->
        <div id="leaderboard-container">
            <h2>🏆 Leaderboard 🏆</h2>
            <ol id="leaderboard-list"></ol>
        </div>
        <button id="logout-button" class="game-button logout-button">Se déconnecter</button>
        <!-- Game specific containers, initially hidden -->
        <div id="slot-machine-container" style="display:none;"></div>
        <div id="blackjack-container" style="display:none;"></div>
        <div id="chicken-game-container" style="display:none;"></div>
        <div id="shop-container" style="display:none;"></div> 

        <button id="back-to-menu" class="game-button" style="display:none; margin-top: 20px;" onclick="showMainMenu()">Retour au Menu</button>
    `;
    setupGameMenuListeners(); // Re-attach listeners after HTML recreation
    updateBalanceDisplay(firebaseService.getUserBalance()); // Ensure balance is updated
    updateProgressiveJackpotDisplay(firebaseService.getProgressiveJackpot()); // Ensure jackpot display is correct
    firebaseService.loadLeaderboard(); // Explicitly load leaderboard data
    console.log("GameLogic: HTML for main menu re-rendered. Jackpot display element (after render):", document.getElementById('progressive-jackpot-display'));
    // Leaderboard and reward countdown will be updated by their respective callbacks.
}

/**
 * Shows the main menu and hides game-specific containers.
 */
function showMainMenu() {
    // Hide all game containers explicitly
    document.getElementById('slot-machine-container').style.display = 'none';
    document.getElementById('blackjack-container').style.display = 'none';
    document.getElementById('chicken-game-container').style.display = 'none';
    document.getElementById('shop-container').style.display = 'none';

    // Show main menu elements
    document.querySelector('.main-menu').style.display = 'block';
    document.getElementById('progressive-jackpot-container').style.display = 'block';
    document.getElementById('leaderboard-container').style.display = 'block';
    document.getElementById('logout-button').style.display = 'block';
    document.getElementById('free-reward-button').style.display = 'block';
    document.getElementById('free-reward-countdown').style.display = 'block';
    document.getElementById('back-to-menu').style.display = 'none'; // Hide general back button

    updateBalanceDisplay(firebaseService.getUserBalance()); // Ensure balance is updated on return to main menu
    updateProgressiveJackpotDisplay(firebaseService.getProgressiveJackpot());
    startRewardCountdown(); // Re-start countdown
    firebaseService.loadLeaderboard(); // Explicitly load leaderboard data
    
    // Clear any game-specific 'current-game'
    currentGame = null; 
}


/**
 * Sets up listeners for game menu buttons.
 */
function setupGameMenuListeners() {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

    const backToMenuButton = document.getElementById('back-to-menu');
    if (backToMenuButton) {
        backToMenuButton.addEventListener('click', showMainMenu);
    }

    // Attach listeners for game selection buttons
    const gameButtonsContainer = document.querySelector('.main-menu .game-buttons');
    if (gameButtonsContainer) {
        gameButtonsContainer.addEventListener('click', (event) => {
            if (event.target.tagName === 'BUTTON') {
                if (event.target.textContent.includes('Machines à Sous')) {
                    startSlotMachine();
                } else if (event.target.textContent.includes('Blackjack')) {
                    startBlackjack();
                } else if (event.target.textContent.includes('Jeu du Poulet')) {
                    startChickenGame();
                } else if (event.target.textContent.includes('Boutique')) { // New: Shop button handler
                    startShop();
                } else if (event.target.id === 'free-reward-button') {
                    collectFreeReward();
                }
            }
        });
    }
}

/**
 * Hides all game-specific containers and the main menu elements that are not universally present.
 * Ensures only the active game container is visible.
 */
function hideAllGameContainersAndMenu() {
    // Hide main menu elements
    const mainMenu = document.querySelector('.main-menu');
    if (mainMenu) mainMenu.style.display = 'none';
    
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) logoutButton.style.display = 'none'; // Hide logout button in game view

    const jackpotContainer = document.getElementById('progressive-jackpot-container');
    if (jackpotContainer) jackpotContainer.style.display = 'none';
    const leaderboardContainer = document.getElementById('leaderboard-container');
    if (leaderboardContainer) leaderboardContainer.style.display = 'none';
    const freeRewardButton = document.getElementById('free-reward-button');
    if (freeRewardButton) freeRewardButton.style.display = 'none';
    const freeRewardCountdown = document.getElementById('free-reward-countdown');
    if (freeRewardCountdown) freeRewardCountdown.style.display = 'none';
    
    // Hide all specific game containers
    const slotContainer = document.getElementById('slot-machine-container');
    if (slotContainer) slotContainer.style.display = 'none';
    const blackjackContainer = document.getElementById('blackjack-container');
    if (blackjackContainer) blackjackContainer.style.display = 'none';
    const chickenContainer = document.getElementById('chicken-game-container');
    if (chickenContainer) chickenContainer.style.display = 'none';
    const shopContainer = document.getElementById('shop-container'); 
    if (shopContainer) shopContainer.style.display = 'none';

    stopRewardCountdown(); // Stop countdown when navigating away from main menu
}


// Functions to start specific games (these would typically trigger game-specific logic)
function startSlotMachine() {
    currentGame = 'slot';
    hideAllGameContainersAndMenu(); // Hide main menu elements and other games
    
    const slotContainer = document.getElementById('slot-machine-container');
    // Load HTML only if it's not already loaded
    if (!slotContainer.innerHTML.trim()) {
        slotContainer.innerHTML = `
            <h2>✦ MACHINE À SOUS ✦</h2>
            <p>Solde : <span id="current-balance">${currencyFormatter.format(firebaseService.getUserBalance())}</span> €</p>
            <div id="slots-grid">
                <!-- Slots HTML will be generated here by slotMachine.js -->
            </div>
            <p id="gain-text">Gain : 0 €</p>
            <p>Tours Gratuits : <span id="free-spins-display">0</span></p>

            <div class="bet-controls">
                <label for="bet-select">Mise :</label>
                <select id="bet-select">
                    <!-- Options will be populated by slotMachine.js -->
                </select>
            </div>
            <br/>
            <button id="spin-button" class="game-button">Lancer</button>
            <button id="auto-spin-button" class="game-button">Auto Spin</button>
            <div id="auto-spin-remaining-display" style="font-size: 0.8em; margin-top: 5px; color: #ccc;"></div>
            <button id="back-to-menu-slot" class="game-button" style="margin-top: 20px;">Retour au Menu</button>
             <!-- Removed symbol stats display from here, now only in slotMachine.js init -->
        `;
        // Now call the actual game initialization, which also attaches listeners
        initSlotMachine(); 
        // Attach back to menu button listener
        document.getElementById('back-to-menu-slot').addEventListener('click', showMainMenu);
    }
    slotContainer.style.display = 'block'; // Show the slot machine container
    updateBalanceDisplay(firebaseService.getUserBalance()); // Ensure balance is updated
}

function startBlackjack() {
    currentGame = 'blackjack';
    hideAllGameContainersAndMenu(); // Hide main menu elements and other games

    const blackjackContainer = document.getElementById('blackjack-container');
    if (!blackjackContainer.innerHTML.trim()) {
        blackjackContainer.innerHTML = `
            <h2>♦ BLACKJACK ♦</h2>
            <p>Solde : <span id="current-balance">${currencyFormatter.format(firebaseService.getUserBalance())}</span> €</p>
            <div id="blackjack-game-area">
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
                        <button id="blackjack-double-button" class="game-button" disabled>Doubler</button>
                    </div>
                </div>
            </div>
            <button id="back-to-menu-blackjack" class="game-button" style="margin-top: 20px;">Retour au Menu</button>
        `;
        initBlackjack(); 
        document.getElementById('back-to-menu-blackjack').addEventListener('click', showMainMenu);
    }
    blackjackContainer.style.display = 'block';
    updateBalanceDisplay(firebaseService.getUserBalance());
}

function startChickenGame() {
    currentGame = 'chickenGame';
    hideAllGameContainersAndMenu(); 

    const chickenContainer = document.getElementById('chicken-game-container');
    if (!chickenContainer.innerHTML.trim()) {
        chickenContainer.innerHTML = `
            <h2>🐔 JEU DU POULET 🦴</h2>
            <p>Solde : <span id="current-balance">${currencyFormatter.format(firebaseService.getUserBalance())}</span> €</p>
            <div id="chicken-game-area">
                <div class="chicken-controls">
                    <div class="bet-controls">
                        <label for="chicken-bet-select">Mise : </label>
                        <select id="chicken-bet-select">
                            <!-- Options will be populated by chicken.js -->
                        </select>
                    </div>
                    <div>
                        <label for="chicken-bones-input">Os : </label>
                        <input type="number" id="chicken-bones-input" value="3" min="1" max="24">
                    </div>
                    <button id="chicken-play-button" class="game-button">Jouer</button>
                </div>
                
                <p id="chicken-message" class="chicken-message">Choisissez votre mise et le nombre d'os, puis cliquez sur Jouer !</p>

                <div class="chicken-stats-and-cashout">
                    <p id="chicken-current-multiplier">Multiplicateur Actuel : x1.00</p>
                    <p id="chicken-potential-win">Gain Potentiel : 0.00 €</p>
                    <button id="chicken-cashout-button" class="game-button" disabled>Encaisser</button>
                </div>
                
                <div id="chicken-grid"></div>

            </div>
            <button id="back-to-menu-chicken" class="game-button" style="margin-top: 20px;">Retour au Menu</button>
        `;
        initChickenGame(); 
        document.getElementById('back-to-menu-chicken').addEventListener('click', showMainMenu);
    }
    chickenContainer.style.display = 'block';
    updateBalanceDisplay(firebaseService.getUserBalance());
}


/**
 * Starts the shop interface.
 */
function startShop() {
    currentGame = 'shop';
    hideAllGameContainersAndMenu(); 
    
    const shopContainer = document.getElementById('shop-container');
    if (!shopContainer.innerHTML.trim()) {
        shopContainer.innerHTML = `
            <h2>🛍️ Boutique de Cosmétiques 🛍️</h2>
            <p>Solde : <span id="current-balance">${currencyFormatter.format(firebaseService.getUserBalance())}</span> €</p>
            <div id="shop-message" class="shop-message"></div>
            <div id="cosmetic-grid" class="cosmetic-grid">
                <!-- Cosmetic items will be loaded here by shop.js -->
                <p>Chargement des articles de la boutique...</p>
            </div>
            <button id="back-to-menu-shop" class="game-button" style="margin-top: 20px;">Retour au Menu</button>
        `;
        // Initialize shop after the HTML is rendered.
        // The handleAllCosmeticsLoaded callback will be triggered by firebaseService
        // and will then call initShop with the actual data.
        initShop(updateBalanceDisplay, showFloatingWinNumbers, currencyFormatter, firebaseService.getAllAvailableCosmetics()); 
        document.getElementById('back-to-menu-shop').addEventListener('click', showMainMenu);
    }
    shopContainer.style.display = 'flex'; // Ensure shop container is visible
    updateBalanceDisplay(firebaseService.getUserBalance());
}

// --- Balance and Jackpot UI Update Functions ---

/**
 * Updates the displayed user balance.
 * @param {number} newBalance - The new balance to display.
 */
function updateBalanceDisplay(newBalance) {
    // Use firebaseService.getUserBalance() if newBalance is not explicitly passed,
    // ensuring we always get the most up-to-date balance.
    const balanceToDisplay = newBalance !== undefined ? newBalance : firebaseService.getUserBalance();
    const balanceElements = document.querySelectorAll('#current-balance');
    balanceElements.forEach(element => {
        element.textContent = currencyFormatter.format(balanceToDisplay);
    });
}

/**
 * Updates the displayed progressive jackpot.
 * @param {number} newJackpot - The new jackpot amount to display.
 */
function updateProgressiveJackpotDisplay(newJackpot) {
    const jackpotDisplayElement = document.getElementById('progressive-jackpot-display');
    const jackpotContainer = document.getElementById('progressive-jackpot-container');
    
    console.log("GameLogic: Updating jackpot display. New jackpot:", newJackpot, "Element found:", !!jackpotDisplayElement);

    if (jackpotDisplayElement) {
        jackpotDisplayElement.textContent = currencyFormatter.format(newJackpot);
    } else {
        console.warn("GameLogic: Jackpot display element not found (progressive-jackpot-display). This is expected if not in main menu or game views where it's displayed).");
    }

    // Only show jackpot container if user is logged in AND it's the main menu
    const isMainMenu = document.querySelector('.main-menu') && document.querySelector('.main-menu').style.display !== 'none';
    if (jackpotContainer) {
        jackpotContainer.style.display = (firebaseService.getCurrentUserId() && isMainMenu) ? 'flex' : 'none';
        console.log("GameLogic: Jackpot container display style set to:", jackpotContainer.style.display);
    } else {
        console.warn("GameLogic: Jackpot container element not found (progressive-jackpot-container). This is expected if not in main menu or game views where it's displayed).");
    }
}

/**
 * Starts the interval for incrementing the progressive jackpot.
 */
function startJackpotIncrement() {
    if (progressiveJackpotInterval) {
        clearInterval(progressiveJackpotInterval);
    }
    // Increment every second and save every 10 seconds (or more frequently if desired)
    progressiveJackpotInterval = setInterval(async () => {
        // Access constants and functions via the global firebaseService object
        const incrementAmount = firebaseService.getRewardConstants().JACKPOT_INCREMENT_PER_SECOND || 2;
        firebaseService.incrementProgressiveJackpot(incrementAmount);
        updateProgressiveJackpotDisplay(firebaseService.getProgressiveJackpot());
        // Periodically save the jackpot to Firestore (e.g., every 10 seconds)
        if (Date.now() % 10000 < 1000) { // Save approximately every 10 seconds
            await firebaseService.saveProgressiveJackpot(firebaseService.getProgressiveJackpot()); // Pass the current jackpot value
        }
    }, 1000); // Update every 1 second
}

/**
 * Stops the jackpot increment interval.
 */
function stopJackpotIncrement() {
    if (progressiveJackpotInterval) {
        clearInterval(progressiveJackpotInterval);
        progressiveJackpotInterval = null;
    }
}

// --- Leaderboard UI Update Functions ---

/**
 * Updates the displayed leaderboard.
 * @param {Array<Object>} leaderboardData - An array of user objects ({username, balance}).
 */
function updateLeaderboardDisplay(leaderboardData) {
    console.log("GameLogic: updateLeaderboardDisplay called with data:", leaderboardData);
    const leaderboardList = document.getElementById('leaderboard-list');
    const leaderboardContainer = document.getElementById('leaderboard-container');

    // Only display the leaderboard if a user is logged in and we are in the main menu
    const isMainMenu = document.querySelector('.main-menu') && document.querySelector('.main-menu').style.display !== 'none';
    if (!firebaseService.getCurrentUserId() || !isMainMenu) {
        console.log("GameLogic: Leaderboard not displayed (user not logged in or not in main menu).");
        if (leaderboardContainer) leaderboardContainer.style.display = 'none';
        return;
    } else {
        console.log("GameLogic: Displaying leaderboard as user is logged in and in main menu.");
        if (leaderboardContainer) leaderboardContainer.style.display = 'flex';
    }

    if (leaderboardList) {
        leaderboardList.innerHTML = ''; // Clear current leaderboard

        // Sort the data by balance in descending order as per instructions
        const sortedLeaderboardData = [...leaderboardData].sort((a, b) => b.balance - a.balance);
        console.log("GameLogic: Sorted Leaderboard Data:", sortedLeaderboardData);

        if (sortedLeaderboardData.length === 0) {
            leaderboardList.innerHTML = `
                <li class="loss-text" style="text-align: center; justify-content: center;">
                    Aucun joueur à afficher dans le classement.
                    <br>Assurez-vous que vos règles Firestore autorisent la lecture de la collection 'users'
                    et qu'il y a des utilisateurs avec un solde.
                </li>
            `;
            console.log("GameLogic: Leaderboard empty message displayed.");
            return;
        }

        sortedLeaderboardData.forEach((userData, index) => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span class="leaderboard-rank">${index + 1}.</span>
                <span class="leaderboard-username">${userData.username}</span>
                <span class="leaderboard-balance">${currencyFormatter.format(userData.balance)} €</span>
            `;
            leaderboardList.appendChild(listItem);
        });
        console.log("GameLogic: Leaderboard UI updated with sorted data.");
    } else {
        console.warn("GameLogic: Leaderboard list element not found.");
    }
}

// --- Floating Win Numbers Animation ---

/**
 * Displays animated floating numbers for win/loss amounts.
 * @param {number} amount - The amount to display (positive for win, negative for loss).
 * @param {HTMLElement} parentElement - The parent element to attach the floating numbers to.
 */
function showFloatingWinNumbers(amount, parentElement) {
    if (!parentElement) {
        console.error(`showFloatingWinNumbers: parentElement is null or undefined.`);
        return;
    }

    const isWin = amount >= 0;
    const displayAmount = isWin ? `+${currencyFormatter.format(amount)}€` : `${currencyFormatter.format(amount)}€`;
    const color = isWin ? 'hsl(150, 100%, 70%)' : 'hsl(0, 100%, 70%)'; // Green for win, Red for loss

    const numberOfSpans = Math.min(10, Math.ceil(Math.abs(amount) / (isWin ? 15 : 50))); // More for wins, fewer for losses

    let floatingContainer = parentElement.querySelector('.floating-win-number-container');
    if (!floatingContainer) {
        floatingContainer = document.createElement('div');
        floatingContainer.classList.add('floating-win-number-container');
        parentElement.appendChild(floatingContainer);
    } else {
        floatingContainer.innerHTML = ''; // Clear previous numbers
    }

    const parentRect = parentElement.getBoundingClientRect();

    const popAreaWidth = parentRect.width * 0.5;
    const popAreaHeight = parentRect.height * 0.4;
    const popAreaOffsetX = (parentRect.width - popAreaWidth) / 2;
    const popAreaOffsetY = (parentRect.height - popAreaHeight) / 2;

    for (let i = 0; i < numberOfSpans; i++) {
        const numberSpan = document.createElement('span');
        numberSpan.classList.add('floating-win-number');
        numberSpan.style.color = color;

        const startX = (Math.random() * popAreaWidth) + popAreaOffsetX;
        const startY = (Math.random() * popAreaHeight) + popAreaOffsetY;

        const endOffsetX = (Math.random() - 0.5) * (parentRect.width * 1.8);
        const endOffsetY = (Math.random() - 0.5) * (parentRect.height * 1.8);

        numberSpan.textContent = displayAmount; // Display the full amount on each span

        numberSpan.style.setProperty('--start-x', `${startX}px`);
        numberSpan.style.setProperty('--start-y', `${startY}px`);
        numberSpan.style.setProperty('--end-offset-x', `${endOffsetX}px`);
        numberSpan.style.setProperty('--end-offset-y', `${endOffsetY}px`);

        numberSpan.style.animationDelay = `${Math.random() * 0.2}s`;
        numberSpan.style.animationDuration = `${Math.random() * 1 + 2.5}s`;

        floatingContainer.appendChild(numberSpan);
    }

    setTimeout(() => {
        if (floatingContainer) {
            floatingContainer.remove();
        }
    }, 4000);
}

// --- Free Reward Functions ---

/**
 * Starts or updates the countdown for the free reward button.
 */
function startRewardCountdown() {
    stopRewardCountdown(); // Clear any existing interval

    const rewardButton = document.getElementById('free-reward-button');
    const countdownDisplay = document.getElementById('free-reward-countdown');

    if (!rewardButton || !countdownDisplay) return;

    const rewardConstants = firebaseService.getRewardConstants();
    const lastRewardTimestamp = rewardConstants.lastRewardTimestamp;
    const REWARD_COOLDOWN_MS = rewardConstants.REWARD_COOLDOWN_MS;

    function updateCountdown() {
        const now = Date.now();
        const nextRewardTime = lastRewardTimestamp + REWARD_COOLDOWN_MS;
        const timeLeft = nextRewardTime - now;

        if (timeLeft <= 0) {
            rewardButton.disabled = false;
            rewardButton.style.opacity = '1';
            rewardButton.textContent = 'Récompense Gratuite !';
            countdownDisplay.textContent = 'Disponible !';
            countdownDisplay.classList.add('available-text');
            countdownDisplay.classList.remove('countdown-text');
            rewardButton.style.display = 'block';
            countdownDisplay.style.display = 'block';
            stopRewardCountdown();
        } else {
            rewardButton.disabled = true;
            rewardButton.style.opacity = '0.6';
            rewardButton.textContent = 'Récompense Gratuite';
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            countdownDisplay.textContent = `Prochaine récompense dans: ${hours}h ${minutes}m ${seconds}s`;
            countdownDisplay.classList.remove('available-text');
            countdownDisplay.classList.add('countdown-text');
            rewardButton.style.display = 'block';
            countdownDisplay.style.display = 'block';
        }
    }

    updateCountdown();
    rewardCountdownInterval = setInterval(updateCountdown, 1000);
}

/**
 * Stops the reward countdown interval.
 */
function stopRewardCountdown() {
    if (rewardCountdownInterval) {
        clearInterval(rewardCountdownInterval);
        rewardCountdownInterval = null;
    }
}

/**
 * Initiates the collection of a free reward.
 */
async function collectFreeReward() {
    const rewardAmount = await firebaseService.collectFreeRewardFromService();

    if (rewardAmount > 0) {
        // Show floating numbers animation
        const gameContainer = document.getElementById('game-container');
        showFloatingWinNumbers(rewardAmount, gameContainer);

        const rewardButton = document.getElementById('free-reward-button');
        const countdownDisplay = document.getElementById('free-reward-countdown');
        if (rewardButton) {
            rewardButton.disabled = true;
            rewardButton.style.opacity = '0.6';
        }
        if (countdownDisplay) {
            countdownDisplay.textContent = `Vous avez reçu ${rewardAmount} € !`;
            countdownDisplay.classList.add('win-text');
            countdownDisplay.classList.remove('countdown-text', 'available-text');
        }

        setTimeout(() => {
            if (countdownDisplay) {
                countdownDisplay.classList.remove('win-text');
            }
            startRewardCountdown(); // Restart countdown after showing message
        }, 2000);
    } else {
        // If reward is 0, it means it's on cooldown
        console.log("GameLogic: Reward not available yet.");
        // The countdown will already be showing the correct time.
    }
}

/**
 * Applies active cosmetic classes to the body or relevant game elements.
 * @param {Object} activeCosmeticsObject - The object containing active cosmetic types and their values.
 */
function applyActiveCosmetics(activeCosmeticsObject) {
    // Clear all previously applied slot theme classes from the body
    document.body.className = document.body.className.split(' ').filter(c => !c.startsWith('slot-theme-')).join(' ');
    // Clear all previously applied slot symbol classes from the body
    document.body.className = document.body.className.split(' ').filter(c => !c.startsWith('slot-symbols-')).join(' ');
    // Clear all previously applied slot border classes from the body
    document.body.className = document.body.className.split(' ').filter(c => !c.startsWith('slot-border-')).join(' ');
    // Clear all previously applied slot win effect classes from the body
    document.body.className = document.body.className.split(' ').filter(c => !c.startsWith('slot-win-effect-')).join(' ');
    // Clear all previously applied slot spin effect classes from the body
    document.body.className = document.body.className.split(' ').filter(c => !c.startsWith('slot-spin-effect-')).join(' ');


    for (const type in activeCosmeticsObject) {
        const value = activeCosmeticsObject[type];
        if (type === 'slot_theme') {
            document.body.classList.add(`slot-theme-${value}`);
        } else if (type === 'slot_symbols') {
            document.body.classList.add(`slot-symbols-${value}`);
        } else if (type === 'slot_border') {
            document.body.classList.add(`slot-border-${value}`);
        } else if (type === 'slot_win_effect') {
            document.body.classList.add(`slot-win-effect-${value}`);
        } else if (type === 'slot_spin_effect') {
            document.body.classList.add(`slot-spin-effect-${value}`);
        }
    }
    console.log("GameLogic: Applied active cosmetics to body:", activeCosmeticsObject);
}


// Expose functions that need to be called by game-specific scripts (slotMachine.js, etc.)
// For instance, a game needs to call this when balance changes.
// It's better to use events or direct function calls from the game's logic.
window.updateBalanceDisplay = updateBalanceDisplay;
window.showFloatingWinNumbers = showFloatingWinNumbers;

// Expose game start functions to be called from HTML onclick attributes
window.startSlotMachine = startSlotMachine;
window.startBlackjack = startBlackjack;
window.startChickenGame = startChickenGame;
window.startShop = startShop; // Expose startShop
window.showMainMenu = showMainMenu; // Also expose showMainMenu for the "Retour au Menu" button
window.collectFreeReward = collectFreeReward; // Expose for the free reward button
