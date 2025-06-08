// gameLogic.js
// Ce fichier gère toutes les interactions de l'interface utilisateur et le déroulement du jeu,
// en interagissant avec firebaseService.js pour les opérations de données.

// Variables globales pour l'état du jeu et les éléments de l'interface utilisateur
let currentGame = null; // Stocke le jeu actuellement actif (par exemple, 'slotMachine', 'blackjack')
let progressiveJackpotInterval = null;
let rewardCountdownInterval = null;

// Nouveau formateur pour l'affichage de la monnaie avec le format français pour les séparateurs de milliers
const currencyFormatter = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

document.addEventListener('DOMContentLoaded', () => {
    setupAuthUIListeners(); // Configure les écouteurs pour l'interface utilisateur d'authentification
    setupGameMenuListeners(); // Configure les écouteurs pour la sélection du jeu

    // Configure les fonctions de rappel pour que Firebase Service notifie gameLogic
    firebaseService.setAuthStateChangedCallback(handleAuthStateChange);
    firebaseService.setUserDataLoadedCallback(handleUserDataLoaded);
    firebaseService.setBalanceUpdatedCallback(updateBalanceDisplay);
    firebaseService.setJackpotUpdatedCallback(updateProgressiveJackpotDisplay);
    firebaseService.setLeaderboardUpdatedCallback(updateLeaderboardDisplay);
    firebaseService.setRewardDataLoadedCallback(handleRewardDataLoaded);
    firebaseService.onUserCosmeticsUpdated(handleUserCosmeticsUpdated);
    firebaseService.onActiveCosmeticsUpdated(handleActiveCosmeticsUpdated);
    firebaseService.onAllCosmeticsLoaded(handleAllCosmeticsLoaded);
    firebaseService.onMaxBalanceUpdated(updateMaxBalanceDisplay); // Nouveau : appel de la fonction de mise à jour du solde max
    firebaseService.onJackpotWinsUpdated(updateJackpotWinsDisplay); // Nouveau : appel de la fonction de mise à jour des jackpots remportés
    firebaseService.onUserImagesUpdated(handleUserGeneratedImagesUpdated); // Nouveau : appel de la fonction pour les images générées

    setupPlayerSearchListeners(); // Configure les écouteurs pour la recherche de joueurs
    setupModalListeners(); // Configure les écouteurs pour la modale
});

/**
 * Gère les changements d'état d'authentification Firebase.
 * @param {firebase.User|null} user - L'objet utilisateur Firebase ou null si déconnecté.
 */
async function handleAuthStateChange(user) {
    const authContainer = document.getElementById('auth-container');
    const gameContainer = document.getElementById('game-container');

    if (user) {
        // Utilisateur connecté
        console.log("GameLogic: Utilisateur connecté, affichage du menu de jeu.");
        authContainer.style.display = 'none';
        gameContainer.style.display = 'block';
        displayGameSelectionMenu(); // Affiche le menu principal
        startJackpotIncrement(); // Démarre le compteur d'incrémentation du jackpot
        startRewardCountdown(); // Démarre le compte à rebours de la récompense
    } else {
        // Utilisateur déconnecté
        console.log("GameLogic: Utilisateur déconnecté, affichage de l'écran d'authentification.");
        authContainer.style.display = 'flex';
        gameContainer.style.display = 'none';

        // Réinitialise les formulaires d'authentification
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

        stopJackpotIncrement();
        stopRewardCountdown();
        updateProgressiveJackpotDisplay(0);
        const leaderboardContainer = document.getElementById('leaderboard-container');
        if (leaderboardContainer) {
            leaderboardContainer.style.display = 'none';
        }
        applyActiveCosmetics({});
    }
}

/**
 * Gère les données utilisateur chargées depuis Firebase Service.
 * @param {number} balance - Le solde utilisateur chargé.
 */
function handleUserDataLoaded(balance) {
    console.log("GameLogic: Données utilisateur chargées, mise à jour de l'affichage du solde :", balance);
    updateBalanceDisplay(balance);
    updateMaxBalanceDisplay(firebaseService.getUserMaxBalance());
    updateJackpotWinsDisplay(firebaseService.getUserJackpotWins());
    handleUserGeneratedImagesUpdated(firebaseService.getUserGeneratedImages());
}

/**
 * Gère les données de récompense chargées depuis Firebase Service.
 * @param {number} timestamp - L'horodatage de la dernière récompense.
 */
function handleRewardDataLoaded(timestamp) {
    console.log("GameLogic: Données de récompense chargées, démarrage du compte à rebours.");
    startRewardCountdown();
}

