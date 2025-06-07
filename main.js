let currentGame = null;
let currentUserId = null; // To store the Firebase User ID (UID)
let balance = 0; // Initial balance for new users
let progressiveJackpot = 10000; // Initial value of the progressive jackpot
const JACKPOT_INCREMENT_PER_SECOND = 0.5; // Jackpot increment per second

// New formatter for currency display with French locale for thousands separator
// A new instance is created here, but could also be created inside the functions
// if different options were needed for different displays.
const currencyFormatter = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

// Reward variables
let lastRewardTimestamp = 0; // Timestamp of the last collected reward
const REWARD_COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
const MIN_REWARD = 500;
const MAX_REWARD = 3000;
let rewardCountdownInterval = null;


document.addEventListener('DOMContentLoaded', () => {
    setupAuthListeners();

    auth.onAuthStateChanged(async user => { // Added 'async' here
        if (user) {
            currentUserId = user.uid;
            console.log("User connected:", user.email, "UID:", user.uid);
            
            // Wait for user data to load before displaying the menu
            await loadUserData(user.uid); 
            await loadProgressiveJackpot(); // Load the progressive jackpot
            await loadLeaderboard(); // Load the leaderboard when user logs in

            document.getElementById('auth-container').style.display = 'none';
            document.getElementById('game-container').style.display = 'block';
            displayGameSelectionMenu(); // Display the menu only after data is loaded
            await loadRewardData(); // Load reward data after user is logged in
            startRewardCountdown(); // Start the reward countdown
        } else {
            currentUserId = null;
            console.log("User disconnected");
            document.getElementById('auth-container').style.display = 'flex';
            document.getElementById('game-container').style.display = 'none';
            
            // Hide forms and show initial options
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('register-form').style.display = 'none';
            document.getElementById('initial-auth-options').style.display = 'flex';
            document.getElementById('auth-prompt-message').textContent = "Please choose an option:";


            const emailInput = document.getElementById('email-input');
            const passwordInput = document.getElementById('password-input');
            const registerEmailInput = document.getElementById('register-email-input');
            const registerPasswordInput = document.getElementById('register-password-input');
            const usernameInput = document.getElementById('username-input');

            if (emailInput) emailInput.value = '';
            if (passwordInput) passwordInput.value = '';
            if (registerEmailInput) registerEmailInput.value = '';
            if (registerPasswordInput) registerPasswordInput.value = '';
            if (usernameInput) usernameInput.value = '';

            const authMessage = document.getElementById('auth-message');
            if (authMessage) {
                authMessage.textContent = '';
                authMessage.classList.remove('win-text', 'loss-text');
            }
            updateProgressiveJackpotDisplay(); // Hide or reset jackpot display
            // Also hide leaderboard when logged out
            const leaderboardContainer = document.getElementById('leaderboard-container');
            if (leaderboardContainer) {
                leaderboardContainer.style.display = 'none';
            }
            stopRewardCountdown(); // Stop reward countdown on logout
        }
    });
});


function setupAuthListeners() {
    const showLoginFormButton = document.getElementById('show-login-form');
    const showRegisterFormButton = document.getElementById('show-register-form');
    const loginButton = document.getElementById('login-button');
    const createAccountButton = document.getElementById('create-account-button');
    const forgotPasswordButton = document.getElementById('forgot-password-button');
    const backToAuthOptionsButtonLogin = document.getElementById('back-to-auth-options');
    const backToAuthOptionsButtonRegister = document.getElementById('back-to-auth-options-register');

    if (showLoginFormButton) showLoginFormButton.addEventListener('click', () => showAuthForm('login'));
    if (showRegisterFormButton) showRegisterFormButton.addEventListener('click', () => showAuthForm('register'));
    if (loginButton) loginButton.addEventListener('click', handleLogin);
    if (createAccountButton) createAccountButton.addEventListener('click', handleRegister);
    if (forgotPasswordButton) forgotPasswordButton.addEventListener('click', handleForgotPassword);
    if (backToAuthOptionsButtonLogin) backToAuthOptionsButtonLogin.addEventListener('click', showInitialAuthOptions);
    if (backToAuthOptionsButtonRegister) backToAuthOptionsButtonRegister.addEventListener('click', showInitialAuthOptions);
}

