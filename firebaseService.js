// firebaseService.js
// Ce fichier gère toutes les interactions avec l'authentification Firebase et Firestore.

// Instances globales Firebase (initialisées dans index.html)
// 'app', 'auth' et 'db' sont supposées être globalement disponibles depuis index.html
// après le chargement des SDK Firebase.
// Importations Firebase pour Storage (à ajouter dans index.html)
// <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js"></script>
// const storage = firebase.storage();

let currentUserId = null; // Stocke l'UID de l'utilisateur actuel
let username = null; // Stocke le nom d'utilisateur actuel
let balance = 0; // Solde actuel de l'utilisateur
let maxBalance = 0; // Solde le plus haut jamais atteint par l'utilisateur
let jackpotWins = 0; // Nombre de jackpots remportés par l'utilisateur
let progressiveJackpot = 10000; // Valeur du jackpot progressif
let lastRewardTimestamp = 0; // Horodatage de la dernière récompense gratuite collectée
let userCosmetics = []; // Stocke les identifiants des cosmétiques possédés par l'utilisateur
let activeCosmetics = {}; // Stocke les cosmétiques actuellement actifs (par exemple, {'slot_theme': 'gold_theme_class'})
let allAvailableCosmetics = []; // Stocke tous les cosmétiques chargés depuis Firestore
let userGeneratedImages = []; // Nouveau : stocke les URLs des images générées par l'utilisateur

const JACKPOT_INCREMENT_PER_SECOND = 20; // Incrément du jackpot par seconde
const REWARD_COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3 heures en millisecondes
const MIN_REWARD = 500;
const MAX_REWARD = 3000;

// Fonctions de rappel pour notifier gameLogic.js des changements de données ou d'état d'authentification
let onAuthStateChangedCallback = null;
let onUserDataLoadedCallback = null;
let onBalanceUpdatedCallback = null;
let onJackpotUpdatedCallback = null;
let onLeaderboardUpdatedCallback = null;
let onRewardDataLoadedCallback = null;
let onUserCosmeticsUpdatedCallback = null;
let onActiveCosmeticsUpdatedCallback = null;
let onAllCosmeticsLoadedCallback = null;
let onMaxBalanceUpdatedCallback = null; // Nouveau : rappel pour la mise à jour du solde max
let onJackpotWinsUpdatedCallback = null; // Nouveau : rappel pour la mise à jour des jackpots remportés
let onUserImagesUpdatedCallback = null; // Nouveau : rappel pour la mise à jour des images générées par l'utilisateur

/**
 * Définit la fonction de rappel à appeler lorsque l'état d'authentification change.
 * @param {Function} callback - La fonction à appeler avec l'objet utilisateur ou null.
 */
function setAuthStateChangedCallback(callback) {
    onAuthStateChangedCallback = callback;
}

/**
 * Définit la fonction de rappel à appeler lorsque les données utilisateur sont chargées.
 * @param {Function} callback - La fonction à appeler avec le solde chargé.
 */
function setUserDataLoadedCallback(callback) {
    onUserDataLoadedCallback = callback;
}

/**
 * Définit la fonction de rappel à appeler lorsque le solde de l'utilisateur est mis à jour.
 * @param {Function} callback - La fonction à appeler avec le nouveau solde.
 */
function setBalanceUpdatedCallback(callback) {
    onBalanceUpdatedCallback = callback;
}

/**
 * Définit la fonction de rappel à appeler lorsque le jackpot progressif est mis à jour.
 * @param {Function} callback - La fonction à appeler avec la nouvelle valeur du jackpot.
 */
function setJackpotUpdatedCallback(callback) {
    onJackpotUpdatedCallback = callback;
}

/**
 * Définit la fonction de rappel à appeler lorsque les données du classement sont mises à jour.
 * @param {Function} callback - La fonction à appeler avec les données du classement.
 */
function setLeaderboardUpdatedCallback(callback) {
    onLeaderboardUpdatedCallback = callback;
}

/**
 * Définit la fonction de rappel à appeler lorsque les données de récompense sont chargées.
 * @param {Function} callback - La fonction à appeler avec l'horodatage de la dernière récompense.
 */
function setRewardDataLoadedCallback(callback) {
    onRewardDataLoadedCallback = callback;
}

/**
 * Définit la fonction de rappel à appeler lorsque les cosmétiques possédés par l'utilisateur sont mis à jour.
 * @param {Function} callback - La fonction à appeler avec le tableau userCosmetics mis à jour.
 */
function onUserCosmeticsUpdated(callback) {
    onUserCosmeticsUpdatedCallback = callback;
}

/**
 * Définit la fonction de rappel à appeler lorsque les cosmétiques actifs sont mis à jour.
 * @param {Function} callback - La fonction à appeler avec l'objet activeCosmetics mis à jour.
 */
function onActiveCosmeticsUpdated(callback) {
    onActiveCosmeticsUpdatedCallback = callback;
}

/**
 * Définit la fonction de rappel à appeler lorsque tous les cosmétiques disponibles sont chargés.
 * @param {Function} callback - La fonction à appeler avec le tableau allAvailableCosmetics.
 */
function onAllCosmeticsLoaded(callback) {
    onAllCosmeticsLoadedCallback = callback;
}

/**
 * Définit la fonction de rappel à appeler lorsque le solde le plus élevé est mis à jour.
 * @param {Function} callback - La fonction à appeler avec le nouveau solde le plus élevé.
 */
function onMaxBalanceUpdated(callback) {
    onMaxBalanceUpdatedCallback = callback;
}

/**
 * Définit la fonction de rappel à appeler lorsque le nombre de jackpots remportés est mis à jour.
 * @param {Function} callback - La fonction à appeler avec le nouveau nombre de jackpots remportés.
 */
function onJackpotWinsUpdated(callback) {
    onJackpotWinsUpdatedCallback = callback;
}

