// main.js

// Variables globales partagées
let balance = 0; // Le solde sera chargé depuis le localStorage
let currentGame = null; // Suivre le jeu actuel
let currentUsername = null; // Pour stocker l'utilisateur actuellement connecté

// --- Fonctions d'Authentification ---

document.addEventListener('DOMContentLoaded', () => {
    setupAuthListeners();
    checkUserLoggedIn(); // Vérifier si un utilisateur est déjà connecté au chargement
});

function setupAuthListeners() {
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');

    if (loginButton) loginButton.addEventListener('click', handleLogin);
    if (registerButton) registerButton.addEventListener('click', handleRegister);
}

function checkUserLoggedIn() {
    currentUsername = localStorage.getItem('loggedInUser');
    if (currentUsername) {
        // Si un utilisateur est déjà connecté, charger son solde et afficher le menu principal
        loadUserData(currentUsername);
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        showMainMenu();
    } else {
        // Sinon, afficher le formulaire de connexion
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('game-container').style.display = 'none';
    }
}

function handleLogin() {
    const usernameInput = document.getElementById('username-input').value;
    const passwordInput = document.getElementById('password-input').value;
    const authMessage = document.getElementById('auth-message');

    authMessage.classList.remove('error-text', 'success-message');

    if (!usernameInput || !passwordInput) {
        authMessage.textContent = "Veuillez remplir tous les champs.";
        authMessage.classList.add('error-text');
        return;
    }

    const userData = JSON.parse(localStorage.getItem(usernameInput));

    if (userData && userData.password === passwordInput) {
        // Connexion réussie
        currentUsername = usernameInput;
        localStorage.setItem('loggedInUser', currentUsername); // Marquer l'utilisateur comme connecté
        loadUserData(currentUsername);
        authMessage.textContent = "Connexion réussie !";
        authMessage.classList.add('success-message');

        setTimeout(() => {
            document.getElementById('auth-container').style.display = 'none';
            document.getElementById('game-container').style.display = 'block';
            showMainMenu();
        }, 1000);

    } else {
        authMessage.textContent = "Nom d'utilisateur ou mot de passe incorrect.";
        authMessage.classList.add('error-text');
    }
}

function handleRegister() {
    const usernameInput = document.getElementById('username-input').value;
    const passwordInput = document.getElementById('password-input').value;
    const authMessage = document.getElementById('auth-message');

    authMessage.classList.remove('error-text', 'success-message');

    if (!usernameInput || !passwordInput) {
        authMessage.textContent = "Veuillez remplir tous les champs.";
        authMessage.classList.add('error-text');
        return;
    }

    if (localStorage.getItem(usernameInput)) {
        authMessage.textContent = "Ce nom d'utilisateur existe déjà.";
        authMessage.classList.add('error-text');
        return;
    }

    // Créer un nouveau compte avec un solde de départ
    const initialBalance = 1000;
    const userData = {
        password: passwordInput, // WARNING: Not hashed/salted, insecure for production
        balance: initialBalance
    };
    localStorage.setItem(usernameInput, JSON.stringify(userData));

    authMessage.textContent = `Compte "${usernameInput}" créé avec ${initialBalance} € ! Veuillez vous connecter.`;
    authMessage.classList.add('success-message');

    // Nettoyer les champs après l'inscription
    document.getElementById('username-input').value = '';
    document.getElementById('password-input').value = '';
}

function loadUserData(username) {
    const userData = JSON.parse(localStorage.getItem(username));
    if (userData) {
        balance = userData.balance;
    } else {
        // Ceci ne devrait pas arriver si l'utilisateur est "loggedInUser"
        // Mais par sécurité, on peut réinitialiser ou rediriger
        console.error("Erreur: Données utilisateur non trouvées pour " + username);
        balance = 1000; // Fallback
    }
    updateBalanceDisplay();
}

function saveUserData() {
    if (currentUsername) {
        const userData = JSON.parse(localStorage.getItem(currentUsername));
        if (userData) {
            userData.balance = balance;
            localStorage.setItem(currentUsername, JSON.stringify(userData));
        }
    }
}

