// shop.js
// Ce fichier gère la logique et le rendu de la boutique en jeu.

let _updateBalanceDisplay;
let _showFloatingWinNumbers;
let _currencyFormatter;
let _allCosmetics = []; // Stocke tous les cosmétiques localement dans shop.js
let _userGeneratedImages = []; // Nouveau : Stocke les images générées par l'utilisateur localement dans shop.js

// Données pour les trophées, avec des descriptions raffinées pour une distinction visuelle et sans texte
const trophyImagesData = [
    {
        id: 'plastic_trophy',
        name: 'Trophée de Plastique Bon Marché',
        description: 'Un trophée rectangulaire en plastique moulé, de couleur terne et légèrement déformé. Il présente des bords grossiers et une surface non polie, avec des marques de moule visibles. Le design est générique, suggérant une production de masse à très faible coût. Aucun détail ni ornement, juste l\'essentiel.',
        cost: 50000, // Coût fixe pour l'achat
        costRange: '50 000 €' // Pour l'affichage
    },
    {
        id: 'silver_engraved_plaque',
        name: 'Plaque d\'Argent Gravée',
        description: 'Un trophée rectangulaire en argent poli, avec des gravures de motifs géométriques classiques. La surface est brillante et réfléchissante, mais les ornements restent discrets. Il symbolise un succès notable et une reconnaissance croissante.',
        cost: 250000,
        costRange: '500 000 €'
    },
    {
        id: 'gold_laurel_statue',
        name: 'Statue d\'Or aux Lauriers',
        description: 'Un trophée rectangulaire imposant en or pur 24 carats, sculpté avec des détails fins de lauriers et des symboles de victoire. La base est solide et la forme dégage de la grandeur. La lumière se reflète intensément, marquant un niveau de succès élevé et ostentatoire.',
        cost: 1500000,
        costRange: '5 000 000 €'
    },
    {
        id: 'diamond_monolith',
        name: 'Monolithe de Diamant Incrusté',
        description: 'Un trophée rectangulaire massif en obsidienne polie, incrusté de multiples diamants bruts et taillés qui capturent la lumière. La forme est angulaire et puissante, avec des reflets éblouissants provenant des diamants. Il représente une prouesse exceptionnelle et une fortune considérable.',
        cost: 5500000,
        costRange: '50 000 000 €'
    },
    {
        id: 'cosmic_shard',
        name: 'Éclat Cosmique de Platine',
        description: 'Un trophée rectangulaire futuriste en platine liquide et verre gravé au laser, contenant des nébuleuses en mouvement lent et des étoiles miniatures. Il émet une douce lueur phosphorescente, avec des motifs de galaxie complexes. Ce trophée symbolise une richesse et une influence quasi illimitées, transcendant les matériaux terrestres.',
        cost: 250000000,
        costRange: '500 000 000 €'
    },
    {
        id: 'divine_aether_crystal',
        name: 'Cristal d\'Éther Divin',
        description: 'Le trophée ultime, une entité rectangulaire translucide faite de pure énergie cristallisée et de lumière, pulsant doucement avec des couleurs changeantes. Des motifs cosmiques complexes et des fractales se déplacent à l\'intérieur, créant une illusion de profondeur infinie. Des particules d\'or pur flottent autour de la surface. Ce trophée n\'est pas un objet, mais un fragment d\'une puissance divine, symbolisant une richesse et un statut absolus, atteignant le niveau des divinités du casino.',
        cost: 1000000000, // Un milliard, juste pour le fun
        costRange: '1 000 000 000 €'
    }
];

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
    _allCosmetics = allCosmeticsData; // Définit les données cosmétiques locales
    _userGeneratedImages = firebaseService.getUserGeneratedImages(); // Charge les images générées par l'utilisateur

    // Enregistre les données cosmétiques reçues pour le débogage
    console.log("Shop.js: Données cosmétiques reçues pour l'initialisation de la boutique :", _allCosmetics);
    console.log("Shop.js: Images générées par l'utilisateur reçues :", _userGeneratedImages);


    // S'assure que les rappels d'images générées sont configurés
    firebaseService.onUserImagesUpdated((images) => {
        _userGeneratedImages = images;
        console.log("Shop.js: Mise à jour des images générées par l'utilisateur :", _userGeneratedImages);
        renderShop(); // Ré-affiche la boutique après la mise à jour
    });

    renderShop(); // Rendu initial de la boutique
}

/**
 * Renders the shop interface with available cosmetics and generated images.
 */