/**
 * Définit la fonction de rappel à appeler lorsque les images générées par l'utilisateur sont mises à jour.
 * @param {Function} callback - La fonction à appeler avec le tableau userGeneratedImages mis à jour.
 */
function onUserImagesUpdated(callback) {
    onUserImagesUpdatedCallback = callback;
}

/**
 * Configure l'écouteur d'état d'authentification Firebase.
 * Cette fonction sera appelée une fois au chargement du script.
 */
function setupFirebaseAuthListener() {
    auth.onAuthStateChanged(async user => {
        if (user) {
            currentUserId = user.uid;
            console.log("FirebaseService: Utilisateur connecté :", user.email, "UID :", user.uid);
            await loadUserData(user.uid); // Charge le solde, le nom d'utilisateur, les cosmétiques actifs, maxBalance, jackpotWins, images générées
            await loadProgressiveJackpot();
            await loadRewardTimestamp();
            // Assurez-vous que loadAllCosmetics est appelé AVANT loadUserCosmetics
            await loadAllCosmetics(); // Charge tous les cosmétiques disponibles en premier
            await loadUserCosmetics(user.uid); // Puis charge les cosmétiques de l'utilisateur
            loadLeaderboard();
            if (onAuthStateChangedCallback) {
                onAuthStateChangedCallback(user);
            }
        } else {
            currentUserId = null;
            username = null;
            balance = 0;
            maxBalance = 0;
            jackpotWins = 0;
            progressiveJackpot = 10000;
            lastRewardTimestamp = 0;
            userCosmetics = [];
            activeCosmetics = {};
            allAvailableCosmetics = [];
            userGeneratedImages = []; // Réinitialiser les images générées lors de la déconnexion
            console.log("FirebaseService: Utilisateur déconnecté.");
            if (onAuthStateChangedCallback) {
                onAuthStateChangedCallback(null);
            }
        }
    });
}

/**
 * Enregistre un nouvel utilisateur avec l'authentification Firebase et crée un profil utilisateur dans Firestore.
 * @param {string} username - Le nom d'utilisateur désiré.
 * @param {string} email - L'email de l'utilisateur.
 * @param {string} password - Le mot de passe de l'utilisateur.
 * @returns {Promise<Object>} Un objet indiquant le succès ou l'erreur.
 */
async function registerUser(username, email, password) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        currentUserId = user.uid;

        // Crée un profil utilisateur dans Firestore
        await db.collection('users').doc(user.uid).set({
            username: username,
            email: email,
            balance: 1000, // Solde initial
            maxBalance: 1000, // Solde max initial
            jackpotWins: 0, // Jackpots remportés initial
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            activeCosmetics: {}, // Initialise les cosmétiques actifs pour les nouveaux utilisateurs
            generatedImages: [] // Nouveau : Initialise le tableau des images générées
        });
        console.log("FirebaseService: Utilisateur enregistré et profil créé :", user.email);
        balance = 1000;
        maxBalance = 1000;
        jackpotWins = 0;
        activeCosmetics = {};
        userGeneratedImages = [];
        return { success: true };
    } catch (error) {
        console.error("FirebaseService: Erreur lors de l'enregistrement de l'utilisateur :", error);
        return { success: false, error: error };
    }
}

/**
 * Connecte un utilisateur existant avec l'authentification Firebase.
 * @param {string} email - L'email de l'utilisateur.
 * @param {string} password - Le mot de passe de l'utilisateur.
 * @returns {Promise<Object>} Un objet indiquant le succès ou l'erreur.
 */
async function signInUser(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        console.log("FirebaseService: Utilisateur connecté.");
        return { success: true };
    } catch (error) {
        console.error("FirebaseService: Erreur lors de la connexion de l'utilisateur :", error);
        return { success: false, error: error };
    }
}

/**
 * Envoie un email de réinitialisation de mot de passe à l'adresse email donnée.
 * @param {string} email - L'adresse email à laquelle envoyer le lien de réinitialisation.
 * @returns {Promise<Object>} Un objet indiquant le succès ou l'erreur.
 */
async function sendPasswordResetEmail(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        console.log("FirebaseService: Email de réinitialisation de mot de passe envoyé à :", email);
        return { success: true };
    } catch (error) {
        console.error("FirebaseService: Erreur lors de l'envoi de l'email de réinitialisation de mot de passe :", error);
        return { success: false, error: error };
    }
}

/**
 * Déconnecte l'utilisateur actuel de l'authentification Firebase.
 * @returns {Promise<void>}
 */
async function logoutUser() {
    try {
        await auth.signOut();
        console.log("FirebaseService: Utilisateur déconnecté.");
    } catch (error) {
        console.error("FirebaseService: Erreur lors de la déconnexion :", error);
    }
}

/**
 * Charge les données de l'utilisateur actuel (solde, nom d'utilisateur, cosmétiques actifs, solde max, jackpots remportés, images générées) depuis Firestore.
 * Cela initialise également les données pour les nouveaux utilisateurs.
 * @param {string} uid - L'UID de l'utilisateur.
 */