// Fonction de déconnexion
function logout() {
    localStorage.removeItem('loggedInUser'); // Supprimer l'indicateur de connexion
    currentUsername = null;
    balance = 0; // Réinitialiser le solde
    updateBalanceDisplay();

    document.getElementById('game-container').innerHTML = ''; // Nettoyer le contenu du jeu
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('auth-message').textContent = "Vous avez été déconnecté.";
    document.getElementById('auth-message').classList.remove('error-text', 'success-message'); // Clear previous status
    document.getElementById('auth-message').classList.add('success-message');
}


// --- Fonctions de Jeu (modifiées pour utiliser saveUserData) ---

// Fonction pour générer le HTML des chiffres 0-9 pour chaque slot (utilisé par la machine à sous)
function generateSlotNumbersHTML() {
    let numbersHTML = '';
    for (let i = 0; i < 10; i++) {
        numbersHTML += `<span>${i}</span>`;
    }
    return numbersHTML;
}

// Fonction pour afficher le menu principal
function showMainMenu() {
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <h2>Choisissez un jeu</h2>
        <button onclick="startSlotMachine()">Machine à Sous</button>
        <button onclick="startBlackjack()">Blackjack</button>
        <button onclick="startMiniRoulette()">Roulette Américaine</button>
        <button onclick="startChickenGame()">Jeu du Poulet</button>
        <p>Solde actuel : <span id="current-balance">${balance}</span> €</p>
        <button onclick="logout()" class="back-button" style="margin-top: 20px;">Déconnexion</button>
    `;
    updateBalanceDisplay(); // Met à jour l'affichage du solde
}

// Aide pour mettre à jour l'affichage du solde
function updateBalanceDisplay() {
    const balanceSpan = document.getElementById('current-balance');
    if (balanceSpan) {
        balanceSpan.textContent = balance.toFixed(2); // Afficher avec 2 décimales
    }
    saveUserData(); // Sauvegarder le solde à chaque mise à jour
}

// Fonction d'aide pour afficher les gains flottants
function showFloatingWinNumbers(amount, parentElement) {
    if (amount <= 0) return;

    const floatingContainer = document.querySelector('.floating-win-number-container');
    if (!floatingContainer) {
        const newContainer = document.createElement('div');
        newContainer.classList.add('floating-win-number-container');
        parentElement.style.position = 'relative'; // Ensure parent is positioned
        parentElement.appendChild(newContainer);
        // Place the container on top of existing content
        newContainer.style.position = 'absolute';
        newContainer.style.top = '0';
        newContainer.style.left = '0';
        newContainer.style.width = '100%';
        newContainer.style.height = '100%';
        newContainer.style.pointerEvents = 'none'; // Allow clicks on elements beneath
        newContainer.style.zIndex = '100'; // Ensure it's above game elements
    }

    const containerToUse = floatingContainer || parentElement.querySelector('.floating-win-number-container');

    const numNumbers = Math.min(Math.ceil(amount / 50), 5); // Max 5 numbers for large wins
    const baseValue = Math.floor(amount / numNumbers);
    const remainingValue = amount % numNumbers;

    for (let i = 0; i < numNumbers; i++) {
        const numberSpan = document.createElement('span');
        numberSpan.classList.add('floating-win-number');

        let value = baseValue;
        if (i < remainingValue) { // Distribute remainder
            value++;
        }
        numberSpan.textContent = `+${value.toFixed(2)}€`;

        // Random starting position within the parent element
        const startX = Math.random() * (parentElement.offsetWidth * 0.6) + (parentElement.offsetWidth * 0.2);
        const startY = Math.random() * (parentElement.offsetHeight * 0.6) + (parentElement.offsetHeight * 0.2);
        const endOffsetX = (Math.random() - 0.5) * 100; // Float slightly left or right

        numberSpan.style.setProperty('--start-x', `${startX}px`);
        numberSpan.style.setProperty('--start-y', `${startY}px`);
        numberSpan.style.setProperty('--end-offset-x', `${endOffsetX}px`);
        numberSpan.style.animationDelay = `${Math.random() * 0.2}s`; // Stagger animation start
        numberSpan.style.animationDuration = `${Math.random() * 0.8 + 1.5}s`; // Vary duration

        containerToUse.appendChild(numberSpan);
    }

    setTimeout(() => {
        containerToUse.innerHTML = ''; // Clear numbers after animation
    }, 2500); // Should be slightly longer than animation duration
}

// Initialisation au chargement de la page (peut être supprimé car remplacé par DOMContentLoaded listener)
// showMainMenu();