/**
 * Gère les données de cosmétiques utilisateur chargées ou mises à jour depuis Firebase Service.
 * @param {Array<string>} cosmetics - Le tableau des identifiants de cosmétiques possédés par l'utilisateur.
 */
function handleUserCosmeticsUpdated(cosmetics) {
    console.log("GameLogic: Cosmétiques utilisateur mis à jour :", cosmetics);
    if (currentGame === 'shop') {
        console.log("GameLogic: La boutique est active, réaffichage de la boutique après la mise à jour des cosmétiques utilisateur.");
        initShop(updateBalanceDisplay, showFloatingWinNumbers, currencyFormatter, firebaseService.getAllAvailableCosmetics());
    }
}

/**
 * Gère les données de cosmétiques actifs chargées ou mises à jour depuis Firebase Service.
 * @param {Object} activeCosmetics - L'objet des cosmétiques actuellement actifs.
 */
function handleActiveCosmeticsUpdated(activeCosmetics) {
    console.log("GameLogic: Cosmétiques actifs mis à jour :", activeCosmetics);
    applyActiveCosmetics(activeCosmetics);
    if (currentGame === 'shop') {
        console.log("GameLogic: La boutique est active, réaffichage de la boutique après la mise à jour des cosmétiques actifs.");
        initShop(updateBalanceDisplay, showFloatingWinNumbers, currencyFormatter, firebaseService.getAllAvailableCosmetics());
    } else if (currentGame === 'slot') {
        if (typeof updateSlotCosmeticVisuals === 'function') {
            updateSlotCosmeticVisuals(activeCosmetics);
        }
    }
}

/**
 * Gère toutes les données de cosmétiques disponibles chargées depuis Firebase Service.
 * C'est le point d'entrée principal pour l'affichage des articles de la boutique.
 * @param {Array<Object>} allCosmetics - Le tableau de tous les objets cosmétiques disponibles.
 */
function handleAllCosmeticsLoaded(allCosmetics) {
    console.log("GameLogic: Tous les cosmétiques disponibles chargés :", allCosmetics);
    if (currentGame === 'shop') {
        console.log("GameLogic: Le jeu actuel est la boutique, initialisation de la boutique avec tous les cosmétiques disponibles.");
        initShop(updateBalanceDisplay, showFloatingWinNumbers, currencyFormatter, allCosmetics);
    }
}

/**
 * Gère la mise à jour des images générées par l'utilisateur.
 * @param {Array<Object>} images - Le tableau des images générées par l'utilisateur.
 */
function handleUserGeneratedImagesUpdated(images) {
    console.log("GameLogic: Images générées par l'utilisateur mises à jour :", images);
    // Si la modale est ouverte et affiche les détails de l'utilisateur actuel, la rafraîchir.
    const modal = document.getElementById('player-details-modal');
    if (modal && modal.style.display === 'flex' && modal.querySelector('#modal-player-username').textContent === firebaseService.getCurrentUsername()) {
        showPlayerDetails(firebaseService.getCurrentUserId());
    }
}


// --- Logique de l'interface utilisateur d'authentification ---

/**
 * Configure les écouteurs pour les boutons liés à l'authentification.
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
 * Affiche le formulaire d'authentification spécifié.
 * @param {string} formType - 'login' ou 'register'.
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
 * Affiche les options d'authentification initiales (boutons de connexion/inscription).
 */
function showInitialAuthOptions() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('initial-auth-options').style.display = 'flex';
    document.getElementById('auth-prompt-message').textContent = "Veuillez choisir une option :";
    document.getElementById('auth-message').textContent = '';
}

/**
 * Gère la tentative de connexion de l'utilisateur.
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
 * Gère la tentative d'inscription d'un nouvel utilisateur.
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
        showAuthForm('login');
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
 * Gère la demande de réinitialisation de mot de passe.
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
 * Gère la déconnexion de l'utilisateur.
 */
async function logout() {
    await firebaseService.logoutUser();
}

// --- Logique du menu de jeu et de navigation ---

/**
 * Affiche le menu de sélection du jeu principal.
 * Cette fonction reconstruit le HTML pour le conteneur du jeu.
 */
