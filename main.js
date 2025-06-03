// Variables globales partagées
let balance = 1000; // Solde de départ
let currentGame = null; // Suivre le jeu actuel

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
        <button onclick="startChickenGame()">Jeu du Poulet</button> <p>Solde actuel : <span id="current-balance">${balance}</span> €</p>
    `;
    updateBalanceDisplay(); // Met à jour l'affichage du solde
}

// Aide pour mettre à jour l'affichage du solde
function updateBalanceDisplay() {
    const balanceSpan = document.getElementById('current-balance');
    if (balanceSpan) {
        balanceSpan.textContent = balance;
    }
}

// Fonction d'aide pour afficher les gains flottants (déplacée ici pour être globale)
function showFloatingWinNumbers(amount, parentElement) {
    const floatingContainer = document.createElement('div');
    floatingContainer.classList.add('floating-win-number-container');
    parentElement.appendChild(floatingContainer);

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
        numberSpan.textContent = `+${value}€`;

        // Random starting position within the parent element
        const startX = Math.random() * (parentElement.offsetWidth * 0.6) + (parentElement.offsetWidth * 0.2);
        const startY = Math.random() * (parentElement.offsetHeight * 0.6) + (parentElement.offsetHeight * 0.2);
        const endOffsetX = (Math.random() - 0.5) * 100; // Float slightly left or right

        numberSpan.style.setProperty('--start-x', `${startX}px`);
        numberSpan.style.setProperty('--start-y', `${startY}px`);
        numberSpan.style.setProperty('--end-offset-x', `${endOffsetX}px`);
        numberSpan.style.animationDelay = `${Math.random() * 0.2}s`; // Stagger animation start
        numberSpan.style.animationDuration = `${Math.random() * 0.8 + 1.5}s`; // Vary duration

        floatingContainer.appendChild(numberSpan);
    }

    setTimeout(() => {
        floatingContainer.innerHTML = ''; // Clear numbers after animation
    }, 2500); // Should be slightly longer than animation duration
}


// Initialisation de l'interface utilisateur au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    showMainMenu();
});