function showAuthForm(formType) {
    document.getElementById('initial-auth-options').style.display = 'none';
    document.getElementById('auth-prompt-message').textContent = '';
    document.getElementById('auth-message').textContent = ''; // Clear any previous message

    if (formType === 'login') {
        document.getElementById('login-form').style.display = 'flex';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('auth-prompt-message').textContent = "Please log in:";
    } else if (formType === 'register') {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'flex';
        document.getElementById('auth-prompt-message').textContent = "Please create your account:";
    }
}

function showInitialAuthOptions() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('initial-auth-options').style.display = 'flex';
    document.getElementById('auth-prompt-message').textContent = "Please choose an option:";
    document.getElementById('auth-message').textContent = ''; // Clear message when going back
}


async function handleLogin() {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const authMessage = document.getElementById('auth-message');

    if (!email || !password) {
        authMessage.textContent = "Please enter your email and password.";
        authMessage.classList.add('loss-text');
        authMessage.classList.remove('win-text');
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        authMessage.textContent = "Login successful!";
        authMessage.classList.add('win-text');
        authMessage.classList.remove('loss-text');
    } catch (error) {
        let errorMessage = "Login error.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = "Incorrect email or password.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Invalid email format.";
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = "Too many failed login attempts. Please try again later.";
        } else {
            errorMessage = error.message;
        }
        authMessage.textContent = errorMessage;
        authMessage.classList.add('loss-text');
        authMessage.classList.remove('win-text');
        console.error("Firebase login error:", error);
    }
}

async function handleRegister() {
    const username = document.getElementById('username-input').value;
    const email = document.getElementById('register-email-input').value;
    const password = document.getElementById('register-password-input').value;
    const authMessage = document.getElementById('auth-message');

    if (!username || !email || !password) {
        authMessage.textContent = "Please fill in all fields (Username, Email, Password).";
        authMessage.classList.add('loss-text');
        authMessage.classList.remove('win-text');
        return;
    }
    if (password.length < 6) {
        authMessage.textContent = "Password must be at least 6 characters long.";
        authMessage.classList.add('loss-text');
        authMessage.classList.remove('win-text');
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Save username and initial balance to Firestore
        await db.collection('users').doc(user.uid).set({
            email: user.email,
            username: username, // Store the username
            balance: 1000 // Initial balance for new users
        });

        authMessage.textContent = "Account created successfully! You can now log in.";
        authMessage.classList.add('win-text');
        authMessage.classList.remove('loss-text');

        // After successful registration, show the login form again
        showAuthForm('login');

    } catch (error) {
        let errorMessage = "Error creating account.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "This email is already in use.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "Password too weak (must be at least 6 characters).";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Invalid email format.";
        } else {
            errorMessage = error.message;
        }
        authMessage.textContent = errorMessage;
        authMessage.classList.add('loss-text');
        authMessage.classList.remove('win-text');
        console.error("Firebase registration error:", error);
    }
}

async function handleForgotPassword() {
    const emailInput = document.getElementById('email-input');
    const email = emailInput.value;
    const authMessage = document.getElementById('auth-message');

    if (!email) {
        authMessage.textContent = "Please enter your email to reset your password.";
        authMessage.classList.add('loss-text');
        authMessage.classList.remove('win-text');
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);
        authMessage.textContent = "A password reset email has been sent to your address.";
        authMessage.classList.add('win-text');
        authMessage.classList.remove('loss-text');
    } catch (error) {
        let errorMessage = "Error sending reset email.";
        if (error.code === 'auth/user-not-found') {
            errorMessage = "No user found with this email.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Invalid email format.";
        } else {
            errorMessage = error.message;
        }
        authMessage.textContent = errorMessage;
        authMessage.classList.add('loss-text');
        authMessage.classList.remove('win-text');
        console.error("Firebase password reset error:", error);
    }
}

async function logout() {
    try {
        // Save the jackpot before logging out
        await saveProgressiveJackpot();
        await auth.signOut();
        console.log("Logout successful.");
    } catch (error) {
        console.error("Firebase logout error:", error);
    }
}

// --- Balance management functions with Firestore ---