function displayGameSelectionMenu() {
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <div class="main-menu">
            <h1>BIENVENUE AU JEWBUZZ CASINO !</h1>
            <p>Solde : <span id="current-balance">${currencyFormatter.format(firebaseService.getUserBalance())}</span> €</p>
            <p>Solde le plus haut : <span id="current-max-balance">${currencyFormatter.format(firebaseService.getUserMaxBalance())}</span> €</p>
            <p>Jackpots remportés : <span id="current-jackpot-wins">${firebaseService.getUserJackpotWins()}</span></p>

            <!-- Jackpot here -->
            <div id="progressive-jackpot-container">
                <p>JACKPOT : <span id="progressive-jackpot-display">${currencyFormatter.format(firebaseService.getProgressiveJackpot())}</span> €</p>
            </div>
            <h1>Choisissez votre jeu</h1>
            <div class="game-buttons">
                <button class="game-button" onclick="startSlotMachine()">Machines à Sous</button>
                <button class="game-button" onclick="startBlackjack()">Blackjack</button>
                <button class="game-button" onclick="startChickenGame()">Jeu du Poulet</button>
                <button class="game-button" onclick="startShop()">Boutique</button>
                <button id="free-reward-button" class="game-button free-reward-button">Récompense Gratuite</button>
            </div>
            <div id="free-reward-countdown" class="free-reward-countdown"></div>
        </div>

        <!-- Conteneur de recherche de joueur -->
        <div id="player-search-container">
            <input type="text" id="player-search-input" placeholder="Rechercher un joueur...">
            <button id="player-search-button" class="game-button">Rechercher</button>
            <div id="player-search-results"></div>
        </div>

        <!-- Conteneur du classement -->
        <div id="leaderboard-container">
            <h2>🏆 Classement 🏆</h2>
            <ol id="leaderboard-list"></ol>
        </div>
        <button id="logout-button" class="game-button logout-button">Se déconnecter</button>
        <!-- Conteneurs spécifiques au jeu, initialement cachés -->
        <div id="slot-machine-container" style="display:none;"></div>
        <div id="blackjack-container" style="display:none;"></div>
        <div id="chicken-game-container" style="display:none;"></div>
        <div id="shop-container" style="display:none;"></div> 

        <button id="back-to-menu" class="game-button" style="display:none; margin-top: 20px;" onclick="showMainMenu()">Retour au Menu</button>
    `;
    setupGameMenuListeners(); // Ré-attache les écouteurs après la recréation du HTML
    setupPlayerSearchListeners(); // Ré-attache les écouteurs de recherche
    updateBalanceDisplay(firebaseService.getUserBalance());
    updateMaxBalanceDisplay(firebaseService.getUserMaxBalance());
    updateJackpotWinsDisplay(firebaseService.getUserJackpotWins());
    updateProgressiveJackpotDisplay(firebaseService.getUserProgressiveJackpot());
    firebaseService.loadLeaderboard();
    console.log("GameLogic: HTML pour le menu principal ré-affiché. Élément d'affichage du jackpot (après rendu) :", document.getElementById('progressive-jackpot-display'));
}

/**
 * Affiche le menu principal et masque les conteneurs spécifiques au jeu.
 */
function showMainMenu() {
    document.getElementById('slot-machine-container').style.display = 'none';
    document.getElementById('blackjack-container').style.display = 'none';
    document.getElementById('chicken-game-container').style.display = 'none';
    document.getElementById('shop-container').style.display = 'none';

    document.querySelector('.main-menu').style.display = 'block';
    document.getElementById('progressive-jackpot-container').style.display = 'block';
    document.getElementById('leaderboard-container').style.display = 'block';
    document.getElementById('player-search-container').style.display = 'flex'; // Afficher le conteneur de recherche
    document.getElementById('logout-button').style.display = 'block';
    document.getElementById('free-reward-button').style.display = 'block';
    document.getElementById('free-reward-countdown').style.display = 'block';
    document.getElementById('back-to-menu').style.display = 'none';

    updateBalanceDisplay(firebaseService.getUserBalance());
    updateMaxBalanceDisplay(firebaseService.getUserMaxBalance());
    updateJackpotWinsDisplay(firebaseService.getUserJackpotWins());
    updateProgressiveJackpotDisplay(firebaseService.getProgressiveJackpot());
    startRewardCountdown();
    firebaseService.loadLeaderboard();
    
    currentGame = null; 
}


/**
 * Configure les écouteurs pour les boutons du menu de jeu.
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
                } else if (event.target.textContent.includes('Boutique')) {
                    startShop();
                } else if (event.target.id === 'free-reward-button') {
                    collectFreeReward();
                }
            }
        });
    }
}

/**
 * Masque tous les conteneurs spécifiques au jeu et les éléments du menu principal qui ne sont pas universellement présents.
 * Assure que seul le conteneur de jeu actif est visible.
 */
function hideAllGameContainersAndMenu() {
    const mainMenu = document.querySelector('.main-menu');
    if (mainMenu) mainMenu.style.display = 'none';
    
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) logoutButton.style.display = 'none';

    const jackpotContainer = document.getElementById('progressive-jackpot-container');
    if (jackpotContainer) jackpotContainer.style.display = 'none';
    const leaderboardContainer = document.getElementById('leaderboard-container');
    if (leaderboardContainer) leaderboardContainer.style.display = 'none';
    const playerSearchContainer = document.getElementById('player-search-container'); // Masquer le conteneur de recherche
    if (playerSearchContainer) playerSearchContainer.style.display = 'none';
    const freeRewardButton = document.getElementById('free-reward-button');
    if (freeRewardButton) freeRewardButton.style.display = 'none';
    const freeRewardCountdown = document.getElementById('free-reward-countdown');
    if (freeRewardCountdown) freeRewardCountdown.style.display = 'none';
    
    const slotContainer = document.getElementById('slot-machine-container');
    if (slotContainer) slotContainer.style.display = 'none';
    const blackjackContainer = document.getElementById('blackjack-container');
    if (blackjackContainer) blackjackContainer.style.display = 'none';
    const chickenContainer = document.getElementById('chicken-game-container');
    if (chickenContainer) chickenContainer.style.display = 'none';
    const shopContainer = document.getElementById('shop-container'); 
    if (shopContainer) shopContainer.style.display = 'none';

    stopRewardCountdown();
}


// Fonctions pour démarrer des jeux spécifiques (ceux-ci déclencheraient généralement une logique spécifique au jeu)
function startSlotMachine() {
    currentGame = 'slot';
    hideAllGameContainersAndMenu();
    
    const slotContainer = document.getElementById('slot-machine-container');
    if (!slotContainer.innerHTML.trim()) {
        slotContainer.innerHTML = `
            <h2>✦ MACHINE À SOUS ✦</h2>
            <p>Solde : <span id="current-balance">${currencyFormatter.format(firebaseService.getUserBalance())}</span> €</p>
            <div id="slots-grid">
            </div>
            <p id="gain-text">Gain : 0 €</p>
            <p>Tours Gratuits : <span id="free-spins-display">0</span></p>

            <div class="bet-controls">
                <label for="bet-select">Mise :</label>
                <select id="bet-select">
                </select>
            </div>
            <br/>
            <button id="spin-button" class="game-button">Lancer</button>
            <button id="auto-spin-button" class="game-button">Auto Spin</button>
            <div id="auto-spin-remaining-display" style="font-size: 0.8em; margin-top: 5px; color: #ccc;"></div>
            <button id="back-to-menu-slot" class="game-button" style="margin-top: 20px;">Retour au Menu</button>
        `;
        initSlotMachine(); 
        document.getElementById('back-to-menu-slot').addEventListener('click', showMainMenu);
    }
    slotContainer.style.display = 'block';
    updateBalanceDisplay(firebaseService.getUserBalance());
}

function startBlackjack() {
    currentGame = 'blackjack';
    hideAllGameContainersAndMenu();

    const blackjackContainer = document.getElementById('blackjack-container');
    // Always re-render Blackjack HTML to ensure event listeners are correctly attached
    // and initial state is clean for every new game entry.
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
    
    blackjackContainer.style.display = 'block';
    updateBalanceDisplay(firebaseService.getUserBalance());
    console.log("GameLogic: Conteneur Blackjack affiché et initBlackjack() appelé.");
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
 * Démarre l'interface de la boutique.
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
                <p>Chargement des articles de la boutique...</p>
            </div>
            <button id="back-to-menu-shop" class="game-button" style="margin-top: 20px;">Retour au Menu</button>
        `;
        initShop(updateBalanceDisplay, showFloatingWinNumbers, currencyFormatter, firebaseService.getAllAvailableCosmetics()); 
        document.getElementById('back-to-menu-shop').addEventListener('click', showMainMenu);
    }
    shopContainer.style.display = 'flex';
    updateBalanceDisplay(firebaseService.getUserBalance());
}