async function loadUserData(uid) {
    if (!uid) return;
    try {
        const userDocRef = db.collection('users').doc(uid);
        const doc = await userDocRef.get();
        if (doc.exists) {
            const data = doc.data();
            username = data.username;
            balance = data.balance !== undefined ? data.balance : 1000;
            maxBalance = data.maxBalance !== undefined ? data.maxBalance : balance; // Initialiser maxBalance avec le solde actuel si non défini
            jackpotWins = data.jackpotWins !== undefined ? data.jackpotWins : 0; // Initialiser jackpotWins si non défini
            activeCosmetics = data.activeCosmetics || {};
            userGeneratedImages = data.generatedImages || []; // Charger les images générées
            
            if (onUserDataLoadedCallback) {
                onUserDataLoadedCallback(balance);
            }
            if (onBalanceUpdatedCallback) {
                onBalanceUpdatedCallback(balance);
            }
            if (onMaxBalanceUpdatedCallback) {
                onMaxBalanceUpdatedCallback(maxBalance);
            }
            if (onJackpotWinsUpdatedCallback) {
                onJackpotWinsUpdatedCallback(jackpotWins);
            }
            // onActiveCosmeticsUpdatedCallback et onUserImagesUpdatedCallback sont appelés par loadUserCosmetics qui est appelé après loadUserData.
            // Donc, il n'est pas nécessaire de les appeler ici directement pour activeCosmetics et userGeneratedImages.
            console.log("FirebaseService: Données utilisateur chargées. Solde :", balance, "Solde Max :", maxBalance, "Jackpots remportés :", jackpotWins, "Cosmétiques actifs :", activeCosmetics, "Images générées :", userGeneratedImages.length);
        } else {
            console.log("FirebaseService: Aucune donnée utilisateur trouvée, création d'un nouveau profil utilisateur avec solde par défaut et cosmétiques actifs.");
            balance = 1000;
            maxBalance = 1000;
            jackpotWins = 0;
            activeCosmetics = {};
            userGeneratedImages = [];
            const userEmail = auth.currentUser ? auth.currentUser.email : 'anonymous@example.com'; 
            const defaultUsername = `Joueur${Math.floor(Math.random() * 10000)}`;
            await userDocRef.set({
                username: defaultUsername,
                email: userEmail, 
                balance: balance,
                maxBalance: maxBalance, // Définir maxBalance pour les nouveaux utilisateurs
                jackpotWins: jackpotWins, // Définir jackpotWins pour les nouveaux utilisateurs
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                activeCosmetics: activeCosmetics,
                generatedImages: userGeneratedImages // Définir les images générées pour les nouveaux utilisateurs
            });
            if (onUserDataLoadedCallback) {
                onUserDataLoadedCallback(balance);
            }
            if (onBalanceUpdatedCallback) {
                onBalanceUpdatedCallback(balance);
            }
            if (onMaxBalanceUpdatedCallback) {
                onMaxBalanceUpdatedCallback(maxBalance);
            }
            if (onJackpotWinsUpdatedCallback) {
                onJackpotWinsUpdatedCallback(jackpotWins);
            }
        }
    } catch (error) {
        console.error("FirebaseService: Erreur lors du chargement ou de la création des données utilisateur :", error);
        if (onUserDataLoadedCallback) {
            onUserDataLoadedCallback(balance);
        }
        if (onBalanceUpdatedCallback) {
            onBalanceUpdatedCallback(balance);
        }
        if (onMaxBalanceUpdatedCallback) {
            onMaxBalanceUpdatedCallback(maxBalance);
        }
        if (onJackpotWinsUpdatedCallback) {
            onJackpotWinsUpdatedCallback(jackpotWins);
        }
    }
}

/**
 * Sauvegarde le solde actuel de l'utilisateur dans Firestore.
 * Met également à jour le solde le plus élevé si le nouveau solde est supérieur.
 * @param {number} newBalance - Le nouveau solde à sauvegarder.
 */
async function saveUserBalance(newBalance) {
    if (!currentUserId) {
        console.warn("FirebaseService: Impossible de sauvegarder le solde, aucun utilisateur n'est connecté.");
        return;
    }
    try {
        const updateData = {
            balance: newBalance
        };
        // Mettre à jour maxBalance si le nouveau solde est supérieur
        if (newBalance > maxBalance) {
            updateData.maxBalance = newBalance;
        }

        await db.collection('users').doc(currentUserId).update(updateData);
        balance = newBalance; // Met à jour le solde local
        if (newBalance > maxBalance) {
            maxBalance = newBalance; // Met à jour le solde max local
            if (onMaxBalanceUpdatedCallback) {
                onMaxBalanceUpdatedCallback(maxBalance);
            }
        }
        if (onBalanceUpdatedCallback) {
            onBalanceUpdatedCallback(newBalance);
        }
        console.log("FirebaseService: Solde mis à jour dans Firestore :", newBalance, "Max Balance :", maxBalance);
    } catch (error) {
        console.error("FirebaseService: Erreur lors de la sauvegarde du solde :", error);
    }
}

/**
 * Incrémente le nombre de jackpots remportés par l'utilisateur.
 */
async function incrementUserJackpotWins() {
    if (!currentUserId) {
        console.warn("FirebaseService: Impossible d'incrémenter les jackpots remportés, aucun utilisateur n'est connecté.");
        return;
    }
    try {
        jackpotWins += 1;
        await db.collection('users').doc(currentUserId).update({
            jackpotWins: firebase.firestore.FieldValue.increment(1)
        });
        if (onJackpotWinsUpdatedCallback) {
            onJackpotWinsUpdatedCallback(jackpotWins);
        }
        console.log("FirebaseService: Jackpots remportés mis à jour dans Firestore :", jackpotWins);
    } catch (error) {
        console.error("FirebaseService: Erreur lors de l'incrémentation des jackpots remportés :", error);
    }
}


/**
 * Obtient le solde local de l'utilisateur actuel.
 * @returns {number} Le solde actuel de l'utilisateur.
 */
function getUserBalance() {
    return balance;
}

/**
 * Obtient le solde le plus élevé de l'utilisateur actuel.
 * @returns {number} Le solde le plus élevé de l'utilisateur.
 */
function getUserMaxBalance() {
    return maxBalance;
}

/**
 * Obtient le nombre de jackpots remportés par l'utilisateur actuel.
 * @returns {number} Le nombre de jackpots remportés.
 */
function getUserJackpotWins() {
    return jackpotWins;
}

/**
 * Charge la valeur du jackpot progressif depuis Firestore.
 */