async function renderShop() {
    const shopContainer = document.getElementById('shop-container');
    if (!shopContainer) {
        console.error("Shop.js: #shop-container non trouvé.");
        return;
    }
    const cosmeticGrid = shopContainer.querySelector('#cosmetic-grid');
    if (!cosmeticGrid) {
        console.error("Shop.js: #cosmetic-grid non trouvé.");
        return;
    }
    const shopMessage = document.getElementById('shop-message'); // Non utilisé actuellement, peut être supprimé si inutile

    cosmeticGrid.innerHTML = ''; // Efface les éléments précédents

    // Logic to determine which cosmetics to display (filter bonus/debuff items)
    const cosmeticsToDisplay = [];
    const maxOwnedLevelsMap = new Map(); // Key: `${type}-${symbol}`, Value: max_level_owned
    const addedNextLevelBonus = new Set(); // Key: `${type}-${symbol}` to ensure only one next level is added per unique bonus/debuff

    // First, determine the highest owned level for each unique bonus/debuff type and symbol
    firebaseService.getUserOwnedCosmetics().forEach(ownedCosmeticId => {
        const ownedCosmetic = _allCosmetics.find(c => c.id === ownedCosmeticId);
        if (ownedCosmetic && (ownedCosmetic.type === 'slot_symbol_drop_rate_bonus' || ownedCosmetic.type === 'slot_bomb_drop_rate_debuff')) {
            const key = `${ownedCosmetic.type}-${ownedCosmetic.symbol}`;
            const currentLevel = ownedCosmetic.level || 0;
            if (!maxOwnedLevelsMap.has(key) || currentLevel > maxOwnedLevelsMap.get(key)) {
                maxOwnedLevelsMap.set(key, currentLevel);
            }
        }
    });

    // Then, populate `cosmeticsToDisplay`
    _allCosmetics.forEach(cosmetic => {
        if (cosmetic.type === 'slot_symbol_drop_rate_bonus' || cosmetic.type === 'slot_bomb_drop_rate_debuff') {
            const key = `${cosmetic.type}-${cosmetic.symbol}`;
            const highestOwnedLevel = maxOwnedLevelsMap.get(key) || 0; // If not owned, consider level 0
            const desiredLevel = highestOwnedLevel + 1;

            // Only add the cosmetic if its level matches the desired next level,
            // and we haven't already added the next level for this specific bonus/debuff type+symbol.
            if (cosmetic.level === desiredLevel && !addedNextLevelBonus.has(key)) {
                cosmeticsToDisplay.push(cosmetic);
                addedNextLevelBonus.add(key); // Mark that we've added the next level for this type+symbol
            }
        } else {
            // Always add non-level-based cosmetics
            cosmeticsToDisplay.push(cosmetic);
        }
    });


    // Rend les éléments cosmétiques filtrés
    if (cosmeticsToDisplay.length === 0) {
        cosmeticGrid.innerHTML = '<p class="loss-text">Aucun cosmétique disponible pour le moment.</p>';
    } else {
        cosmeticsToDisplay.forEach(cosmetic => {
            const cosmeticItem = document.createElement('div');
            cosmeticItem.classList.add('cosmetic-item');

            const isOwned = firebaseService.getUserOwnedCosmetics().includes(cosmetic.id);
            const isActive = cosmetic.type && firebaseService.getActiveCosmetics()[cosmetic.type] === (cosmetic.value || cosmetic.id);

            // Ajoute les classes "owned" et "equipped" pour le style
            if (isOwned) {
                cosmeticItem.classList.add('owned');
            }
            if (isActive) {
                cosmeticItem.classList.add('equipped');
            }

            let buttonHtml = '';
            // Determine the displayed effect value based on the type
            const effectValue = (cosmetic.value * 100).toFixed(0); // Convert to percentage and remove decimals

            if (cosmetic.type === 'slot_symbol_drop_rate_bonus' || cosmetic.type === 'slot_bomb_drop_rate_debuff') {
                if (isOwned) { // If this specific 'next level' item is now owned after a purchase
                    buttonHtml = `<button class="game-button" disabled>Possédé (Nv ${cosmetic.level})</button>`;
                } else {
                    buttonHtml = `<button class="game-button purchase-button" data-id="${cosmetic.id}" data-action="purchase">Acheter (${_currencyFormatter.format(cosmetic.price)}€)</button>`;
                }

                // Description for bonus/debuff items should be generic, not showing the current level value
                const descriptionText = cosmetic.type === 'slot_symbol_drop_rate_bonus'
                    ? `Augmente de ${effectValue}% le taux de drop de symbole.`
                    : `Réduit de ${effectValue}% le taux de drop de bombe.` ;

                cosmeticItem.innerHTML = `
                    <div class="cosmetic-image">${cosmetic.symbol}</div>
                    <h3 class="cosmetic-name">${cosmetic.name}</h3>
                    <p class="cosmetic-description">${descriptionText}</p>
                    <p class="cosmetic-price">Effet: ${effectValue}%</p>
                    ${buttonHtml}
                `;

            } else { // Gère les cosmétiques généraux
                if (isOwned) {
                    if (isActive) {
                        buttonHtml = `<button class="game-button deactivate-button" data-id="${cosmetic.id}" data-action="deactivate">Désactiver</button>`;
                    } else {
                        buttonHtml = `<button class="game-button activate-button" data-id="${cosmetic.id}" data-action="equip">Équiper</button>`;
                    }
                } else {
                    buttonHtml = `<button class="game-button purchase-button" data-id="${cosmetic.id}" data-action="purchase">Acheter (${_currencyFormatter.format(cosmetic.price)}€)</button>`;
                }

                cosmeticItem.innerHTML = `
                    <div class="cosmetic-image">${cosmetic.emoji || '✨'}</div>
                    <h3 class="cosmetic-name">${cosmetic.name}</h3>
                    <p class="cosmetic-description">${cosmetic.description}</p>
                    <p class="cosmetic-price">${_currencyFormatter.format(cosmetic.price)}€</p>
                    ${buttonHtml}
                `;
            }
            cosmeticGrid.appendChild(cosmeticItem);
        });
    }

    // Ajoute la section pour les images générées
    const existingImageSection = shopContainer.querySelector('#image-trophy-section');
    if (existingImageSection) {
        existingImageSection.remove(); // Supprime l'ancienne section si elle existe
    }

    const imageTrophySection = document.createElement('div');
    imageTrophySection.id = 'image-trophy-section'; // Ajoute un ID pour pouvoir le supprimer/remplacer
    imageTrophySection.innerHTML = `
        <h2 style="color: #a7f3d0; margin-top: 40px; margin-bottom: 25px; font-family: 'Orbitron', sans-serif; text-shadow: 0 0 15px rgba(167, 243, 208, 0.8);">🖼️ Trophées d'Images Générées 🖼️</h2>
        <p class="text-gray-400 mb-4">Générez des trophées uniques et ajoutez-les à votre collection !</p>
        <div id="trophy-generation-grid" class="cosmetic-grid">
            </div>
        <div id="loading-area" class="flex flex-col items-center mt-8 mb-8">
            <p id="loading-text" class="mt-2 text-gray-400 hidden">Génération de l'image en cours...</p>
        </div>
        <div class="mt-4 flex flex-col items-center">
            <h3 class="text-xl font-semibold mb-2" style="color: #e2e8f0;">Image Générée (Aperçu)</h3>
            <img id="generated-trophy-preview" class="image-display" src="https://placehold.co/400x200/3e3e60/e0e0e0?text=Votre+trophée+apparaîtra+ici" alt="Aperçu du trophée généré">
            </div>

        <h3 style="color: #a7f3d0; margin-top: 40px; margin-bottom: 25px; font-family: 'Orbitron', sans-serif; text-shadow: 0 0 15px rgba(167, 243, 208, 0.8);">Votre Collection de Trophées d'Images</h3>
        <div id="user-trophy-collection-grid" class="cosmetic-grid">
            <p id="no-images-message" class="text-gray-400">Aucune image de trophée dans votre collection.</p>
        </div>
    `;
    shopContainer.appendChild(imageTrophySection);

    const trophyGenerationGrid = document.getElementById('trophy-generation-grid');
    trophyGenerationGrid.innerHTML = '';
    trophyImagesData.forEach(trophy => {
        const trophyItem = document.createElement('div');
        trophyItem.classList.add('cosmetic-item');
        trophyItem.innerHTML = `
            <h3 class="cosmetic-name">${trophy.name}</h3>
            <p class="cosmetic-description">${trophy.description}</p>
            <p class="cosmetic-price">Génération & Achat : ${_currencyFormatter.format(trophy.cost)}€</p>
            <button class="game-button generate-trophy-button" data-id="${trophy.id}" data-description="${trophy.description}" data-cost="${trophy.cost}">Générer & Acheter</button>
        `;
        trophyGenerationGrid.appendChild(trophyItem);
    });

    // Affiche les images générées par l'utilisateur
    const userTrophyCollectionGrid = document.getElementById('user-trophy-collection-grid');
    const noImagesMessage = document.getElementById('no-images-message');
    userTrophyCollectionGrid.innerHTML = ''; // Efface les images précédentes
    if (_userGeneratedImages.length > 0) {
        noImagesMessage.style.display = 'none';
        _userGeneratedImages.forEach(img => {
            const imgItem = document.createElement('div');
            imgItem.classList.add('cosmetic-item');
            imgItem.innerHTML = `
                <h3 class="cosmetic-name">${img.name}</h3>
                <img src="${img.url}" alt="${img.name}" class="cosmetic-image-display">
                <p class="cosmetic-price">Coût d'achat: ${_currencyFormatter.format(img.cost)}€</p>
            `;
            userTrophyCollectionGrid.appendChild(imgItem);
        });
    } else {
        noImagesMessage.style.display = 'block';
    }


    // Rattache les écouteurs d'événements pour les actions cosmétiques
    shopContainer.querySelectorAll('.purchase-button, .activate-button, .deactivate-button').forEach(button => {
        button.removeEventListener('click', handleCosmeticAction); // Prévient les écouteurs en double
        button.addEventListener('click', handleCosmeticAction);
    });

    // Ajoute un écouteur d'événements pour les boutons de génération d'images
    shopContainer.querySelectorAll('.generate-trophy-button').forEach(button => {
        button.removeEventListener('click', handleGenerateTrophyImage); // Prévient les écouteurs en double
        button.addEventListener('click', handleGenerateTrophyImage);
    });
}