// --- Fonctions de mise à jour de l'interface utilisateur du solde et du jackpot ---

/**
 * Met à jour le solde utilisateur affiché.
 * @param {number} newBalance - Le nouveau solde à afficher.
 */
function updateBalanceDisplay(newBalance) {
    const balanceToDisplay = newBalance !== undefined ? newBalance : firebaseService.getUserBalance();
    const balanceElements = document.querySelectorAll('#current-balance');
    balanceElements.forEach(element => {
        element.textContent = currencyFormatter.format(balanceToDisplay);
    });
}

/**
 * Met à jour le solde le plus élevé affiché.
 * @param {number} newMaxBalance - Le nouveau solde le plus élevé à afficher.
 */
function updateMaxBalanceDisplay(newMaxBalance) {
    const maxBalanceToDisplay = newMaxBalance !== undefined ? newMaxBalance : firebaseService.getUserMaxBalance();
    const maxBalanceElement = document.getElementById('current-max-balance');
    if (maxBalanceElement) {
        maxBalanceElement.textContent = currencyFormatter.format(maxBalanceToDisplay);
    }
}

/**
 * Met à jour le nombre de jackpots remportés affiché.
 * @param {number} newJackpotWins - Le nouveau nombre de jackpots remportés à afficher.
 */
function updateJackpotWinsDisplay(newJackpotWins) {
    const jackpotWinsToDisplay = newJackpotWins !== undefined ? newJackpotWins : firebaseService.getUserJackpotWins();
    const jackpotWinsElement = document.getElementById('current-jackpot-wins');
    if (jackpotWinsElement) {
        jackpotWinsElement.textContent = jackpotWinsToDisplay;
    }
}

