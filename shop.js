// shop.js
// This file handles the logic and rendering for the in-game shop.

let _updateBalanceDisplay;
let _showFloatingWinNumbers;
let _currencyFormatter;
let _allCosmetics = []; // Store all cosmetics locally in shop.js

/**
 * Initializes the shop module.
 * @param {Function} updateBalanceDisplayFn - Function to update balance display.
 * @param {Function} showFloatingWinNumbersFn - Function to show floating win numbers.
 * @param {Intl.NumberFormat} currencyFormatterFn - The currency formatter instance.
 * @param {Array<Object>} allCosmeticsData - All available cosmetic items loaded from Firebase.
 */
function initShop(updateBalanceDisplayFn, showFloatingWinNumbersFn, currencyFormatterFn, allCosmeticsData) {
    _updateBalanceDisplay = updateBalanceDisplayFn;
    _showFloatingWinNumbers = showFloatingWinNumbersFn;
    _currencyFormatter = currencyFormatterFn;
    _allCosmetics = allCosmeticsData; // Set the local cosmetics data

    // Log the received cosmetic data to the console for debugging
    console.log("Shop.js: Données cosmétiques reçues pour l'initialisation de la boutique :", _allCosmetics);

    renderShop(); // Initial render of the shop
}

/**
 * Renders the shop interface with available cosmetics.
 */
