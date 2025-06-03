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

    const users = JSON.parse(localStorage.getItem('users')) || {};

    if (users[usernameInput] && users[usernameInput].password === passwordInput) {
        currentUsername = usernameInput;
        localStorage.setItem('loggedInUser', currentUsername);
        loadUserData(currentUsername);
        authMessage.textContent = "Connexion réussie !";
        authMessage.style.color = 'green';
        setTimeout(() => {
            document.getElementById('auth-container').style.display = 'none';
            document.getElementById('game-container').style.display = 'block';
            showMainMenu();
        }, 1000);
    } else {
        authMessage.textContent = "Nom d'utilisateur ou mot de passe incorrect.";
        authMessage.style.color = 'red';
    }
}

function handleRegister() {
    const usernameInput = document.getElementById('username-input').value;
    const passwordInput = document.getElementById('password-input').value;
    const authMessage = document.getElementById('auth-message');

    if (usernameInput.length < 3 || passwordInput.length < 3) {
        authMessage.textContent = "Nom d'utilisateur et mot de passe doivent avoir au moins 3 caractères.";
        authMessage.style.color = 'red';
        return;
    }

    let users = JSON.parse(localStorage.getItem('users')) || {};

    if (users[usernameInput]) {
        authMessage.textContent = "Ce nom d'utilisateur existe déjà.";
        authMessage.style.color = 'red';
    } else {
        users[usernameInput] = { password: passwordInput, balance: 1000 }; // Nouveau compte avec 1000€
        localStorage.setItem('users', JSON.stringify(users));
        authMessage.textContent = "Compte créé avec succès ! Vous pouvez maintenant vous connecter.";
        authMessage.style.color = 'green';
    }
}

function loadUserData(username) {
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (users[username]) {
        balance = users[username].balance;
    } else {
        // Ceci ne devrait pas arriver si checkUserLoggedIn fonctionne correctement
        balance = 1000; // Fallback
        users[username] = { password: '', balance: balance };
        localStorage.setItem('users', JSON.stringify(users));
    }
    updateBalanceDisplay();
}

function saveUserData() {
    if (currentUsername) {
        let users = JSON.parse(localStorage.getItem('users')) || {};
        if (users[currentUsername]) {
            users[currentUsername].balance = balance;
            localStorage.setItem('users', JSON.stringify(users));
        }
    }
}

function updateBalanceDisplay() {
    document.getElementById('current-balance').textContent = balance.toFixed(2);
    saveUserData(); // Sauvegarder le solde à chaque mise à jour
}

// --- Fonctions de Navigation et d'Affichage des Jeux ---

function showMainMenu() {
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <p>Solde : <span id="current-balance">${balance}</span> €</p>
        <div class="main-menu">
            <h1>Choisissez votre jeu</h1>
            <div class="game-buttons">
                <button class="game-button" onclick="startSlotMachine()">Machines à Sous</button>
                <button class="game-button" onclick="startBlackjack()">Blackjack</button>
                <button class="game-button" onclick="startMiniRoulette()">Mini Roulette</button>
                <button class="game-button" onclick="startChickenGame()">Jeu du Poulet</button>
            </div>
        </div>
        <button id="logout-button" class="game-button logout-button">Se déconnecter</button>
    `;
    document.getElementById('logout-button').addEventListener('click', handleLogout);
    updateBalanceDisplay(); // Ensure balance is updated on main menu display
    currentGame = null; // Reset current game
}

function handleLogout() {
    localStorage.removeItem('loggedInUser');
    currentUsername = null;
    balance = 0;
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('username-input').value = '';
    document.getElementById('password-input').value = '';
    document.getElementById('auth-message').textContent = 'Déconnecté.';
    document.getElementById('auth-message').style.color = '#e0f2f7';
}

// --- Fonctions utilitaires partagées ---

// Floating win numbers animation
function showFloatingWinNumbers(amount, parentElement) {
    const numNumbers = Math.min(5, Math.ceil(amount / 20)); // Max 5 numbers, more for larger wins
    const baseValue = Math.floor(amount / numNumbers);
    const remainingValue = amount % numNumbers;

    const containerToUse = parentElement || document.body; // Use parentElement or body as fallback

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
        // Clear numbers after animation. Consider if this should clear only the ones added by this call.
        // For simplicity, it clears all floating numbers within the container.
        Array.from(containerToUse.getElementsByClassName('floating-win-number')).forEach(el => el.remove());
    }, 2000); // Should match or exceed animation duration + delay
}