/**
 * Met à jour le jackpot progressif affiché.
 * @param {number} newJackpot - Le nouveau montant du jackpot à afficher.
 */
function updateProgressiveJackpotDisplay(newJackpot) {
    const jackpotDisplayElement = document.getElementById('progressive-jackpot-display');
    const jackpotContainer = document.getElementById('progressive-jackpot-container');
    
    console.log("GameLogic: Mise à jour de l'affichage du jackpot. Nouveau jackpot :", newJackpot, "Élément trouvé :", !!jackpotDisplayElement);

    if (jackpotDisplayElement) {
        jackpotDisplayElement.textContent = currencyFormatter.format(newJackpot);
    } else {
        console.warn("GameLogic: Élément d'affichage du jackpot non trouvé (progressive-jackpot-display). Ceci est normal si vous n'êtes pas dans le menu principal ou les vues de jeu où il est affiché.");
    }

    const isMainMenu = document.querySelector('.main-menu') && document.querySelector('.main-menu').style.display !== 'none';
    if (jackpotContainer) {
        jackpotContainer.style.display = (firebaseService.getCurrentUserId() && isMainMenu) ? 'flex' : 'none';
        console.log("GameLogic: Style d'affichage du conteneur de jackpot défini sur :", jackpotContainer.style.display);
    } else {
        console.warn("GameLogic: Élément conteneur du jackpot non trouvé (progressive-jackpot-container). Ceci est normal si vous n'êtes pas dans le menu principal ou les vues de jeu où il est affiché).");
    }
}

/**
 * Démarre l'intervalle pour l'incrémentation du jackpot progressif.
 */
function startJackpotIncrement() {
    if (progressiveJackpotInterval) {
        clearInterval(progressiveJackpotInterval);
    }
    progressiveJackpotInterval = setInterval(async () => {
        const incrementAmount = firebaseService.getRewardConstants().JACKPOT_INCREMENT_PER_SECOND || 2;
        firebaseService.incrementProgressiveJackpot(incrementAmount);
        updateProgressiveJackpotDisplay(firebaseService.getProgressiveJackpot());
        if (Date.now() % 10000 < 1000) {
            await firebaseService.saveProgressiveJackpot(firebaseService.getProgressiveJackpot());
        }
    }, 1000);
}

/**
 * Arrête l'intervalle d'incrémentation du jackpot.
 */
function stopJackpotIncrement() {
    if (progressiveJackpotInterval) {
        clearInterval(progressiveJackpotInterval);
        progressiveJackpotInterval = null;
    }
}

// --- Fonctions de mise à jour de l'interface utilisateur du classement ---

/**
 * Met à jour le classement affiché.
 * @param {Array<Object>} leaderboardData - Un tableau d'objets utilisateur ({username, balance}).
 */