/**
 * Handles purchase/equip/deactivate actions for cosmetic items.
 * @param {Event} event - The click event.
 */
async function handleCosmeticAction(event) {
    const button = event.target;
    const cosmeticId = button.dataset.id;
    const action = button.dataset.action;

    const cosmetic = _allCosmetics.find(c => c.id === cosmeticId);
    if (!cosmetic) {
        showMessageBox("Erreur: Cosmétique introuvable.", document.getElementById('shop-container'), 'loss');
        return;
    }

    const shopContainer = document.getElementById('shop-container');

    if (action === 'purchase') {
        const result = await firebaseService.purchaseCosmetic(cosmetic);
        if (result.success) {
            let message = `${cosmetic.name} a été acheté avec succès !`;
            if (cosmetic.type === 'slot_symbol_drop_rate_bonus' || cosmetic.type === 'slot_bomb_drop_rate_debuff') {
                const effectValue = (cosmetic.value * 100).toFixed(0);
                message = `${cosmetic.name} (Niveau ${cosmetic.level}) a été acheté ! Effet : ${cosmetic.type === 'slot_symbol_drop_rate_bonus' ? 'Augmentation' : 'Réduction'} de ${effectValue}% du taux de drop.`;
            }
            showMessageBox(message, shopContainer, 'win');
            _updateBalanceDisplay(firebaseService.getUserBalance()); // Met à jour l'affichage du solde
        } else {
            console.error("Shop.js: Échec de l'achat:", result.error.message);
            showMessageBox(`Échec de l'achat : ${result.error.message}`, shopContainer, 'loss');
        }
    } else if (action === 'equip') {
        const result = await firebaseService.activateCosmetic(cosmetic);
        if (result.success) {
            showMessageBox(`${cosmetic.name} est maintenant équipé !`, shopContainer, 'win');
        } else {
            console.error("Shop.js: Échec de l'équipement:", result.error.message);
            showMessageBox(`Échec de l'équipement : ${result.error.message}`, shopContainer, 'loss');
        }
    } else if (action === 'deactivate') {
        const result = await firebaseService.deactivateCosmetic(cosmetic.id);
        if (result.success) {
            showMessageBox(`${cosmetic.name} a été désactivé.`, shopContainer, 'win');
        } else {
            console.error("Shop.js: Échec de la désactivation:", result.error.message);
            showMessageBox(`Échec de la désactivation : ${result.error.message}`, shopContainer, 'loss');
        }
    }
    renderShop(); // Toujours re-rendre pour refléter les changements
}