async function loadUserData(userId) { // Added 'async' here
    try {
        const docRef = db.collection('users').doc(userId);
        const doc = await docRef.get(); // Using await

        if (doc.exists) {
            const userData = doc.data();
            balance = userData.balance || 0; // Set balance from Firestore, default to 0 if not found
            updateBalanceDisplay(); // Update the displayed balance
            console.log("Balance loaded from Firestore:", balance);
        } else {
            console.log("No user data found, initializing balance to 0 and creating document.");
            balance = 0; // Initialize balance if no user data exists
            updateBalanceDisplay();
            // Create user document with initial balance if not found
            // Note: When creating, the username is already stored in handleRegister.
            // If a user gets here without a document (e.g., old user without username or failure),
            // we could initialize with a default username or ask the user to enter it.
            // For now, we'll assume `handleRegister` has created the document.
            // If this code is reached and there's no doc, it's an unexpected situation for a user
            // who just logged in via Firebase Auth but has no Firestore profile.
            // For robustness, we could add:
            // if (!doc.exists && auth.currentUser) {
            //     await db.collection('users').doc(userId).set({ 
            //         email: auth.currentUser.email, 
            //         username: auth.currentUser.email.split('@')[0], // Default username from email
            //         balance: 1000 
            //     });
            //     balance = 1000;
            //     updateBalanceDisplay();
            // }
        }
    } catch (error) {
        console.error("Error loading user data:", error);
    }
}


function updateBalanceDisplay() {
    const balanceElements = document.querySelectorAll('#current-balance');
    balanceElements.forEach(element => {
        // Format balance using Intl.NumberFormat for thousands separator
        element.textContent = currencyFormatter.format(balance);
    });

    if (currentUserId) {
        saveUserData(currentUserId, balance);
        // After updating balance, refresh the leaderboard as rankings might change
        loadLeaderboard(); 
    }
}

async function saveUserData(userId, newBalance) {
    if (!userId) {
        console.error("Error: Cannot save data without user ID.");
        return;
    }
    try {
        await db.collection('users').doc(userId).update({
            balance: newBalance
        });
        console.log("Balance updated in Firestore for", userId, ":", newBalance);
    } catch (error) {
        console.error("Error updating balance in Firestore:", error);
        // Use a custom message box instead of alert()
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            const messageBox = document.createElement('div');
            messageBox.classList.add('message-box', 'loss-text');
            messageBox.textContent = "Critical error: Unable to save your balance. Your balance may be incorrect after this action.";
            gameContainer.appendChild(messageBox);
            setTimeout(() => {
                messageBox.remove();
            }, 3000);
        }
    }
}

// --- Progressive Jackpot management functions ---

async function loadProgressiveJackpot() {
    try {
        const docRef = db.collection('global').doc('jackpot');
        const doc = await docRef.get();

        const currentTime = Date.now(); // Current time in milliseconds

        if (doc.exists) {
            const data = doc.data();
            progressiveJackpot = data.amount || 10000;
            const lastUpdateTime = data.lastUpdateTimestamp ? data.lastUpdateTimestamp.toDate().getTime() : currentTime;

            // Calculate increment based on elapsed time
            const timeElapsedSeconds = (currentTime - lastUpdateTime) / 1000;
            if (timeElapsedSeconds > 0) {
                const increment = timeElapsedSeconds * JACKPOT_INCREMENT_PER_SECOND;
                progressiveJackpot += increment;
            }
            console.log("Jackpot loaded and updated:", progressiveJackpot.toFixed(2), "€");
        } else {
            // If the document does not exist, initialize the jackpot
            progressiveJackpot = 10000;
            console.log("Jackpot initialized to:", progressiveJackpot.toFixed(2), "€");
        }

        // Update display and immediately save the new value and timestamp
        updateProgressiveJackpotDisplay();
        await saveProgressiveJackpot(); // Save current jackpot state after calculation

    } catch (error) {
        console.error("Error loading or updating jackpot :", error);
    }
}

async function saveProgressiveJackpot() {
    try {
        const docRef = db.collection('global').doc('jackpot');
        await docRef.set({
            amount: progressiveJackpot,
            lastUpdateTimestamp: firebase.firestore.Timestamp.now() // Use Firestore timestamp
        }, { merge: true }); // Use merge to avoid overwriting other potential fields
        console.log("Jackpot saved:", progressiveJackpot.toFixed(2), "€");
    } catch (error) {
        console.error("Error saving jackpot:", error);
    }
}