function updateLeaderboardDisplay(leaderboardData) {
    console.log("GameLogic: updateLeaderboardDisplay appelé avec les données :", leaderboardData);
    const leaderboardList = document.getElementById('leaderboard-list');
    const leaderboardContainer = document.getElementById('leaderboard-container');

    const isMainMenu = document.querySelector('.main-menu') && document.querySelector('.main-menu').style.display !== 'none';
    if (!firebaseService.getCurrentUserId() || !isMainMenu) {
        console.log("GameLogic: Classement non affiché (utilisateur non connecté ou pas dans le menu principal).");
        if (leaderboardContainer) leaderboardContainer.style.display = 'none';
        return;
    } else {
        console.log("GameLogic: Affichage du classement car l'utilisateur est connecté et dans le menu principal.");
        if (leaderboardContainer) leaderboardContainer.style.display = 'flex';
    }

    if (leaderboardList) {
        leaderboardList.innerHTML = '';

        const sortedLeaderboardData = [...leaderboardData].sort((a, b) => b.balance - a.balance);
        console.log("GameLogic: Données du classement triées :", sortedLeaderboardData);

        if (sortedLeaderboardData.length === 0) {
            leaderboardList.innerHTML = `
                <li class="loss-text" style="text-align: center; justify-content: center;">
                    Aucun joueur à afficher dans le classement.
                    <br>Assurez-vous que vos règles Firestore autorisent la lecture de la collection 'users'
                    et qu'il y a des utilisateurs avec un solde.
                </li>
            `;
            console.log("GameLogic: Message de classement vide affiché.");
            return;
        }

        sortedLeaderboardData.forEach((userData, index) => {
            const listItem = document.createElement('li');
            const usernameSpan = document.createElement('span'); // Create span for username
            usernameSpan.classList.add('leaderboard-username');
            usernameSpan.dataset.userId = userData.userId;
            usernameSpan.style.cursor = 'pointer';
            usernameSpan.style.textDecoration = 'underline';
            usernameSpan.textContent = userData.username;

            usernameSpan.addEventListener('click', async () => {
                await showPlayerDetails(userData.userId);
            });

            listItem.innerHTML = `
                <span class="leaderboard-rank">${index + 1}.</span>
                <span class="leaderboard-balance">${currencyFormatter.format(userData.balance)} €</span>
            `;
            listItem.insertBefore(usernameSpan, listItem.children[1]); // Insert username span before balance span
            leaderboardList.appendChild(listItem);
        });
        console.log("GameLogic: Interface utilisateur du classement mise à jour avec les données triées.");
    } else {
        console.warn("GameLogic: Élément de la liste du classement non trouvé.");
    }
}

// --- Animation des nombres flottants de gain ---

/**
 * Affiche des nombres flottants animés pour les montants de gain/perte.
 * @param {number} amount - Le montant à afficher (positif pour gain, négatif pour perte).
 * @param {HTMLElement} parentElement - L'élément parent auquel attacher les nombres flottants.
 */