async function loadProgressiveJackpot() {
    try {
        const jackpotDocRef = db.collection('global').doc('jackpot');
        const doc = await jackpotDocRef.get();
        if (doc.exists) {
            const data = doc.data();
            progressiveJackpot = data.amount !== undefined ? data.amount : 10000;
        } else {
            console.log("FirebaseService: Document du jackpot non trouvé, initialisation par défaut.");
            await jackpotDocRef.set({ amount: 10000 });
            progressiveJackpot = 10000;
        }
        if (onJackpotUpdatedCallback) {
            onJackpotUpdatedCallback(progressiveJackpot);
        }
        console.log("FirebaseService: Jackpot chargé :", progressiveJackpot);
    }
    catch (error) {
        console.error("FirebaseService: Erreur lors du chargement du jackpot :", error);
        if (onJackpotUpdatedCallback) {
            onJackpotUpdatedCallback(progressiveJackpot);
        }
    }
}

/**
 * Incrémente le jackpot progressif d'un montant donné.
 * @param {number} amount - Le montant à incrémenter.
 */
function incrementProgressiveJackpot(amount) {
    progressiveJackpot += amount;
    if (onJackpotUpdatedCallback) {
        onJackpotUpdatedCallback(progressiveJackpot);
    }
}

/**
 * Sauvegarde la valeur actuelle du jackpot progressif dans Firestore.
 * @param {number} newJackpotAmount - La nouvelle valeur du jackpot à sauvegarder.
 */
async function saveProgressiveJackpot(newJackpotAmount) {
    try {
        progressiveJackpot = newJackpotAmount;
        await db.collection('global').doc('jackpot').update({ amount: newJackpotAmount });
        if (onJackpotUpdatedCallback) {
            onJackpotUpdatedCallback(newJackpotAmount);
        }
        console.log("FirebaseService: Jackpot sauvegardé :", newJackpotAmount);
    } catch (error) {
        console.error("FirebaseService: Erreur lors de la sauvegarde du jackpot :", error);
    }
}


/**
 * Obtient la valeur actuelle du jackpot progressif.
 * @returns {number} La valeur actuelle du jackpot.
 */
function getProgressiveJackpot() {
    return progressiveJackpot;
}

/**
 * Load the leaderboard data (top users by balance) from Firestore.
 * @returns {Promise<void>}
 */
async function loadLeaderboard() {
    try {
        // IMPORTANT: Removed orderBy to avoid requiring composite indexes for this simple app.
        // Data will be sorted in gameLogic.js after fetching.
        const leaderboardSnapshot = await db.collection('users')
                                                .limit(10) // Still limit to 10 for performance
                                                .get();
            
        const leaderboardData = [];
        leaderboardSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.username && data.balance !== undefined) { // Ensure username and balance exist
                leaderboardData.push({
                    username: data.username,
                    balance: data.balance,
                    userId: doc.id // Add userId for player details modal
                });
            }
        });

        if (onLeaderboardUpdatedCallback) {
            onLeaderboardUpdatedCallback(leaderboardData);
        }
        console.log("FirebaseService: Leaderboard data loaded (unsorted).");
    } catch (error) {
        console.error("FirebaseService: Error loading leaderboard:", error);
        if (onLeaderboardUpdatedCallback) {
            onLeaderboardUpdatedCallback([]); // Pass empty array on error
        }
    }
}


/**
 * Charge l'horodatage de la dernière récompense du document Firestore de l'utilisateur.
 */
async function loadRewardTimestamp() {
    if (!currentUserId) return;
    try {
        const userDocRef = db.collection('users').doc(currentUserId);
        const doc = await userDocRef.get();
        if (doc.exists && doc.data().lastRewardTimestamp !== undefined) {
            lastRewardTimestamp = doc.data().lastRewardTimestamp;
            console.log("FirebaseService: Horodatage de la dernière récompense chargé :", new Date(lastRewardTimestamp));
        } else {
            lastRewardTimestamp = 0;
            console.log("FirebaseService: Aucun horodatage de dernière récompense trouvé, valeur par défaut à 0.");
        }
        if (onRewardDataLoadedCallback) {
            onRewardDataLoadedCallback(lastRewardTimestamp);
        }
    } catch (error) {
        console.error("FirebaseService: Erreur lors du chargement de l'horodatage de la récompense :", error);
        if (onRewardDataLoadedCallback) {
            onRewardDataLoadedCallback(lastRewardTimestamp);
        }
    }
}

/**
 * Sauvegarde l'horodatage de la dernière récompense dans le document Firestore de l'utilisateur.
 * @param {number} timestamp - L'horodatage à sauvegarder.
 */
async function saveRewardTimestamp(timestamp) {
    if (!currentUserId) {
        console.warn("FirebaseService: Impossible de sauvegarder l'horodatage de la récompense, aucun utilisateur n'est connecté.");
        return;
    }
    try {
        await db.collection('users').doc(currentUserId).update({
            lastRewardTimestamp: timestamp
        });
        console.log("FirebaseService: Horodatage de la récompense sauvegardé :", new Date(timestamp));
    }
    catch (error) {
        console.error("FirebaseService: Erreur lors de la sauvegarde de l'horodatage de la récompense :", error);
    }
}

/**
 * Collecte une récompense gratuite, met à jour le solde et l'horodatage.
 * @returns {Promise<number>} Le montant de la récompense collectée, ou 0 si en attente.
 */
async function collectFreeRewardFromService() {
    const now = Date.now();
    if (now < lastRewardTimestamp + REWARD_COOLDOWN_MS) {
        console.log("FirebaseService: La récompense gratuite est toujours en attente.");
        return 0;
    }

    const rewardAmount = Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD + 1)) + MIN_REWARD;
    const newBalance = balance + rewardAmount;

    await saveUserBalance(newBalance);
    lastRewardTimestamp = now;
    await saveRewardTimestamp(lastRewardTimestamp);

    console.log(`FirebaseService: Récompense gratuite collectée : ${rewardAmount}€`);
    return rewardAmount;
}

/**
 * Retourne les constantes de délai de récompense.
 * @returns {Object} Cooldown et plage de récompense.
 */