/**
 * Gère la génération et l'achat automatique d'une image de trophée.
 * @param {Event} event - L'événement de clic.
 */
async function handleGenerateTrophyImage(event) {
    const button = event.target;
    const trophyId = button.dataset.id;
    const description = button.dataset.description;
    const cost = parseInt(button.dataset.cost);

    const generatedTrophyPreview = document.getElementById('generated-trophy-preview');
    const loadingText = document.getElementById('loading-text');
    const shopContainer = document.getElementById('shop-container');

    // Vérifie le solde avant de générer
    if (firebaseService.getUserBalance() < cost) {
        showMessageBox("Solde insuffisant pour générer et acheter cette image.", shopContainer, 'loss');
        return;
    }

    // Désactive tous les boutons de génération
    document.querySelectorAll('.generate-trophy-button').forEach(btn => btn.disabled = true);
    
    generatedTrophyPreview.src = 'https://placehold.co/400x200/3e3e60/e0e0e0?text=Génération+en+cours...'; // Placeholder
    loadingText.classList.remove('hidden');

    const prompt = `Créez un trophée rectangulaire pour un casino en ligne. Le trophée doit avoir un ratio d'environ 2:1 (largeur:hauteur), être solide et sculptural. Il doit intégrer visuellement les éléments suivants: "${description}". Le style doit être réaliste et visuellement distinct pour marquer sa gamme de prix. ABSOLUMENT AUCUN TEXTE, LETTRE, CHIFFRE OU SYMBOLE.`;

    try {
        const payload = { instances: { prompt: prompt }, parameters: { "sampleCount": 1 } };
        const apiKey = "AIzaSyD-NXS8vJnykWFq9RSF78Dxl--67wXo7bw"; // Canvas fournira automatiquement ceci à l'exécution
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
            const imageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
            generatedTrophyPreview.src = imageUrl;
            showMessageBox("Aperçu du trophée généré !", shopContainer, 'win');

            // --- L'achat se fait directement ici ---
            const base64Image = result.predictions[0].bytesBase64Encoded;
            const name = trophyImagesData.find(t => t.id === trophyId).name; // Récupère le nom du trophée

            console.log("Shop.js: Image générée avec succès. Tentative d'achat automatique.");
            console.log("Shop.js: Données envoyées à storeGeneratedImage:", { name, cost, base64Image: base64Image.substring(0, 50) + "..." });

            const storeResult = await firebaseService.storeGeneratedImage(`data:image/png;base64,${base64Image}`, name, cost);
            
            console.log("Shop.js: Résultat de storeGeneratedImage (achat automatique):", storeResult);

            if (storeResult.success) {
                showMessageBox("Trophée acheté et ajouté à votre collection !", shopContainer, 'win');
                _updateBalanceDisplay(firebaseService.getUserBalance()); // Met à jour l'affichage du solde
                renderShop(); // Ré-affiche pour montrer la nouvelle image dans la collection
            } else {
                showMessageBox(`Échec de l'achat automatique du trophée : ${storeResult.error.message}`, shopContainer, 'loss');
                console.error("Shop.js: Erreur lors de l'achat automatique du trophée:", storeResult.error);
            }

        } else {
            console.error("Shop.js: Erreur lors de la génération de l'image du trophée: Structure de réponse inattendue ou contenu manquant.");
            generatedTrophyPreview.src = 'https://placehold.co/400x200/FF0000/FFFFFF?text=Erreur+de+génération';
            showMessageBox("Échec de la génération du trophée. Veuillez réessayer.", shopContainer, 'loss');
        }
    } catch (error) {
        console.error("Shop.js: Erreur lors de l'appel à l'API de génération d'image de trophée:", error);
        generatedTrophyPreview.src = 'https://placehold.co/400x200/FF0000/FFFFFF?text=Erreur+de+connexion';
        showMessageBox("Erreur de connexion lors de la génération du trophée.", shopContainer, 'loss');
    } finally {
        loadingText.classList.add('hidden');
        document.querySelectorAll('.generate-trophy-button').forEach(btn => btn.disabled = false); // Réactive les boutons
    }
}


// Fonction utilitaire pour les boîtes de message personnalisées (au lieu d'alert/confirm)
function showMessageBox(message, parentElement, type = 'info') {
    const messageBox = document.createElement('div');
    messageBox.classList.add('message-box');
    messageBox.textContent = message;

    if (type === 'loss') {
        messageBox.classList.add('loss-text');
    } else if (type === 'win') {
        messageBox.classList.add('win-text');
    }

    parentElement.appendChild(messageBox); // Ajoute au conteneur principal du jeu ou de la boutique

    setTimeout(() => {
        messageBox.remove();
    }, 2500); // Le message disparaît après 2.5 secondes
}