function updateProgressiveJackpotDisplay() {
    const jackpotDisplayElement = document.getElementById('progressive-jackpot-display');
    const jackpotContainer = document.getElementById('progressive-jackpot-container');
    if (jackpotDisplayElement) {
        // Format jackpot using Intl.NumberFormat for thousands separator
        jackpotDisplayElement.textContent = currencyFormatter.format(progressiveJackpot);
    }
    // Show or hide jackpot container based on connection status
    if (jackpotContainer) {
        jackpotContainer.style.display = currentUserId ? 'flex' : 'none';
    }
}

// --- Leaderboard management functions ---

async function loadLeaderboard() {
    try {
        const leaderboardList = document.getElementById('leaderboard-list');
        const leaderboardContainer = document.getElementById('leaderboard-container');
        leaderboardList.innerHTML = ''; // Clear current leaderboard

        console.log("loadLeaderboard: Checking currentUserId:", currentUserId);
        // Only load and display if a user is logged in
        if (!currentUserId) {
            leaderboardContainer.style.display = 'none';
            console.log("loadLeaderboard: User not logged in, hiding leaderboard.");
            return;
        } else {
            leaderboardContainer.style.display = 'flex'; // Show leaderboard container
            console.log("loadLeaderboard: User logged in, attempting to load leaderboard.");
        }

        const usersRef = db.collection('users');
        // Fetch users sorted by balance in descending order, limit to top 10
        // NOTE: Firestore's `orderBy` requires an index. If you encounter an error,
        // Firebase will provide a link to create the necessary index in the console.
        // For local sorting, you would fetch all and sort in JS, but that's less efficient for many users.
        // For simplicity and given the user's explicit request for Firestore rules,
        // we assume `orderBy` will be used and an index will be created if needed.
        const q = usersRef.orderBy('balance', 'desc').limit(10);
        console.log("loadLeaderboard: Executing Firestore query for top 10 users by balance.");
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            console.log("loadLeaderboard: No users found in the 'users' collection.");
            leaderboardList.innerHTML = '<li>Aucun joueur à afficher dans le classement.</li>';
            return;
        }

        let rank = 1;
        console.log("loadLeaderboard: Users retrieved from Firestore:");
        querySnapshot.forEach(doc => {
            const userData = doc.data();
            const username = userData.username || 'Unknown User';
            // Format balance using Intl.NumberFormat for thousands separator
            const balance = userData.balance ? currencyFormatter.format(userData.balance) : currencyFormatter.format(0);
            console.log(`- Rank ${rank}: User: ${username}, Balance: ${balance}€ (UID: ${doc.id})`);

            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span class="leaderboard-rank">${rank}.</span>
                <span class="leaderboard-username">${username}</span>
                <span class="leaderboard-balance">${balance} €</span>
            `;
            leaderboardList.appendChild(listItem);
            rank++;
        });
        console.log("Leaderboard loaded successfully.");
    } catch (error) {
        console.error("Error loading leaderboard:", error);
        // Display a message to the user if the leaderboard can't be loaded
        const leaderboardContainer = document.getElementById('leaderboard-container');
        if (leaderboardContainer) {
            leaderboardContainer.innerHTML = '<h2>🏆 Leaderboard des Plus Riches 🏆</h2><p class="loss-text">Impossible de charger le leaderboard pour le moment. Veuillez vérifier votre console pour plus de détails sur l\'erreur (et potentiellement un lien pour créer un index Firestore).</p>';
            leaderboardContainer.style.display = 'flex'; // Ensure container is visible to show error
        }
    }
}


function displayGameSelectionMenu() {
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <h1>BIENVENUE AU JEWBUZZ CASINO !</h1>
        <p>Solde : <span id="current-balance">${currencyFormatter.format(balance)}</span> €</p>
        <!-- Jackpot here -->
        <div id="progressive-jackpot-container">
            <p>JACKPOT : <span id="progressive-jackpot-display">${currencyFormatter.format(progressiveJackpot)}</span> €</p>
        </div>
        <div class="main-menu">
            <h1>Choose your game</h1>
            <div class="game-buttons">
                <button class="game-button" onclick="startSlotMachine()">Slot Machine</button>
                <button class="game-button" onclick="startBlackjack()">Blackjack</button>
                <button class="game-button" onclick="startChickenGame()">Chicken Game</button>
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
        <button id="logout-button" class="game-button logout-button">Log Out</button>
        <div id="slot-machine-container" style="display:none;"></div>
        <div id="blackjack-container" style="display:none;"></div>
        <div id="chicken-game-container" style="display:none;"></div>

        <button id="back-to-menu" class="game-button" style="display:none; margin-top: 20px;" onclick="showMainMenu()">Back to Menu</button>
    `;
    setupGameMenuListeners(); // Re-attach listeners after HTML recreation
    updateProgressiveJackpotDisplay(); // Ensure jackpot display is correct
    loadLeaderboard(); // Load and display the leaderboard in the main menu
    // Setup free reward button listener and start countdown
    document.getElementById('free-reward-button').addEventListener('click', collectFreeReward);
    startRewardCountdown();
}

function showMainMenu() {
    // Hide all game-specific containers
    hideAllGameContainers();
    // Show the main menu elements
    const mainMenu = document.querySelector('.main-menu');
    if (mainMenu) {
        mainMenu.style.display = 'block';
    }
    document.getElementById('logout-button').style.display = 'block'; // Ensure logout button is visible
    document.getElementById('back-to-menu').style.display = 'none'; // Hide back to menu button
    updateBalanceDisplay(); // Update balance display
    updateProgressiveJackpotDisplay(); // Update jackpot display
    loadLeaderboard(); // Reload leaderboard on returning to main menu

    // Re-attach game menu listeners if the HTML was re-rendered
    setupGameMenuListeners();
    // Setup free reward button listener and start countdown
    document.getElementById('free-reward-button').addEventListener('click', collectFreeReward);
    startRewardCountdown();
}

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
    // Using event delegation or ensuring elements exist before attaching listeners
    document.querySelector('.main-menu .game-buttons').addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            if (event.target.textContent.includes('Machines à Sous')) {
                startSlotMachine();
            } else if (event.target.textContent.includes('Blackjack')) {
                startBlackjack();
            } else if (event.target.textContent.includes('Jeu du Poulet')) {
                startChickenGame();
            }
        }
    });
}