function getRewardConstants() {
    return {
        REWARD_COOLDOWN_MS: REWARD_COOLDOWN_MS,
        MIN_REWARD: MIN_REWARD,
        MAX_REWARD: MAX_REWARD,
        lastRewardTimestamp: lastRewardTimestamp,
        JACKPOT_INCREMENT_PER_SECOND: JACKPOT_INCREMENT_PER_SECOND // Include the new constant
    };
}

/**
 * Obtient l'ID de l'utilisateur actuel.
 * @returns {string|null} L'UID de l'utilisateur actuel ou null si non connecté.
 */
function getCurrentUserId() {
    return currentUserId;
}

/**
 * Obtient le nom d'utilisateur actuel.
 * @returns {string|null} Le nom d'utilisateur actuel ou null si non connecté.
 */
function getCurrentUsername() {
    return username;
}

/**
 * Charge tous les articles cosmétiques disponibles de la collection 'cosmetics'.
 */
async function loadAllCosmetics() {
    try {
        console.log("FirebaseService: Tentative de chargement de tous les cosmétiques depuis Firestore...");
        const cosmeticsSnapshot = await db.collection('cosmetics').get();
        allAvailableCosmetics = cosmeticsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("FirebaseService: Tous les cosmétiques disponibles chargés avec succès :", allAvailableCosmetics);
        if (onAllCosmeticsLoadedCallback) {
            console.log("FirebaseService: Appel de onAllCosmeticsLoadedCallback avec les données :", allAvailableCosmetics);
            onAllCosmeticsLoadedCallback(allAvailableCosmetics);
        }
    } catch (error) {
        console.error("FirebaseService: Erreur lors du chargement de tous les cosmétiques :", error);
        allAvailableCosmetics = []; 
        if (onAllCosmeticsLoadedCallback) {
            console.log("FirebaseService: Appel de onAllCosmeticsLoadedCallback avec un tableau vide en raison d'une erreur.");
            onAllCosmeticsLoadedCallback([]);
        }
    }
}

/**
 * Charge les cosmétiques possédés par l'utilisateur actuel depuis sa sous-collection 'userCosmetics'.
 * Pour slot_symbol_drop_rate_bonus et slot_bomb_drop_rate_debuff, il somme les
 * valeurs de tous les niveaux possédés pour chaque symbole afin d'obtenir l'effet actif total.
 */
async function loadUserCosmetics(uid) {
    if (!uid) {
        console.warn("FirebaseService: Impossible de charger les cosmétiques utilisateur, aucun ID utilisateur fourni.");
        return;
    }
    try {
        console.log(`FirebaseService: Tentative de chargement des cosmétiques utilisateur pour l'UID : ${uid}`);
        const userCosmeticsSnapshot = await db.collection('users').doc(uid).collection('userCosmetics').get();
        
        userCosmetics = []; // Stocke les ID de tous les cosmétiques possédés
        activeCosmetics = {}; // Stocke l'effet actif (nom de classe ou valeur accumulée)
        
        const accumulatedDropRateEffects = {}; // Stocke la somme des effets de taux de drop pour la logique du jeu

        userCosmeticsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const cosmeticId = doc.id;
            
            userCosmetics.push(cosmeticId); // Ajoute l'ID à la liste des cosmétiques possédés

            if (data.type === 'slot_symbol_drop_rate_bonus' || data.type === 'slot_bomb_drop_rate_debuff') {
                // Accumule l'effet du taux de drop pour la logique du jeu
                if (!accumulatedDropRateEffects[data.symbol]) {
                    accumulatedDropRateEffects[data.symbol] = 0;
                }
                accumulatedDropRateEffects[data.symbol] += (data.value || 0);
            } else {
                // Pour les autres types de cosmétiques, activez-les directement s'ils sont possédés
                const cosmeticDetails = allAvailableCosmetics.find(c => c.id === cosmeticId);
                if (cosmeticDetails) {
                    activeCosmetics[cosmeticDetails.type] = cosmeticDetails.value || cosmeticDetails.id;
                }
            }
        });

        // Après avoir parcouru tous les cosmétiques possédés, appliquez les effets de taux de drop cumulés
        for (const symbol in accumulatedDropRateEffects) {
            activeCosmetics[symbol] = accumulatedDropRateEffects[symbol];
        }

        console.log("FirebaseService: Cosmétiques possédés par l'utilisateur chargés (IDs) :", userCosmetics);
        console.log("FirebaseService: Bonus/malus de taux de drop actifs calculés (accumulés pour la logique) :", activeCosmetics); 
        
        if (onUserCosmeticsUpdatedCallback) {
            onUserCosmeticsUpdatedCallback(userCosmetics);
        }
        if (onActiveCosmeticsUpdatedCallback) {
            onActiveCosmeticsUpdatedCallback(activeCosmetics);
        }
        // Appeler le rappel pour les images générées ici car elles peuvent avoir été mises à jour avec les autres données
        if (onUserImagesUpdatedCallback) {
            onUserImagesUpdatedCallback(userGeneratedImages);
        }


    } catch (error) {
        console.error("FirebaseService: Erreur lors du chargement des cosmétiques utilisateur :", error);
        if (onUserCosmeticsUpdatedCallback) {
            onUserCosmeticsUpdatedCallback([]);
        }
        if (onActiveCosmeticsUpdatedCallback) {
            onActiveCosmeticsUpdatedCallback({}); // Assurez-vous que activeCosmetics est réinitialisé en cas d'erreur
        }
        if (onUserImagesUpdatedCallback) {
            onUserImagesUpdatedCallback([]);
        }
    }
}


/**
 * Obtient la liste des cosmétiques possédés par l'utilisateur actuel.
 * @returns {Array<string>} Un tableau d'identifiants de cosmétiques possédés par l'utilisateur.
 */
function getUserOwnedCosmetics() {
    return userCosmetics;
}

/**
 * Obtient l'objet des cosmétiques actuellement actifs.
 * @returns {Object} Un objet mappant les types de cosmétiques à leurs valeurs actives.
 */