async function renderShop() {
    const shopContainer = document.getElementById('shop-container');
    const cosmeticGrid = document.getElementById('cosmetic-grid');
    const shopMessage = document.getElementById('shop-message');

    console.log("Shop.js: Début du rendu de la boutique.");

    if (!shopContainer || !cosmeticGrid || !shopMessage) {
        console.error("Shop.js: Éléments de l'interface utilisateur de la boutique non trouvés (shop-container, cosmetic-grid, shop-message).");
        return;
    }

    shopMessage.textContent = ''; // Clear previous messages
    _updateBalanceDisplay(); // Ensure balance is up-to-date

    // Use the locally stored _allCosmetics
    // Sort cosmetics by price in ascending order globally for initial categorization,
    // but the 'slot_drop_rates_combined' category will have its display order
    // specifically sorted by the price of the *next purchasable level*.
    const allCosmetics = [..._allCosmetics].sort((a, b) => a.price - b.price);
    const userOwnedCosmetics = firebaseService.getUserOwnedCosmetics(); // Array of owned cosmetic IDs
    const activeCosmetics = firebaseService.getActiveCosmetics(); // Object of active cosmetics

    const userBalance = firebaseService.getUserBalance();

    console.log("Shop.js: Rendu de la boutique. Tous les cosmétiques disponibles :", allCosmetics, "Possédés par l'utilisateur :", userOwnedCosmetics, "Actifs :", activeCosmetics, "Solde de l'utilisateur :", userBalance);

    cosmeticGrid.innerHTML = ''; // Clear existing items

    if (!allCosmetics || allCosmetics.length === 0) {
        console.log("Shop.js: Aucun article cosmétique disponible ou non chargé.");
        cosmeticGrid.innerHTML = '<p class="loss-text">Aucun article cosmétique disponible pour le moment.</p>';
        return;
    }

    // Group cosmetics by type for better display
    const categorizedCosmetics = {
        // Nouvelle catégorie pour les taux de drop de machine à sous, combinant bonus et malus
        'slot_drop_rates_combined': { name: 'Taux de Drop des Machines à Sous', items: [] }, 
        'slot_theme': { name: 'Thèmes de Machine à Sous', items: [] },
        'other': { name: 'Autres', items: [] }
    };

    allCosmetics.forEach(cosmetic => {
        if (cosmetic.type === 'slot_symbol_drop_rate_bonus' || cosmetic.type === 'slot_bomb_drop_rate_debuff') {
            // Ajouter les bonus et les débuffs de taux de drop à la nouvelle catégorie combinée
            categorizedCosmetics['slot_drop_rates_combined'].items.push(cosmetic);
        } else if (categorizedCosmetics[cosmetic.type]) {
            categorizedCosmetics[cosmetic.type].items.push(cosmetic);
        } else {
            categorizedCosmetics['other'].items.push(cosmetic);
        }
    });

    // Sort the combined drop rate items by level for consistent display within grouped symbols.
    // The main sorting for display order of symbols will be done later.
    categorizedCosmetics['slot_drop_rates_combined'].items.sort((a, b) => a.level - b.level);


    for (const categoryKey in categorizedCosmetics) {
        const category = categorizedCosmetics[categoryKey];
        
        if (category.items.length === 0 && categoryKey !== 'other') { // Skip empty categories unless it's 'other' (which might be empty by design)
            continue;
        }

        const categorySection = document.createElement('div');
        categorySection.classList.add('shop-category-section');
        categorySection.innerHTML = `<h3>${category.name}</h3>`;
        const categoryGridElement = document.createElement('div'); // Renamed to avoid confusion with parent cosmeticGrid
        categoryGridElement.classList.add('cosmetic-grid');
        categorySection.appendChild(categoryGridElement);

        // Specific rendering logic for the combined 'slot_drop_rates_combined' category
        if (categoryKey === 'slot_drop_rates_combined') {
            // Regrouper les cosmétiques par symbole
            const groupedBySymbol = {};
            category.items.forEach(cosmetic => {
                if (!groupedBySymbol[cosmetic.symbol]) {
                    groupedBySymbol[cosmetic.symbol] = [];
                }
                groupedBySymbol[cosmetic.symbol].push(cosmetic);
            });

            const MAX_LEVEL_DROP_RATE = 5;

            // Prepare an array to hold symbols with their next purchasable level (or maxed status)
            const symbolsForDisplay = [];

            // Determine the next purchasable cosmetic for each symbol
            for (const symbol in groupedBySymbol) {
                const itemsForSymbol = groupedBySymbol[symbol]; // Already sorted by level from above
                
                const highestOwnedLevelForSymbol = itemsForSymbol.filter(c => userOwnedCosmetics.includes(c.id))
                                                                  .reduce((maxLevel, c) => Math.max(maxLevel, c.level), 0);
                
                let nextLevelCosmetic = null;
                let isMaxLevel = false;

                if (highestOwnedLevelForSymbol < MAX_LEVEL_DROP_RATE) { 
                    nextLevelCosmetic = itemsForSymbol.find(c => c.level === highestOwnedLevelForSymbol + 1);
                } else if (highestOwnedLevelForSymbol === MAX_LEVEL_DROP_RATE) {
                    isMaxLevel = true;
                }
                
                symbolsForDisplay.push({
                    symbol,
                    nextLevelCosmetic,
                    itemsForSymbol, // Keep reference for display logic
                    highestOwnedLevelForSymbol,
                    isMaxLevel
                });
            }

            // Sort symbols based on the price of their next available cosmetic (cheapest first)
            // Maxed out items will be pushed to the end.
            symbolsForDisplay.sort((a, b) => {
                if (a.isMaxLevel && b.isMaxLevel) return 0; // Both maxed, maintain current relative order
                if (a.isMaxLevel) return 1; // 'a' is maxed, push it to the end
                if (b.isMaxLevel) return -1; // 'b' is maxed, 'a' comes before it

                // If one is not maxed and the other is, the non-maxed one comes first (handled by above)
                // If both are not maxed, sort by price
                const priceA = a.nextLevelCosmetic ? a.nextLevelCosmetic.price : Infinity; // If no next cosmetic (shouldn't happen for non-maxed)
                const priceB = b.nextLevelCosmetic ? b.nextLevelCosmetic.price : Infinity;
                return priceA - priceB;
            });

            // Parcourir chaque groupe de symboles et afficher leurs niveaux
            symbolsForDisplay.forEach(({ symbol, nextLevelCosmetic, itemsForSymbol, highestOwnedLevelForSymbol, isMaxLevel }) => {
                const itemElement = document.createElement('div');
                itemElement.classList.add('cosmetic-item');
                
                if (isMaxLevel) {
                    itemElement.classList.add('equipped'); // Mark visually as max level
                } else if (highestOwnedLevelForSymbol > 0) {
                    itemElement.classList.add('owned'); // Mark as owned (some levels)
                }

                let buttonHTML = '';
                let displayPrice = '';
                let displayDescription = '';
                let canPurchase = false;
                
                // Determine multiplier for display (positive for bonus, negative for debuff)
                const cosmeticTypeForDisplay = nextLevelCosmetic ? nextLevelCosmetic.type : (itemsForSymbol[0] ? itemsForSymbol[0].type : null);
                const valueMultiplier = cosmeticTypeForDisplay === 'slot_bomb_drop_rate_debuff' ? -1 : 1; 

                if (isMaxLevel) {
                    buttonHTML = `<button class="game-button equipped-button" disabled>Niveau Max (${MAX_LEVEL_DROP_RATE})</button>`;
                    displayPrice = 'Terminé';
                    const effectLabel = itemsForSymbol[0].type === 'slot_bomb_drop_rate_debuff' ? 'diminué' : 'augmenté';
                    displayDescription = `Taux de drop de ${symbol} ${effectLabel} de ${highestOwnedLevelForSymbol * valueMultiplier}% (Max).`;
                } else if (nextLevelCosmetic) {
                    canPurchase = userBalance >= nextLevelCosmetic.price;
                    buttonHTML = `<button class="game-button buy-button" data-cosmetic-id="${nextLevelCosmetic.id}" data-action="buy"${!canPurchase ? ' disabled' : ''}>Acheter (Niveau ${nextLevelCosmetic.level})</button>`;
                    displayPrice = _currencyFormatter.format(nextLevelCosmetic.price) + '€';
                    const effectLabel = nextLevelCosmetic.type === 'slot_bomb_drop_rate_debuff' ? 'Diminue de ' : 'Augmente de ';
                    displayDescription = `${effectLabel}${nextLevelCosmetic.level * valueMultiplier}% le taux de drop du symbole ${symbol}.`;
                } else {
                    buttonHTML = `<button class="game-button disabled" disabled>Indisponible</button>`;
                    displayPrice = 'N.A.';
                    displayDescription = `Amélioration pour ${symbol} indisponible.`;
                }
                
                const currentLevelText = highestOwnedLevelForSymbol > 0 ? ` (Niveau Actuel: ${highestOwnedLevelForSymbol})` : '';
                const cosmeticNamePrefix = itemsForSymbol[0].type === 'slot_bomb_drop_rate_debuff' ? 'Réduction Taux de Bombe' : 'Boost Taux de Drop';

                itemElement.innerHTML = `
                    <div class="cosmetic-image">
                        <span>${symbol}</span>
                    </div>
                    <div class="cosmetic-name">${cosmeticNamePrefix} ${symbol} ${currentLevelText}</div>
                    <div class="cosmetic-price">${displayPrice}</div>
                    ${buttonHTML}
                    <div class="cosmetic-description">${displayDescription}</div>
                `;
                categoryGridElement.appendChild(itemElement);
            });
        } else { // Handle other categories (themes, etc.)
            category.items.forEach(cosmetic => {
                const isOwned = userOwnedCosmetics.includes(cosmetic.id);
                const isActive = activeCosmetics[cosmetic.id] !== undefined; // Check if the exact cosmetic ID is active
                
                const itemElement = document.createElement('div');
                itemElement.classList.add('cosmetic-item');
                if (isActive) {
                    itemElement.classList.add('equipped');
                } else if (isOwned) {
                    itemElement.classList.add('owned');
                }

                let buttonHTML = '';
                if (isActive) {
                    buttonHTML = `<button class="game-button equipped-button" disabled>Équipé</button>`;
                } else if (isOwned) {
                    // For non-drop-rate items, the "Equip" button is always needed if it's not active
                    buttonHTML = `<button class="game-button equip-button" data-cosmetic-id="${cosmetic.id}" data-action="equip">Équiper</button>`;
                } else {
                    const canPurchase = userBalance >= cosmetic.price;
                    buttonHTML = `<button class="game-button buy-button" data-cosmetic-id="${cosmetic.id}" data-action="buy"${!canPurchase ? ' disabled' : ''}>Acheter (${_currencyFormatter.format(cosmetic.price)}€)</button>`;
                }

                let imageContent;
                if (cosmetic.imageUrl) {
                    imageContent = `<img src="${cosmetic.imageUrl}" alt="${cosmetic.name}" onerror="this.onerror=null;this.src='https://placehold.co/100x100/3f5161/f5f5f5?text=IMG';" />`;
                } else if (cosmetic.icon) {
                    imageContent = `<span>${cosmetic.icon}</span>`;
                } else if (cosmetic.emoji) {
                    imageContent = `<span>${cosmetic.emoji}</span>`;
                } else {
                    imageContent = `<span>✨</span>`;
                }

                itemElement.innerHTML = `
                    <div class="cosmetic-image">
                        ${imageContent}
                    </div>
                    <div class="cosmetic-name">${cosmetic.name}</div>
                    <div class="cosmetic-price">${isOwned ? 'Possédé' : _currencyFormatter.format(cosmetic.price) + '€'}</div>
                    ${buttonHTML}
                    <div class="cosmetic-description">${cosmetic.description}</div>
                `;
                categoryGridElement.appendChild(itemElement);
            });
        }
        cosmeticGrid.appendChild(categorySection); // Add the section to the main grid
    }


    // Attach event listeners to the grid buttons (delegated to cosmeticGrid)
    cosmeticGrid.removeEventListener('click', handleShopButtonClick); // Remove old listener to avoid duplicates
    cosmeticGrid.addEventListener('click', handleShopButtonClick); // Add new listener
    console.log("Shop.js: Fin du rendu de la boutique. Écouteurs d'événements attachés.");
}