function startSlotMachine() {
    hideAllGameContainers();
    document.getElementById('slot-machine-container').style.display = 'block';
    document.getElementById('back-to-menu').style.display = 'block';
    // The progressive jackpot code is not directly in slotMachine.js
    // It is managed globally, so its display is controlled by main.js
    // make sure it is visible here if necessary
    document.getElementById('progressive-jackpot-container').style.display = 'flex';
    document.getElementById('leaderboard-container').style.display = 'none'; // Hide leaderboard in game view
    document.getElementById('free-reward-button').style.display = 'none'; // Hide free reward button
    document.getElementById('free-reward-countdown').style.display = 'none'; // Hide countdown
    stopRewardCountdown();
}

function startBlackjack() {
    hideAllGameContainers();
    document.getElementById('blackjack-container').style.display = 'block';
    document.getElementById('back-to-menu').style.display = 'block';
    document.getElementById('progressive-jackpot-container').style.display = 'flex';
    document.getElementById('leaderboard-container').style.display = 'none'; // Hide leaderboard in game view
    document.getElementById('free-reward-button').style.display = 'none'; // Hide free reward button
    document.getElementById('free-reward-countdown').style.display = 'none'; // Hide countdown
    stopRewardCountdown();
}



function startChickenGame() {
    hideAllGameContainers();
    document.getElementById('chicken-game-container').style.display = 'block';
    document.getElementById('back-to-menu').style.display = 'block';
    document.getElementById('progressive-jackpot-container').style.display = 'flex';
    document.getElementById('leaderboard-container').style.display = 'none'; // Hide leaderboard in game view
    document.getElementById('free-reward-button').style.display = 'none'; // Hide free reward button
    document.getElementById('free-reward-countdown').style.display = 'none'; // Hide countdown
    stopRewardCountdown();
}