function getActiveCosmetics() {
    return activeCosmetics;
}

/**
 * Achète un article cosmétique.
 * @param {Object} cosmetic - L'objet cosmétique à acheter ({id, name, price, type, value, level (facultatif), symbol (facultatif)}).
 * @returns {Promise<Object>} Un objet indiquant le succès ou l'erreur.
 */
async function purchaseCosmetic(cosmetic) {
    if (!currentUserId) {
        return { success: false, error: { message: "Utilisateur non connecté." } };
    }

    const userDocRef = db.collection('users').doc(currentUserId);
    const userCosmeticDocRef = userDocRef.collection('userCosmetics').doc(cosmetic.id);

    let highestOwnedLevel = 0; // Initialiser en dehors de la transaction

    try {
        // --- Récupérer le niveau le plus élevé AVANT la transaction ---
        // Ceci est une solution si transaction.get(query) pose problème avec la version du SDK.
        // NOTE : Cela introduit une condition de concurrence potentielle pour la vérification du niveau.
        // Pour la production, assurez-vous que vos règles de sécurité Firebase atténuent cela
        // ou utilisez les fonctions Cloud.
        if (cosmetic.type === 'slot_symbol_drop_rate_bonus' || cosmetic.type === 'slot_bomb_drop_rate_debuff') {
            const existingUserCosmeticsSnapshot = await db.collection('users').doc(currentUserId)
                                                         .collection('userCosmetics')
                                                         .where('symbol', '==', cosmetic.symbol)
                                                         .get(); // Utilisation de .get() en dehors de la transaction
            existingUserCosmeticsSnapshot.forEach(doc => {
                const data = doc.data();
                if ((data.type === 'slot_symbol_drop_rate_bonus' || data.type === 'slot_bomb_drop_rate_debuff') && data.level > highestOwnedLevel) {
                    highestOwnedLevel = data.level;
                }
            });
        } else {
            // Pour les cosmétiques non basés sur le niveau, vérifiez s'ils sont déjà possédés AVANT la transaction
            if (userCosmetics.includes(cosmetic.id)) {
                return { success: false, error: { message: "Vous possédez déjà cet article." } };
            }
        }

        // --- Démarrer la transaction ---
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists) {
                throw new Error("Document utilisateur introuvable.");
            }

            const currentBalance = userDoc.data().balance;
            if (currentBalance < cosmetic.price) {
                throw new Error("Solde insuffisant.");
            }

            // --- Re-vérifier le niveau à l'intérieur de la transaction, mais en utilisant le highestOwnedLevel pré-récupéré ---
            // Cette nouvelle vérification est principalement pour l'intégrité, mais la valeur de highestOwnedLevel
            // provient d'avant la transaction.
            if (cosmetic.type === 'slot_symbol_drop_rate_bonus' || cosmetic.type === 'slot_bomb_drop_rate_debuff') {
                if (cosmetic.level && cosmetic.level !== (highestOwnedLevel + 1)) {
                    throw new Error(`Vous devez acheter le niveau ${highestOwnedLevel + 1} avant celui-ci.`);
                }
            }
            // La vérification de la possession pour les cosmétiques non basés sur le niveau est maintenant effectuée en dehors de la transaction.

            transaction.update(userDocRef, { balance: currentBalance - cosmetic.price });
            transaction.set(userCosmeticDocRef, {
                purchasedAt: firebase.firestore.FieldValue.serverTimestamp(),
                name: cosmetic.name, // Sauvegarder le nom pour un affichage facile
                type: cosmetic.type,
                value: cosmetic.value,
                level: cosmetic.level || 0,
                symbol: cosmetic.symbol || ''
            });
        });

        // Met à jour le solde local
        balance -= cosmetic.price;
        if (onBalanceUpdatedCallback) {
            onBalanceUpdatedCallback(balance);
        }

        // Après un achat réussi, recharge les cosmétiques de l'utilisateur pour s'assurer que activeCosmetics est recalculé correctement
        // Cela déclenchera onUserCosmeticsUpdatedCallback et onActiveCosmeticsUpdatedCallback
        await loadUserCosmetics(currentUserId); 

        console.log(`FirebaseService: Cosmétique ${cosmetic.name} acheté. Nouveau solde : ${balance}. Rechargement des cosmétiques.`);
        return { success: true };
    } catch (error) {
        console.error("FirebaseService: Erreur lors de l'achat du cosmétique :", error);
        return { success: false, error: { message: error.message } };
    }
}

/**
 * Active un article cosmétique pour l'utilisateur actuel.
 * Pour les types 'slot_symbol_drop_rate_bonus' et 'slot_bomb_drop_rate_debuff', l'activation est gérée à l'achat.
 * Cette fonction reste pour les autres types qui pourraient nécessiter une activation explicite.
 * @param {Object} cosmetic - L'objet cosmétique à activer ({id, name, type, value, level (facultatif), symbol (facultatif)}).
 * @returns {Promise<Object>} Un objet indiquant le succès ou l'erreur.
 */
