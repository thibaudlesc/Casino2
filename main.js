// Variables globales partagées
let balance = 100; // Solde de départ
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
        <button onclick="startRoulette()">Roulette</button>
        <p>Solde actuel : <span id="current-balance">${balance}</span> €</p>
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

// Initialisation de l'interface utilisateur au chargement du DOM
document.addEventListener('DOMContentLoaded', showMainMenu);

// Ces fonctions (startSlotMachine, startRoulette) seront définies dans leurs fichiers respectifs
// et seront appelées globalement via onclick. Pour que cela fonctionne, assurez-vous que
// slotMachine.js et roulette.js sont chargés APRÈS main.js dans votre HTML.