function showFloatingWinNumbers(amount, parentElement) {
    if (!parentElement) {
        console.error(`showFloatingWinNumbers: parentElement est null ou indéfini.`);
        return;
    }

    const isWin = amount >= 0;
    const displayAmount = isWin ? `+${currencyFormatter.format(amount)}€` : `${currencyFormatter.format(amount)}€`;
    const color = isWin ? 'hsl(150, 100%, 70%)' : 'hsl(0, 100%, 70%)';

    const numberOfSpans = Math.min(10, Math.ceil(Math.abs(amount) / (isWin ? 15 : 50)));

    let floatingContainer = parentElement.querySelector('.floating-win-number-container');
    if (!floatingContainer) {
        floatingContainer = document.createElement('div');
        floatingContainer.classList.add('floating-win-number-container');
        parentElement.appendChild(floatingContainer);
    } else {
        floatingContainer.innerHTML = '';
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

        numberSpan.textContent = displayAmount;

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

// --- Fonctions de récompense gratuite ---

/**
 * Démarre ou met à jour le compte à rebours pour le bouton de récompense gratuite.
 */
function startRewardCountdown() {
    stopRewardCountdown();

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
 * Arrête l'intervalle du compte à rebours de la récompense.
 */
function stopRewardCountdown() {
    if (rewardCountdownInterval) {
        clearInterval(rewardCountdownInterval);
        rewardCountdownInterval = null;
    }
}

/**
 * Lance la collecte d'une récompense gratuite.
 */
async function collectFreeReward() {
    const rewardAmount = await firebaseService.collectFreeRewardFromService();

    if (rewardAmount > 0) {
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
            startRewardCountdown();
        }, 2000);
    } else {
        console.log("GameLogic: Récompense non disponible pour le moment.");
    }
}

/**
 * Applique les classes de cosmétiques actifs au corps ou aux éléments de jeu pertinents.
 * @param {Object} activeCosmeticsObject - L'objet contenant les types de cosmétiques actifs et leurs valeurs.
 */
function applyActiveCosmetics(activeCosmeticsObject) {
    document.body.className = document.body.className.split(' ').filter(c => !c.startsWith('slot-theme-')).join(' ');
    document.body.className = document.body.className.split(' ').filter(c => !c.startsWith('slot-symbols-')).join(' ');
    document.body.className = document.body.className.split(' ').filter(c => !c.startsWith('slot-border-')).join(' ');
    document.body.className = document.body.className.split(' ').filter(c => !c.startsWith('slot-win-effect-')).join(' ');
    document.body.className = document.body.className.split(' ').filter(c => !c.startsWith('slot-spin-effect-')).join(' ');


    for (const type in activeCosmeticsObject) {
        const value = activeCosmeticsObject[type];
        // Ensure that `value` is not an accumulated drop rate bonus for slot symbols,
        // but rather the actual class name to be applied.
        // For visual cosmetics, activeCosmeticsObject[type] will contain the class name (e.g., 'gold_theme_class').
        // For drop rate modifiers, it contains the accumulated numerical bonus, which shouldn't be added as a class.
        // We'll rely on the `allAvailableCosmetics` to determine if it's a visual effect.
        const cosmeticDetails = firebaseService.getAllAvailableCosmetics().find(c => c.id === type || c.value === value);

        if (cosmeticDetails && cosmeticDetails.type === 'slot_theme') {
            document.body.classList.add(`slot-theme-${value}`);
        } else if (cosmeticDetails && cosmeticDetails.type === 'slot_symbols') {
            document.body.classList.add(`slot-symbols-${value}`);
        } else if (cosmeticDetails && cosmeticDetails.type === 'slot_border') {
            document.body.classList.add(`slot-border-${value}`);
        } else if (cosmeticDetails && cosmeticDetails.type === 'slot_win_effect') {
            document.body.classList.add(`slot-win-effect-${value}`);
        } else if (cosmeticDetails && cosmeticDetails.type === 'slot_spin_effect') {
            document.body.classList.add(`slot-spin-effect-${value}`);
        }
    }
    console.log("GameLogic: Cosmétiques actifs appliqués au corps :", activeCosmeticsObject);
}


// --- Fonctions de recherche de joueur et de pop-up ---

/**
 * Configure les écouteurs pour la recherche de joueurs.
 */
function setupPlayerSearchListeners() {
    const searchInput = document.getElementById('player-search-input');
    const searchButton = document.getElementById('player-search-button');
    const searchResultsContainer = document.getElementById('player-search-results');
    const modal = document.getElementById('player-details-modal');

    if (searchButton) {
        searchButton.addEventListener('click', handlePlayerSearch);
    }
    if (searchInput) {
        // Trigger search on Enter key press
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handlePlayerSearch();
            }
        });
        // Clear results when input is cleared
        searchInput.addEventListener('input', () => {
            if (searchInput.value.trim() === '') {
                searchResultsContainer.innerHTML = '';
            }
        });
    }
    if (searchResultsContainer) {
        searchResultsContainer.addEventListener('click', async (event) => {
            const target = event.target;
            if (target.classList.contains('player-search-item')) {
                const userId = target.dataset.userId;
                if (userId) {
                    await showPlayerDetails(userId);
                }
            }
        });
    }
}

/**
 * Gère la recherche de joueurs et affiche les résultats.
 */
async function handlePlayerSearch() {
    const searchInput = document.getElementById('player-search-input');
    const searchResultsContainer = document.getElementById('player-search-results');
    const query = searchInput.value.trim();

    searchResultsContainer.innerHTML = ''; // Effacer les résultats précédents

    if (query.length < 3) { // Exiger au moins 3 caractères pour la recherche
        searchResultsContainer.innerHTML = '<p class="loss-text" style="text-align: center;">Veuillez entrer au moins 3 caractères.</p>';
        return;
    }

    try {
        const users = await firebaseService.searchUsersByUsername(query);
        if (users.length === 0) {
            searchResultsContainer.innerHTML = '<p class="loss-text" style="text-align: center;">Aucun joueur trouvé.</p>';
        } else {
            users.forEach(user => {
                const div = document.createElement('div');
                div.classList.add('player-search-item');
                div.dataset.userId = user.userId;
                div.textContent = user.username;
                searchResultsContainer.appendChild(div);
            });
        }
    } catch (error) {
        console.error("GameLogic: Erreur lors de la recherche de joueurs :", error);
        searchResultsContainer.innerHTML = '<p class="loss-text" style="text-align: center;">Erreur lors de la recherche.</p>';
    }
}