async function activateCosmetic(cosmetic) {
    if (!currentUserId) {
        return { success: false, error: { message: "Utilisateur non connecté." } };
    }

    if (!userCosmetics.includes(cosmetic.id)) {
        return { success: false, error: { message: "Vous ne possédez pas cet article." } };
    }

    if (cosmetic.type === 'slot_symbol_drop_rate_bonus' || cosmetic.type === 'slot_bomb_drop_rate_debuff') {
        console.log(`FirebaseService: Tentative d'activation de ${cosmetic.type}. Ceux-ci sont auto-actifs.`);
        return { success: true };
    }
    
    const userDocRef = db.collection('users').doc(currentUserId);
    try {
        const newActiveCosmetics = { ...activeCosmetics };

        const currentActiveForTypeKey = Object.keys(activeCosmetics).find(activeKey => {
            const activeCosmeticInList = allAvailableCosmetics.find(c => c.id === activeKey);
            return activeCosmeticInList && activeCosmeticInList.type === cosmetic.type;
        });

        if (currentActiveForTypeKey) {
            delete newActiveCosmetics[currentActiveForTypeKey];
        }
        
        newActiveCosmetics[cosmetic.type] = cosmetic.value || cosmetic.id; // Stocke la valeur du cosmétique sous sa clé de type

        await userDocRef.update({ activeCosmetics: newActiveCosmetics });

        activeCosmetics = newActiveCosmetics;
        if (onActiveCosmeticsUpdatedCallback) {
            onActiveCosmeticsUpdatedCallback(activeCosmetics);
        }
        console.log(`FirebaseService: Cosmétique ${cosmetic.name} activé (type : ${cosmetic.type}, valeur : ${cosmetic.value || cosmetic.id})`);
        return { success: true };
    } catch (error) {
        console.error("FirebaseService: Erreur lors de l'activation du cosmétique :", error);
        return { success: false, error: { message: error.message } };
    }
}


/**
 * Désactive un article cosmétique pour l'utilisateur actuel.
 * Pour les types 'slot_symbol_drop_rate_bonus' et 'slot_bomb_drop_rate_debuff', la désactivation n'est pas applicable car ce sont des bonus passifs.
 * Cette fonction reste pour les autres types qui pourraient nécessiter une désactivation explicite.
 * @param {string} cosmeticId - L'ID du cosmétique à désactiver.
 * @returns {Promise<Object>} Un objet indiquant le succès ou l'erreur.
 */
async function deactivateCosmetic(cosmeticId) {
    if (!currentUserId) {
        return { success: false, error: { message: "Utilisateur non connecté." } };
    }

    const cosmeticToDeactivate = allAvailableCosmetics.find(c => c.id === cosmeticId);
    if (!cosmeticToDeactivate) {
        return { success: false, error: { message: "Cosmétique introuvable pour la désactivation." } }; 
    }

    if (cosmeticToDeactivate.type === 'slot_symbol_drop_rate_bonus' || cosmeticToDeactivate.type === 'slot_bomb_drop_rate_debuff') {
        console.log(`FirebaseService: Tentative de désactivation de ${cosmeticToDeactivate.type}. Ceux-ci sont toujours actifs une fois achetés.`);
        return { success: true };
    }

    const userDocRef = db.collection('users').doc(currentUserId);
    try {
        const newActiveCosmetics = { ...activeCosmetics };
        
        // Supprime le cosmétique actif en utilisant son type comme clé
        if (newActiveCosmetics[cosmeticToDeactivate.type] !== undefined) {
             delete newActiveCosmetics[cosmeticToDeactivate.type];
        } else {
            console.warn(`FirebaseService: Le cosmétique de type ${cosmeticToDeactivate.type} n'a pas été trouvé comme actif.`);
            return { success: true };
        }
        
        await userDocRef.update({ activeCosmetics: newActiveCosmetics });

        activeCosmetics = newActiveCosmetics;
        if (onActiveCosmeticsUpdatedCallback) {
            onActiveCosmeticsUpdatedCallback(activeCosmetics);
        }
        console.log(`FirebaseService: Cosmétique ${cosmeticToDeactivate.name} désactivé`);
        return { success: true };
    } catch (error) {
        console.error("FirebaseService: Erreur lors de la désactivation du cosmétique :", error);
        return { success: false, error: { message: error.message } };
    }
}


/**
 * Obtient tous les articles cosmétiques disponibles.
 * @returns {Array<Object>} Un tableau de tous les objets cosmétiques disponibles.
 */
function getAllAvailableCosmetics() {
    if (!Array.isArray(allAvailableCosmetics)) {
        console.warn("FirebaseService: allAvailableCosmetics n'était pas un tableau. Réinitialisation à un tableau vide.");
        allAvailableCosmetics = [];
    }
    return allAvailableCosmetics;
}

/**
 * Recherche des utilisateurs par nom d'utilisateur.
 * @param {string} usernameQuery - La chaîne de caractères à rechercher dans les noms d'utilisateur.
 * @returns {Promise<Array<Object>>} Un tableau d'objets utilisateur trouvés.
 */
async function searchUsersByUsername(usernameQuery) {
    if (!usernameQuery || usernameQuery.trim() === "") {
        console.log("FirebaseService: Query de recherche vide.");
        return [];
    }
    try {
        console.log(`FirebaseService: Recherche d'utilisateurs avec la requête : "${usernameQuery}"`);
        const usersRef = db.collection('users');
        // Firebase Firestore ne prend pas en charge les requêtes "contains" ou les regex complètes.
        // Nous allons faire une recherche par préfixe et filtrer côté client.
        const querySnapshot = await usersRef
            .where('username', '>=', usernameQuery)
            .where('username', '<=', usernameQuery + '\uf8ff') // Caractère Unicode pour une recherche "commence par"
            .limit(10) // Limiter les résultats pour la performance
            .get();

        const results = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            // Filtrer davantage côté client si la recherche par préfixe n'est pas suffisante
            // Utiliser toLowerCase pour une recherche insensible à la casse
            if (data.username && data.username.toLowerCase().includes(usernameQuery.toLowerCase())) {
                results.push({
                    userId: doc.id,
                    username: data.username,
                    balance: data.balance,
                    maxBalance: data.maxBalance,
                    jackpotWins: data.jackpotWins
                });
            }
        });
        console.log("FirebaseService: Résultats de la recherche d'utilisateurs :", results);
        return results;
    }
    catch (error) {
        console.error("FirebaseService: Erreur lors de la recherche d'utilisateurs par nom :", error);
        return [];
    }
}

/**
 * Récupère les détails complets d'un utilisateur par son ID.
 * Inclut le solde, le solde max, les jackpots remportés, les cosmétiques possédés et actifs, et les images générées.
 * @param {string} userId - L'ID de l'utilisateur à récupérer.
 * @returns {Promise<Object|null>} Un objet utilisateur détaillé ou null si non trouvé.
 */