function hideAllGameContainers() {
    const mainMenu = document.querySelector('.main-menu');
    if (mainMenu) {
        mainMenu.style.display = 'none';
    }
    document.getElementById('slot-machine-container').style.display = 'none';
    document.getElementById('blackjack-container').style.display = 'none';
    document.getElementById('chicken-game-container').style.display = 'none';
    // Hide progressive jackpot when no game is selected and main menu is hidden
    const jackpotContainer = document.getElementById('progressive-jackpot-container');
    if (jackpotContainer) {
        jackpotContainer.style.display = 'none';
    }
    // Also hide leaderboard when navigating away from main menu
    const leaderboardContainer = document.getElementById('leaderboard-container');
    if (leaderboardContainer) {
        leaderboardContainer.style.display = 'none';
    }
}

// and all of them in a random color by animation.
function showFloatingWinNumbers(winAmount, parentElement) {
    if (!parentElement) {
        console.error(`showFloatingWinNumbers: parentElement is null or undefined for floating numbers.`);
        return;
    }

    // Determine the number of digits to display (more gain, more digits, up to 10)
    const numberOfSpans = Math.min(10, Math.ceil(winAmount / 15));
    // Calculate the base value for each digit, then distribute the remainder
    const baseValue = Math.floor(winAmount / numberOfSpans);
    let remainingValue = winAmount % numberOfSpans;

    const floatingContainer = parentElement; // This is usually #slots-grid
    const parentRect = parentElement.getBoundingClientRect(); // Get dimensions and position of the parent element

    // Define a central "pop" area where numbers will initially appear.
    // Adjust these percentages (0.5, 0.4) and offsets (popAreaOffsetX/Y)
    // based on your slot machine size to make them visually centered.
    const popAreaWidth = parentRect.width * 0.5;  // 50% of parent width
    const popAreaHeight = parentRect.height * 0.4; // 40% of parent height
    const popAreaOffsetX = (parentRect.width - popAreaWidth) / 2; // Calculate offset to center the area horizontally
    const popAreaOffsetY = (parentRect.height - popAreaHeight) / 2; // Calculate offset to center the area vertically

    // --- Generate ONE random color for ALL numbers in this animation ---
    // Uses HSL for vivid colors and easy hue manipulation
    const randomHue = Math.floor(Math.random() * 360); // Random hue (0-360 degrees on the color wheel)
    const uniqueRandomColor = `hsl(${randomHue}, 100%, 70%)`; // Maximum saturation (100%) and high lightness (70%) for very vivid colors

    for (let i = 0; i < numberOfSpans; i++) {
        const numberSpan = document.createElement('span');
        numberSpan.classList.add('floating-win-number'); // Add CSS class for animation

        let value = baseValue;
        if (i < remainingValue) {
            value++; // Distribute the remainder to the first `remainingValue` spans
        }
        // Format the value before displaying it
        numberSpan.textContent = `+${currencyFormatter.format(value)}€`; // Display the number formatted as currency

        // --- Random starting positions WITHIN THE CENTERED POP AREA ---
        // These coordinates will serve as the origin point for the "pop" and dispersion effect.
        const startX = (Math.random() * popAreaWidth) + popAreaOffsetX;
        const startY = (Math.random() * popAreaHeight) + popAreaOffsetY;

        // --- Random final offsets for a very wide dispersion ---
        // Numbers will move away from their initial starting point (startX, startY)
        // The range (e.g., * 1.8) controls the maximum dispersion distance.
        const endOffsetX = (Math.random() - 0.5) * (parentRect.width * 1.8); // Horizontal dispersion (-90% to +90% of parent width)
        const endOffsetY = (Math.random() - 0.5) * (parentRect.height * 1.8); // Vertical dispersion (-90% to +90% of parent height)

        // --- Apply the same random color generated ONCE to ALL spans ---
        numberSpan.style.color = uniqueRandomColor;

        // Define custom CSS variables (--start-x, --start-y, etc.)
        // These variables are used in `@keyframes` in CSS.
        numberSpan.style.setProperty('--start-x', `${startX}px`);
        numberSpan.style.setProperty('--start-y', `${startY}px`);
        numberSpan.style.setProperty('--end-offset-x', `${endOffsetX}px`);
        numberSpan.style.setProperty('--end-offset-y', `${endOffsetY}px`);

        // Random animation delay and duration for a more organic, less synchronous effect.
        // A small random delay makes the numbers appear slightly staggered.
        numberSpan.style.animationDelay = `${Math.random() * 0.2}s`; // Delay before each number's animation starts (0 to 0.2s)
        numberSpan.style.animationDuration = `${Math.random() * 1 + 2.5}s`; // Total animation duration for each number (between 2.5s and 3.5s)

        floatingContainer.appendChild(numberSpan); // Add the number (span) to the parent element
    }

    // Set a timer to remove numbers from the DOM after their animation ends.
    // This delay must be greater than the maximum animation duration + maximum animation delay to ensure all numbers disappear cleanly.
    setTimeout(() => {
        document.querySelectorAll('.floating-win-number').forEach(span => {
            span.remove(); // Remove the span element from the DOM
        });
    }, 4000); // 4000 ms = 4 seconds, which is greater than 3.5s (max duration) + 0.2s (max delay)
}