/**
 * Affiche les détails d'un joueur dans une modale.
 * @param {string} userId - L'ID de l'utilisateur dont les détails doivent être affichés.
 */
async function showPlayerDetails(userId) {
    const modal = document.getElementById('player-details-modal');
    const usernameElement = document.getElementById('modal-player-username');
    const balanceElement = document.getElementById('modal-player-balance');
    const maxBalanceElement = document.getElementById('modal-player-max-balance');
    const jackpotWinsElement = document.getElementById('modal-player-jackpot-wins');
    const generatedImagesSection = document.getElementById('modal-player-generated-images-section'); // Nouveau: section pour les images générées
    const generatedImagesGrid = document.getElementById('modal-player-generated-images-grid'); // Nouveau: grille pour les images générées

    // Effacer les contenus précédents
    usernameElement.textContent = '';
    balanceElement.textContent = 'Chargement...';
    maxBalanceElement.textContent = 'Chargement...';
    jackpotWinsElement.textContent = 'Chargement...';
    if (generatedImagesGrid) generatedImagesGrid.innerHTML = 'Chargement...'; // Nouveau: effacer
    if (generatedImagesSection) generatedImagesSection.style.display = 'none'; // Nouveau: masquer la section par défaut

    modal.style.display = 'flex'; // Afficher la modale

    try {
        const playerDetails = await firebaseService.getUserDetails(userId);

        if (playerDetails) {
            usernameElement.textContent = playerDetails.username;
            balanceElement.textContent = currencyFormatter.format(playerDetails.balance);
            maxBalanceElement.textContent = currencyFormatter.format(playerDetails.maxBalance);
            jackpotWinsElement.textContent = playerDetails.jackpotWins;

            // Nouveau: Afficher les images générées par l'utilisateur
            if (generatedImagesSection && generatedImagesGrid) {
                generatedImagesGrid.innerHTML = ''; // Effacer les images précédentes
                if (playerDetails.generatedImages && playerDetails.generatedImages.length > 0) {
                    playerDetails.generatedImages.forEach(image => {
                        const imgElement = document.createElement('img');
                        imgElement.src = image.url;
                        imgElement.alt = image.name;
                        imgElement.classList.add('modal-trophy-image'); // Applique une classe pour le style
                        generatedImagesGrid.appendChild(imgElement);
                    });
                    generatedImagesSection.style.display = 'block'; // Afficher la section si des images existent
                } else {
                    generatedImagesSection.style.display = 'none'; // Masquer la section si aucune image
                }
            }

        } else {
            usernameElement.textContent = 'Joueur non trouvé';
            balanceElement.textContent = 'N/A';
            maxBalanceElement.textContent = 'N/A';
            jackpotWinsElement.textContent = 'N/A';
            if (generatedImagesGrid) generatedImagesGrid.innerHTML = '';
            if (generatedImagesSection) generatedImagesSection.style.display = 'none';
        }
    } catch (error) {
        console.error("GameLogic: Erreur lors de l'affichage des détails du joueur :", error);
        usernameElement.textContent = 'Erreur';
        balanceElement.textContent = 'N/A';
        maxBalanceElement.textContent = 'N/A';
        jackpotWinsElement.textContent = 'N/A';
        if (generatedImagesGrid) generatedImagesGrid.innerHTML = '';
        if (generatedImagesSection) generatedImagesSection.style.display = 'none';
    }
}

/**
 * Configure les écouteurs pour la modale.
 */
function setupModalListeners() {
    const modal = document.getElementById('player-details-modal');
    const closeButton = modal.querySelector('.close-button');

    if (closeButton) {
        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Fermer la modale si l'utilisateur clique en dehors de la zone de contenu
    if (modal) {
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}


// Expose les fonctions qui doivent être appelées par des scripts spécifiques au jeu (slotMachine.js, etc.)
window.updateBalanceDisplay = updateBalanceDisplay;
window.showFloatingWinNumbers = showFloatingWinNumbers;
window.incrementUserJackpotWins = firebaseService.incrementUserJackpotWins; // Expose la fonction d'incrémentation du jackpot

// Expose les fonctions de démarrage du jeu à appeler depuis les attributs onclick HTML
window.startSlotMachine = startSlotMachine;
window.startBlackjack = startBlackjack;
window.startChickenGame = startChickenGame;
window.startShop = startShop;
window.showMainMenu = showMainMenu;
window.collectFreeReward = collectFreeReward;