async function getUserDetails(userId) {
    if (!userId) {
        console.warn("FirebaseService: Impossible de récupérer les détails de l'utilisateur, aucun ID utilisateur fourni.");
        return null;
    }
    try {
        console.log(`FirebaseService: Récupération des détails pour l'utilisateur ID : ${userId}`);
        const userDocRef = db.collection('users').doc(userId);
        const userDoc = await userDocRef.get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Log the raw data to check if it's being fetched correctly
            console.log(`FirebaseService: Raw user data for ${userId}:`, userData);

            // Récupérer les images générées par cet utilisateur
            const userGeneratedImages = userData.generatedImages || [];

            return {
                userId: userId,
                username: userData.username,
                balance: userData.balance,
                maxBalance: userData.maxBalance || userData.balance, // Utiliser le solde actuel si maxBalance n'est pas défini
                jackpotWins: userData.jackpotWins || 0, // Utiliser 0 si jackpotWins n'est pas défini
                generatedImages: userGeneratedImages // Inclure les images générées
            };
        } else {
            console.log("FirebaseService: Document utilisateur non trouvé pour l'ID :", userId);
            return null;
        }
    } catch (error) {
        console.error("FirebaseService: Erreur lors de la récupération des détails de l'utilisateur :", error);
        return null;
    }
}

/**
 * Récupère les images générées possédées par l'utilisateur.
 * @returns {Array<Object>} Un tableau d'objets image ({id, name, url, purchasedAt}).
 */
function getUserGeneratedImages() {
    return userGeneratedImages;
}

/**
 * Stocke une image Base64 dans Firebase Storage et ajoute la référence à Firestore.
 * @param {string} base64Image - L'image au format Base64 (incluant le préfixe data:image/...).
 * @param {string} imageName - Le nom de l'image (ex: "Trophée Cosmique").
 * @param {number} cost - Le coût de l'image.
 * @returns {Promise<Object>} Un objet indiquant le succès et l'URL de l'image ou l'erreur.
 */
async function storeGeneratedImage(base64Image, imageName, cost) {
    if (!currentUserId) {
        return { success: false, error: { message: "Utilisateur non connecté." } };
    }

    const imageId = `${imageName.replace(/\s/g, '_')}_${Date.now()}`;
    const storageRef = storage.ref(`user_generated_trophies/${currentUserId}/${imageId}.png`);
    const userDocRef = db.collection('users').doc(currentUserId);

    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists) {
                throw new Error("Document utilisateur introuvable.");
            }

            const currentBalance = userDoc.data().balance;
            if (currentBalance < cost) {
                throw new Error("Solde insuffisant pour acheter cette image.");
            }

            // Déduire le coût du solde
            transaction.update(userDocRef, { balance: currentBalance - cost });

            // Télécharger l'image vers Storage
            const snapshot = await storageRef.putString(base64Image, 'data_url');
            const downloadURL = await snapshot.ref.getDownloadURL();

            // Ajouter la référence de l'image au tableau 'generatedImages' dans Firestore
            const newImageEntry = {
                id: imageId,
                name: imageName,
                url: downloadURL,
                purchasedAt: Date.now(), 
                cost: cost
            };
            
            // Assurez-vous que generatedImages est un tableau dans la BDD
            const existingImages = userDoc.data().generatedImages || [];
            transaction.update(userDocRef, {
                generatedImages: [...existingImages, newImageEntry]
            });
            
            // Mettre à jour le solde local et la liste des images
            balance = currentBalance - cost;
            userGeneratedImages.push(newImageEntry);
            
            if (onBalanceUpdatedCallback) {
                onBalanceUpdatedCallback(balance);
            }
            if (onUserImagesUpdatedCallback) {
                onUserImagesUpdatedCallback(userGeneratedImages);
            }

            console.log("FirebaseService: Image générée stockée et référence ajoutée à Firestore. URL:", downloadURL);
            return { success: true, url: downloadURL };
        });
        return { success: true }; // Le résultat de la transaction sera géré par les callbacks
    } catch (error) {
        console.error("FirebaseService: Erreur lors du stockage de l'image générée :", error);
        return { success: false, error: { message: error.message } };
    }
}


// S'assure que l'écouteur d'authentification est configuré une fois le script chargé
setupFirebaseAuthListener();

// Expose les fonctions globalement pour que gameLogic.js et shop.js puissent les utiliser
window.firebaseService = {
    setAuthStateChangedCallback,
    setUserDataLoadedCallback,
    setBalanceUpdatedCallback,
    setJackpotUpdatedCallback,
    setLeaderboardUpdatedCallback,
    setRewardDataLoadedCallback,
    onUserCosmeticsUpdated,
    onActiveCosmeticsUpdated,
    onAllCosmeticsLoaded,
    onMaxBalanceUpdated,
    onJackpotWinsUpdated,
    onUserImagesUpdated, // Expose le nouveau rappel
    setupFirebaseAuthListener,
    signInUser,
    registerUser,
    sendPasswordResetEmail,
    logoutUser,
    saveUserBalance,
    incrementUserJackpotWins,
    getUserBalance,
    getUserMaxBalance,
    getUserJackpotWins,
    saveProgressiveJackpot,
    incrementProgressiveJackpot,
    getProgressiveJackpot,
    loadLeaderboard,
    collectFreeRewardFromService,
    getRewardConstants,
    getCurrentUserId,
    getCurrentUsername,
    loadAllCosmetics,
    loadUserCosmetics,
    getUserOwnedCosmetics,
    getActiveCosmetics,
    purchaseCosmetic,
    activateCosmetic,
    deactivateCosmetic,
    getAllAvailableCosmetics,
    searchUsersByUsername,
    getUserDetails,
    storeGeneratedImage, // Expose la nouvelle fonction de stockage d'image
    getUserGeneratedImages // Expose la fonction pour obtenir les images générées
};