/**
 * Handles click events on shop buttons.
 * @param {Event} event - The click event.
 */
async function handleShopButtonClick(event) {
    const shopContainer = document.getElementById('shop-container');
    const button = event.target;
    if (!button.classList.contains('game-button')) return;

    const cosmeticId = button.dataset.cosmeticId;
    const action = button.dataset.action;
    const cosmetic = _allCosmetics.find(c => c.id === cosmeticId);

    if (!cosmetic) {
        console.error(`Shop.js: Cosmétique introuvable pour l'ID : ${cosmeticId}`);
        showMessageBox("Cosmétique introuvable.", shopContainer, 'loss');
        return;
    }

    console.log(`Shop.js: Action sur le cosmétique "${cosmetic.name}" : ${action}`);

    if (action === 'buy') {
        const result = await firebaseService.purchaseCosmetic(cosmetic);
        if (result.success) {
            showMessageBox(`Vous avez acheté ${cosmetic.name} !`, shopContainer, 'win');
            // No need to explicitly reload user cosmetics or active cosmetics, firebaseService does this
            // and calls the callbacks which will trigger renderShop
        } else {
            console.error("Shop.js: Échec de l'achat:", result.error.message);
            showMessageBox(`Échec de l'achat : ${result.error.message}`, shopContainer, 'loss');
        }
    } else if (action === 'equip') {
        const result = await firebaseService.activateCosmetic(cosmetic);
        if (result.success) {
            showMessageBox(`${cosmetic.name} est maintenant équipé !`, shopContainer, 'win');
            // No need to explicitly reload user cosmetics or active cosmetics, firebaseService does this
            // and calls the callbacks which will trigger renderShop
        } else {
            console.error("Shop.js: Échec de l'équipement:", result.error.message);
            showMessageBox(`Échec de l'équipement : ${result.error.message}`, shopContainer, 'loss');
        }
    }
    renderShop(); // Always re-render to reflect changes
}


// Utility function for custom message boxes (instead of alert/confirm)
function showMessageBox(message, parentElement, type = 'info') {
    const messageBox = document.createElement('div');
    messageBox.classList.add('message-box');
    messageBox.textContent = message;

    if (type === 'loss') {
        messageBox.classList.add('loss-text');
    } else if (type === 'win') {
        messageBox.classList.add('win-text');
    }

    parentElement.appendChild(messageBox); // Add to the main game container or shop container

    setTimeout(() => {
        messageBox.remove();
    }, 2500); // Message disappears after 2.5 seconds
}

// Expose initShop globally so gameLogic.js can call it
window.initShop = initShop;