// --- Free Reward Functions ---

async function loadRewardData() {
    if (!currentUserId) return;
    try {
        const docRef = db.collection('users').doc(currentUserId);
        const doc = await docRef.get();
        if (doc.exists) {
            const userData = doc.data();
            lastRewardTimestamp = userData.lastRewardTimestamp || 0;
            console.log("Last reward timestamp loaded:", lastRewardTimestamp);
        } else {
            console.log("No reward data found for user.");
            lastRewardTimestamp = 0;
        }
    } catch (error) {
        console.error("Error loading reward data:", error);
    }
}

async function saveRewardTimestamp() {
    if (!currentUserId) return;
    try {
        await db.collection('users').doc(currentUserId).update({
            lastRewardTimestamp: lastRewardTimestamp
        });
        console.log("Reward timestamp saved:", lastRewardTimestamp);
    } catch (error) {
        console.error("Error saving reward timestamp:", error);
    }
}

function startRewardCountdown() {
    stopRewardCountdown(); // Clear any existing interval

    const rewardButton = document.getElementById('free-reward-button');
    const countdownDisplay = document.getElementById('free-reward-countdown');

    if (!rewardButton || !countdownDisplay) return;

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
            // Ensure the button is visible if it was hidden
            rewardButton.style.display = 'block';
            countdownDisplay.style.display = 'block';
            stopRewardCountdown(); // Stop interval once available
        } else {
            rewardButton.disabled = true;
            rewardButton.style.opacity = '0.6'; // Make it slightly transparent when unavailable
            rewardButton.textContent = 'Récompense Gratuite';
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            countdownDisplay.textContent = `Prochaine récompense dans: ${hours}h ${minutes}m ${seconds}s`;
            countdownDisplay.classList.remove('available-text');
            countdownDisplay.classList.add('countdown-text');
            rewardButton.style.display = 'block'; // Ensure it's visible even when counting down
            countdownDisplay.style.display = 'block';
        }
    }

    updateCountdown(); // Initial call
    rewardCountdownInterval = setInterval(updateCountdown, 1000); // Update every second
}

function stopRewardCountdown() {
    if (rewardCountdownInterval) {
        clearInterval(rewardCountdownInterval);
        rewardCountdownInterval = null;
    }
}

async function collectFreeReward() {
    const now = Date.now();
    if (now < lastRewardTimestamp + REWARD_COOLDOWN_MS) {
        // This should not happen if the button is correctly disabled
        return; 
    }

    const rewardAmount = Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD + 1)) + MIN_REWARD;
    balance += rewardAmount;
    updateBalanceDisplay();

    lastRewardTimestamp = now;
    await saveRewardTimestamp(); // Save the new timestamp to Firestore

    const gameContainer = document.getElementById('game-container'); // Or a more specific element if needed
    showFloatingWinNumbers(rewardAmount, gameContainer);

    const rewardButton = document.getElementById('free-reward-button');
    const countdownDisplay = document.getElementById('free-reward-countdown');
    if (rewardButton) {
        rewardButton.disabled = true;
        rewardButton.style.opacity = '0.6';
    }
    if (countdownDisplay) {
        countdownDisplay.textContent = `Vous avez reçu ${rewardAmount} € !`;
        countdownDisplay.classList.add('win-text'); // Temporary win animation
        countdownDisplay.classList.remove('countdown-text', 'available-text');
    }

    setTimeout(() => {
        if (countdownDisplay) {
            countdownDisplay.classList.remove('win-text');
        }
        startRewardCountdown(); // Restart the countdown after showing the reward
    }, 2000); // Show reward message for 2 seconds
}
