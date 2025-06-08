// firebaseService.js
// This file handles all interactions with Firebase Authentication and Firestore.

// Global Firebase instances (initialized in index.html)
// 'app', 'auth', and 'db' are assumed to be globally available from index.html
// after the Firebase SDKs are loaded.

let currentUserId = null; // Stores the current user's UID
let balance = 0; // Current user's balance
let progressiveJackpot = 10000; // Progressive jackpot value
let lastRewardTimestamp = 0; // Timestamp of the last collected free reward
let userCosmetics = []; // Stores IDs of cosmetics owned by the user
let activeCosmetics = {}; // Stores currently active cosmetics (e.g., {'slot_theme': 'gold_theme_class'})
let allAvailableCosmetics = []; // Stores all cosmetics loaded from Firestore

const JACKPOT_INCREMENT_PER_SECOND = 5; // Jackpot increment per second
const REWARD_COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
const MIN_REWARD = 500;
const MAX_REWARD = 3000;

// Callback functions to notify gameLogic.js about data changes or auth state
let onAuthStateChangedCallback = null;
let onUserDataLoadedCallback = null;
let onBalanceUpdatedCallback = null;
let onJackpotUpdatedCallback = null;
let onLeaderboardUpdatedCallback = null;
let onRewardDataLoadedCallback = null;
let onUserCosmeticsUpdatedCallback = null; // New callback for user cosmetics
let onActiveCosmeticsUpdatedCallback = null; // New callback for active cosmetics
let onAllCosmeticsLoadedCallback = null; // New callback for all available cosmetics

/**
 * Sets the callback function to be called when the authentication state changes.
 * @param {Function} callback - The function to call with the user object or null.
 */
function setAuthStateChangedCallback(callback) {
    onAuthStateChangedCallback = callback;
}

/**
 * Sets the callback function to be called when user data is loaded.
 * @param {Function} callback - The function to call with the loaded balance.
 */
function setUserDataLoadedCallback(callback) {
    onUserDataLoadedCallback = callback;
}

/**
 * Sets the callback function to be called when the user's balance is updated.
 * @param {Function} callback - The function to call with the new balance.
 */
function setBalanceUpdatedCallback(callback) {
    onBalanceUpdatedCallback = callback;
}

/**
 * Sets the callback function to be called when the progressive jackpot is updated.
 * @param {Function} callback - The function to call with the new jackpot value.
 */
function setJackpotUpdatedCallback(callback) {
    onJackpotUpdatedCallback = callback;
}

/**
 * Sets the callback function to be called when the leaderboard data is updated.
 * @param {Function} callback - The function to call with the leaderboard data.
 */
function setLeaderboardUpdatedCallback(callback) {
    onLeaderboardUpdatedCallback = callback;
}

/**
 * Sets the callback function to be called when reward data is loaded.
 * @param {Function} callback - The function to call with the last reward timestamp.
 */
function setRewardDataLoadedCallback(callback) {
    onRewardDataLoadedCallback = callback;
}

/**
 * Sets the callback function to be called when user-owned cosmetics are updated.
 * @param {Function} callback - The function to call with the updated userCosmetics array.
 */
function onUserCosmeticsUpdated(callback) {
    onUserCosmeticsUpdatedCallback = callback;
}

/**
 * Sets the callback function to be called when active cosmetics are updated.
 * @param {Function} callback - The function to call with the updated activeCosmetics object.
 */
function onActiveCosmeticsUpdated(callback) {
    onActiveCosmeticsUpdatedCallback = callback;
}

/**
 * Sets the callback function to be called when all available cosmetics are loaded.
 * @param {Function} callback - The function to call with the allAvailableCosmetics array.
 */
function onAllCosmeticsLoaded(callback) {
    onAllCosmeticsLoadedCallback = callback;
}

/**
 * Sets up the Firebase Authentication state listener.
 * This function will be called once when the script loads.
 */
function setupFirebaseAuthListener() {
    auth.onAuthStateChanged(async user => {
        if (user) {
            currentUserId = user.uid;
            console.log("FirebaseService: User logged in:", user.email, "UID:", user.uid);
            await loadUserData(user.uid); // Load balance, username, and active cosmetics
            await loadProgressiveJackpot();
            await loadRewardTimestamp(); // Load the reward timestamp
            await loadUserCosmetics(user.uid); // Load owned cosmetics
            await loadAllCosmetics(); // Load all available cosmetics
            loadLeaderboard(); // Load the leaderboard
            // Notify gameLogic about auth state change (user logged in)
            if (onAuthStateChangedCallback) {
                onAuthStateChangedCallback(user);
            }
        } else {
            currentUserId = null;
            balance = 0; // Reset balance on logout
            progressiveJackpot = 10000; // Reset jackpot display on logout
            lastRewardTimestamp = 0; // Reset reward timestamp on logout
            userCosmetics = []; // Clear owned cosmetics
            activeCosmetics = {}; // Clear active cosmetics
            allAvailableCosmetics = []; // Clear available cosmetics
            console.log("FirebaseService: User logged out.");
            // Notify gameLogic about auth state change (user logged out)
            if (onAuthStateChangedCallback) {
                onAuthStateChangedCallback(null);
            }
        }
    });
}

/**
 * Registers a new user with Firebase Authentication and creates a user profile in Firestore.
 * @param {string} username - The desired username.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<Object>} An object indicating success or error.
 */
async function registerUser(username, email, password) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        currentUserId = user.uid;

        // Create user profile in Firestore
        await db.collection('users').doc(user.uid).set({
            username: username,
            email: email,
            balance: 1000, // Initial balance
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            activeCosmetics: {} // Initialize active cosmetics for new users
        });
        console.log("FirebaseService: User registered and profile created:", user.email);
        balance = 1000; // Set local balance
        activeCosmetics = {}; // Set local active cosmetics
        return { success: true };
    } catch (error) {
        console.error("FirebaseService: Error registering user:", error);
        return { success: false, error: error };
    }
}

/**
 * Signs in an existing user with Firebase Authentication.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<Object>} An object indicating success or error.
 */
async function signInUser(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        console.log("FirebaseService: User signed in.");
        return { success: true };
    } catch (error) {
        console.error("FirebaseService: Error signing in user:", error);
        return { success: false, error: error };
    }
}

/**
 * Sends a password reset email to the given email address.
 * @param {string} email - The email address to send the reset link to.
 * @returns {Promise<Object>} An object indicating success or error.
 */
async function sendPasswordResetEmail(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        console.log("FirebaseService: Password reset email sent to:", email);
        return { success: true };
    } catch (error) {
        console.error("FirebaseService: Error sending password reset email:", error);
        return { success: false, error: error };
    }
}

/**
 * Logs out the current user from Firebase Authentication.
 * @returns {Promise<void>}
 */
async function logoutUser() {
    try {
        await auth.signOut();
        console.log("FirebaseService: User logged out.");
    } catch (error) {
        console.error("FirebaseService: Error logging out:", error);
    }
}

/**
 * Loads the current user's data (balance, username, active cosmetics) from Firestore.
 * This also initializes balance for new users.
 * @param {string} uid - The user's UID.
 */
async function loadUserData(uid) {
    if (!uid) return;
    try {
        const userDocRef = db.collection('users').doc(uid);
        const doc = await userDocRef.get();
        if (doc.exists) {
            const data = doc.data();
            balance = data.balance !== undefined ? data.balance : 1000; // Default if balance not set
            activeCosmetics = data.activeCosmetics || {}; // Load active cosmetics
            
            if (onUserDataLoadedCallback) {
                onUserDataLoadedCallback(balance); // Notify gameLogic about initial balance
            }
            if (onBalanceUpdatedCallback) {
                onBalanceUpdatedCallback(balance); // Also update the display
            }
            if (onActiveCosmeticsUpdatedCallback) {
                onActiveCosmeticsUpdatedCallback(activeCosmetics); // Notify gameLogic about active cosmetics
            }
            console.log("FirebaseService: User data loaded. Balance:", balance, "Active Cosmetics:", activeCosmetics);
        } else {
            console.log("FirebaseService: No user data found, creating new user profile with default balance and active cosmetics.");
            balance = 1000; // Default starting balance
            activeCosmetics = {}; // Default empty active cosmetics
            const userEmail = auth.currentUser ? auth.currentUser.email : 'anonymous@example.com'; 
            const defaultUsername = `Player${Math.floor(Math.random() * 10000)}`;
            await userDocRef.set({
                username: defaultUsername,
                email: userEmail, 
                balance: balance,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                activeCosmetics: activeCosmetics
            });
            if (onUserDataLoadedCallback) {
                onUserDataLoadedCallback(balance);
            }
            if (onBalanceUpdatedCallback) {
                onBalanceUpdatedCallback(balance);
            }
            if (onActiveCosmeticsUpdatedCallback) {
                onActiveCosmeticsUpdatedCallback(activeCosmetics);
            }
        }
    } catch (error) {
        console.error("FirebaseService: Error loading or creating user data:", error);
        if (onUserDataLoadedCallback) {
            onUserDataLoadedCallback(balance);
        }
        if (onBalanceUpdatedCallback) {
            onBalanceUpdatedCallback(balance);
        }
        if (onActiveCosmeticsUpdatedCallback) {
            onActiveCosmeticsUpdatedCallback(activeCosmetics);
        }
    }
}

/**
 * Saves the current user's balance to Firestore.
 * @param {number} newBalance - The new balance to save.
 */
async function saveUserBalance(newBalance) {
    if (!currentUserId) {
        console.warn("FirebaseService: Cannot save balance, no user is logged in.");
        return;
    }
    try {
        await db.collection('users').doc(currentUserId).update({
            balance: newBalance
        });
        balance = newBalance; // Update local balance
        if (onBalanceUpdatedCallback) {
            onBalanceUpdatedCallback(newBalance); // Notify gameLogic to update UI
        }
        console.log("FirebaseService: Balance updated in Firestore:", newBalance);
    } catch (error) {
        console.error("FirebaseService: Error saving balance:", error);
    }
}

/**
 * Gets the current user's local balance.
 * @returns {number} The current user's balance.
 */
function getUserBalance() {
    return balance;
}

/**
 * Loads the progressive jackpot value from Firestore.
 */
async function loadProgressiveJackpot() {
    try {
        const jackpotDocRef = db.collection('global').doc('jackpot');
        const doc = await jackpotDocRef.get();
        if (doc.exists) {
            const data = doc.data();
            progressiveJackpot = data.amount !== undefined ? data.amount : 10000;
        } else {
            console.log("FirebaseService: Jackpot document not found, initializing to default.");
            // Create jackpot document if it doesn't exist
            await jackpotDocRef.set({ amount: 10000 });
            progressiveJackpot = 10000;
        }
        if (onJackpotUpdatedCallback) {
            onJackpotUpdatedCallback(progressiveJackpot);
        }
        console.log("FirebaseService: Jackpot loaded:", progressiveJackpot);
    }
    catch (error) {
        console.error("FirebaseService: Error loading jackpot:", error);
        if (onJackpotUpdatedCallback) {
            onJackpotUpdatedCallback(progressiveJackpot); // Pass current/default jackpot on error
        }
    }
}

/**
 * Increments the progressive jackpot by a given amount.
 * @param {number} amount - The amount to increment by.
 */
function incrementProgressiveJackpot(amount) {
    progressiveJackpot += amount;
    if (onJackpotUpdatedCallback) {
        onJackpotUpdatedCallback(progressiveJackpot);
    }
}

/**
 * Saves the current progressive jackpot value to Firestore.
 * @param {number} newJackpotAmount - The new jackpot value to save.
 */
async function saveProgressiveJackpot(newJackpotAmount) {
    try {
        progressiveJackpot = newJackpotAmount; // Update local jackpot value
        await db.collection('global').doc('jackpot').update({ amount: newJackpotAmount });
        if (onJackpotUpdatedCallback) {
            onJackpotUpdatedCallback(newJackpotAmount); // Notify gameLogic to update UI
        }
        console.log("FirebaseService: Jackpot saved:", newJackpotAmount);
    } catch (error) {
        console.error("FirebaseService: Error saving jackpot:", error);
    }
}


/**
 * Gets the current progressive jackpot value.
 * @returns {number} The current jackpot value.
 */
function getProgressiveJackpot() {
    return progressiveJackpot;
}

/**
 * Loads the leaderboard data (top users by balance) from Firestore.
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
                    balance: data.balance
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
 * Loads the last reward timestamp from the user's Firestore document.
 */
async function loadRewardTimestamp() {
    if (!currentUserId) return;
    try {
        const userDocRef = db.collection('users').doc(currentUserId);
        const doc = await userDocRef.get();
        if (doc.exists && doc.data().lastRewardTimestamp !== undefined) {
            lastRewardTimestamp = doc.data().lastRewardTimestamp;
            console.log("FirebaseService: Last reward timestamp loaded:", new Date(lastRewardTimestamp));
        } else {
            lastRewardTimestamp = 0; // No timestamp found, treat as never collected
            console.log("FirebaseService: No last reward timestamp found, defaulting to 0.");
        }
        if (onRewardDataLoadedCallback) {
            onRewardDataLoadedCallback(lastRewardTimestamp);
        }
    } catch (error) {
        console.error("FirebaseService: Error loading reward timestamp:", error);
        if (onRewardDataLoadedCallback) {
            onRewardDataLoadedCallback(lastRewardTimestamp); // Pass current/default on error
        }
    }
}

/**
 * Saves the last reward timestamp to the user's Firestore document.
 * @param {number} timestamp - The timestamp to save.
 */
async function saveRewardTimestamp(timestamp) {
    if (!currentUserId) {
        console.warn("FirebaseService: Cannot save reward timestamp, no user is logged in.");
        return;
    }
    try {
        await db.collection('users').doc(currentUserId).update({
            lastRewardTimestamp: timestamp
        });
        console.log("FirebaseService: Reward timestamp saved:", new Date(timestamp));
    } catch (error) {
        console.error("FirebaseService: Error saving reward timestamp:", error);
    }
}

/**
 * Collects a free reward, updates balance and timestamp.
 * @returns {Promise<number>} The amount of reward collected, or 0 if on cooldown.
 */
async function collectFreeRewardFromService() {
    const now = Date.now();
    if (now < lastRewardTimestamp + REWARD_COOLDOWN_MS) {
        console.log("FirebaseService: Free reward is still on cooldown.");
        return 0; // Still on cooldown
    }

    const rewardAmount = Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD + 1)) + MIN_REWARD;
    const newBalance = balance + rewardAmount; // Calculate new balance

    await saveUserBalance(newBalance); // Save updated balance
    lastRewardTimestamp = now; // Update local timestamp
    await saveRewardTimestamp(lastRewardTimestamp); // Save new reward timestamp

    console.log(`FirebaseService: Collected free reward: ${rewardAmount}€`);
    return rewardAmount;
}

/**
 * Returns reward cooldown constants.
 * @returns {Object} Cooldown and reward range.
 */
function getRewardConstants() {
    return {
        REWARD_COOLDOWN_MS: REWARD_COOLDOWN_MS,
        MIN_REWARD: MIN_REWARD,
        MAX_REWARD: MAX_REWARD,
        lastRewardTimestamp: lastRewardTimestamp // Current timestamp for countdown
    };
}

/**
 * Gets the current user ID.
 * @returns {string|null} The current user's UID or null if not logged in.
 */
function getCurrentUserId() {
    return currentUserId;
}

/**
 * Loads all available cosmetic items from the 'cosmetics' collection.
 */
async function loadAllCosmetics() {
    try {
        console.log("FirebaseService: Attempting to load all cosmetics from Firestore...");
        const cosmeticsSnapshot = await db.collection('cosmetics').get();
        allAvailableCosmetics = cosmeticsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("FirebaseService: All available cosmetics loaded successfully:", allAvailableCosmetics); // Crucial log
        if (onAllCosmeticsLoadedCallback) {
            console.log("FirebaseService: Calling onAllCosmeticsLoadedCallback with data:", allAvailableCosmetics); // NEW LOG
            onAllCosmeticsLoadedCallback(allAvailableCosmetics);
        }
    } catch (error) {
        console.error("FirebaseService: Error loading all cosmetics:", error);
        allAvailableCosmetics = []; 
        if (onAllCosmeticsLoadedCallback) {
            console.log("FirebaseService: Calling onAllCosmeticsLoadedCallback with empty array due to error."); // NEW LOG
            onAllCosmeticsLoadedCallback([]); // Pass empty array on error
        }
    }
}

/**
 * Loads cosmetics owned by the current user from their 'userCosmetics' sub-collection.
 * For slot_symbol_drop_rate_bonus and slot_bomb_drop_rate_debuff, it stores the highest level owned for each.
 */
async function loadUserCosmetics(uid) {
    if (!uid) {
        console.warn("FirebaseService: Cannot load user cosmetics, no user ID provided.");
        return;
    }
    try {
        console.log(`FirebaseService: Attempting to load user cosmetics for UID: ${uid}`);
        const userCosmeticsSnapshot = await db.collection('users').doc(uid).collection('userCosmetics').get();
        
        userCosmetics = []; // Reset array
        activeCosmetics = {}; // Reset active cosmetics object

        const ownedSymbolDropRates = {}; // Object to store highest level for each symbol drop rate
        const ownedBombDropRates = {}; // Object to store highest level for bomb drop rate debuff

        userCosmeticsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const cosmeticId = doc.id;
            
            if (data.type === 'slot_symbol_drop_rate_bonus') {
                if (!ownedSymbolDropRates[data.symbol] || data.level > ownedSymbolDropRates[data.symbol].level) {
                    ownedSymbolDropRates[data.symbol] = {
                        id: cosmeticId,
                        level: data.level,
                        value: data.value,
                        type: data.type
                    };
                }
            } else if (data.type === 'slot_bomb_drop_rate_debuff') {
                if (!ownedBombDropRates[data.symbol] || data.level > ownedBombDropRates[data.symbol].level) {
                    ownedBombDropRates[data.symbol] = {
                        id: cosmeticId,
                        level: data.level,
                        value: data.value, // This value is negative for debuffs
                        type: data.type
                    };
                }
            } else {
                // For other cosmetic types, just store the ID
                userCosmetics.push(cosmeticId);
                // And mark them as active if they are visual/functional toggles
                // The `activeCosmetics` object should contain the cosmetic's actual value or ID
                // for types that need to be "applied" (e.g., slot_theme: 'gold_theme_class')
                const cosmeticDetails = allAvailableCosmetics.find(c => c.id === cosmeticId);
                if (cosmeticDetails) {
                    activeCosmetics[cosmeticDetails.type] = cosmeticDetails.value || cosmeticDetails.id;
                }
            }
        });

        // Add the highest-level drop rate boosts (by their ID) to the main userCosmetics array
        for (const symbol in ownedSymbolDropRates) {
            userCosmetics.push(ownedSymbolDropRates[symbol].id);
            // Accumulate bonus values in activeCosmetics
            activeCosmetics[ownedSymbolDropRates[symbol].symbol] = (activeCosmetics[ownedSymbolDropRates[symbol].symbol] || 0) + ownedSymbolDropRates[symbol].value;
        }

        // Add the highest-level bomb debuff (by its ID) to the main userCosmetics array
        for (const symbol in ownedBombDropRates) {
            userCosmetics.push(ownedBombDropRates[symbol].id);
            // Accumulate debuff values in activeCosmetics (value is negative)
            activeCosmetics[ownedBombDropRates[symbol].symbol] = (activeCosmetics[ownedBombDropRates[symbol].symbol] || 0) + ownedBombDropRates[symbol].value;
        }

        console.log("FirebaseService: User owned cosmetics loaded:", userCosmetics);
        console.log("FirebaseService: Calculated active drop rate boosts/debuffs:", activeCosmetics); 
        
        // Notify callbacks
        if (onUserCosmeticsUpdatedCallback) {
            onUserCosmeticsUpdatedCallback(userCosmetics);
        }
        // Force update active cosmetics for gameLogic, as drop rate boosts/debuffs are auto-equipped
        if (onActiveCosmeticsUpdatedCallback) {
            onActiveCosmeticsUpdatedCallback(activeCosmetics);
        }

    } catch (error) {
        console.error("FirebaseService: Error loading user cosmetics:", error);
        if (onUserCosmeticsUpdatedCallback) {
            onUserCosmeticsUpdatedCallback([]); // Pass empty array on error
        }
    }
}


/**
 * Gets the list of cosmetics owned by the current user.
 * @returns {Array<string>} An array of cosmetic IDs owned by the user.
 */
function getUserOwnedCosmetics() {
    return userCosmetics;
}

/**
 * Gets the object of currently active cosmetics.
 * @returns {Object} An object mapping cosmetic types to their active values.
 */
function getActiveCosmetics() {
    return activeCosmetics;
}

/**
 * Purchases a cosmetic item.
 * @param {Object} cosmetic - The cosmetic object to purchase ({id, name, price, type, value, level (optional), symbol (optional)}).
 * @returns {Promise<Object>} An object indicating success or error.
 */
async function purchaseCosmetic(cosmetic) {
    if (!currentUserId) {
        return { success: false, error: { message: "Utilisateur non connecté." } };
    }

    const userDocRef = db.collection('users').doc(currentUserId);
    const userCosmeticDocRef = userDocRef.collection('userCosmetics').doc(cosmetic.id);

    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists) {
                throw new Error("Document utilisateur introuvable.");
            }

            const currentBalance = userDoc.data().balance;
            if (currentBalance < cosmetic.price) {
                throw new Error("Solde insuffisant.");
            }

            // Specific logic for 'slot_symbol_drop_rate_bonus' and 'slot_bomb_drop_rate_debuff'
            if (cosmetic.type === 'slot_symbol_drop_rate_bonus' || cosmetic.type === 'slot_bomb_drop_rate_debuff') {
                const ownedCosmeticsForSymbol = allAvailableCosmetics.filter(c => 
                    c.type === cosmetic.type && c.symbol === cosmetic.symbol && userCosmetics.includes(c.id)
                );
                const highestOwnedLevel = ownedCosmeticsForSymbol.reduce((maxLevel, c) => Math.max(maxLevel, c.level), 0);

                if (cosmetic.level !== highestOwnedLevel + 1) {
                    throw new Error(`Vous devez acheter le niveau ${highestOwnedLevel + 1} avant celui-ci.`);
                }
                // No need to check cosmetic.level > MAX_LEVEL here, as cosmetic data from addCosmetics.js already caps levels.
            } else {
                // For other types, check if already owned (simple ID check)
                if (userCosmetics.includes(cosmetic.id)) {
                    throw new Error("Vous possédez déjà cet article.");
                }
            }

            // Deduct balance
            transaction.update(userDocRef, { balance: currentBalance - cosmetic.price });
            // Add cosmetic to user's owned list (including level and symbol for drop rate boosts/debuffs)
            transaction.set(userCosmeticDocRef, {
                purchasedAt: firebase.firestore.FieldValue.serverTimestamp(),
                name: cosmetic.name,
                type: cosmetic.type,
                value: cosmetic.value,
                level: cosmetic.level || 0, // Store level for drop rate cosmetics
                symbol: cosmetic.symbol || '' // Store symbol for drop rate cosmetics
            });
        });

        // Update local state after successful transaction
        balance -= cosmetic.price;
        userCosmetics.push(cosmetic.id); // Add new purchased item ID to owned list
        
        // If it's a drop rate bonus or debuff, also update activeCosmetics immediately
        if (cosmetic.type === 'slot_symbol_drop_rate_bonus' || cosmetic.type === 'slot_bomb_drop_rate_debuff') {
            const currentTotalBonus = activeCosmetics[cosmetic.symbol] || 0;
            activeCosmetics[cosmetic.symbol] = currentTotalBonus + cosmetic.value;
            console.log(`FirebaseService: Activated drop rate ${cosmetic.type === 'slot_bomb_drop_rate_debuff' ? 'debuff' : 'bonus'} for ${cosmetic.symbol}. New total bonus: ${activeCosmetics[cosmetic.symbol]}`);
        } else {
            // For other cosmetic types, set their type as key and value/id as value
            // (e.g., slot_theme: 'gold_theme_class')
            activeCosmetics[cosmetic.type] = cosmetic.value || cosmetic.id;
        }

        if (onBalanceUpdatedCallback) {
            onBalanceUpdatedCallback(balance);
        }
        if (onUserCosmeticsUpdatedCallback) {
            onUserCosmeticsUpdatedCallback(userCosmetics);
        }
        if (onActiveCosmeticsUpdatedCallback) {
            onActiveCosmeticsUpdatedCallback(activeCosmetics); // Notify gameLogic about active cosmetics change
        }
        console.log(`FirebaseService: Purchased cosmetic ${cosmetic.name}. New balance: ${balance}`);
        return { success: true };
    } catch (error) {
        console.error("FirebaseService: Error purchasing cosmetic:", error);
        return { success: false, error: { message: error.message } };
    }
}

/**
 * Activates a cosmetic item for the current user.
 * For 'slot_symbol_drop_rate_bonus' and 'slot_bomb_drop_rate_debuff' types, activation is handled on purchase.
 * This function remains for other types that might require explicit activation.
 * @param {Object} cosmetic - The cosmetic object to activate ({id, name, type, value, level (optional), symbol (optional)}).
 * @returns {Promise<Object>} An object indicating success or error.
 */
async function activateCosmetic(cosmetic) {
    if (!currentUserId) {
        return { success: false, error: { message: "Utilisateur non connecté." } };
    }

    if (!userCosmetics.includes(cosmetic.id)) {
        return { success: false, error: { message: "Vous ne possédez pas cet article." } };
    }

    // Drop rate boosts and debuffs are automatically active on purchase and accumulated.
    // Explicit activation is not needed for them.
    if (cosmetic.type === 'slot_symbol_drop_rate_bonus' || cosmetic.type === 'slot_bomb_drop_rate_debuff') {
        console.log(`FirebaseService: Attempted to activate ${cosmetic.type}. These are auto-active.`);
        return { success: true }; // Already active by purchase
    }
    
    // For other cosmetic types that need explicit activation (e.g., themes)
    const userDocRef = db.collection('users').doc(currentUserId);
    try {
        const newActiveCosmetics = { ...activeCosmetics };

        // Deactivate any other active cosmetic of the same type (e.g., if switching themes)
        // This logic needs to correctly identify and remove the *previous* active cosmetic of the same type
        // It relies on activeCosmetics storing the ID of the active cosmetic for its type.
        // We need to find the cosmetic in `allAvailableCosmetics` by its `id` to get its `type`.
        const currentActiveForTypeKey = Object.keys(activeCosmetics).find(activeKey => {
            const activeCosmeticInList = allAvailableCosmetics.find(c => c.id === activeKey);
            return activeCosmeticInList && activeCosmeticInList.type === cosmetic.type;
        });

        if (currentActiveForTypeKey) {
            delete newActiveCosmetics[currentActiveForTypeKey];
        }
        
        // Activate the new cosmetic (store its ID as the key for its type)
        // Store the ID of the cosmetic directly in activeCosmetics as the key, with its value or ID as value
        newActiveCosmetics[cosmetic.id] = cosmetic.value || cosmetic.id; // Store the ID of the cosmetic as the key for its type

        await userDocRef.update({ activeCosmetics: newActiveCosmetics });

        // Update local state
        activeCosmetics = newActiveCosmetics;
        if (onActiveCosmeticsUpdatedCallback) {
            onActiveCosmeticsUpdatedCallback(activeCosmetics);
        }
        console.log(`FirebaseService: Activated cosmetic ${cosmetic.name} (type: ${cosmetic.type}, value: ${cosmetic.value || cosmetic.id})`);
        return { success: true };
    } catch (error) {
        console.error("FirebaseService: Error activating cosmetic:", error);
        return { success: false, error: { message: error.message } };
    }
}


/**
 * Deactivates a cosmetic item for the current user.
 * For 'slot_symbol_drop_rate_bonus' and 'slot_bomb_drop_rate_debuff' types, deactivation is not applicable as they are passive bonuses.
 * This function remains for other types that might require explicit deactivation.
 * @param {string} cosmeticId - The ID of the cosmetic to deactivate.
 * @returns {Promise<Object>} An object indicating success or error.
 */
async function deactivateCosmetic(cosmeticId) {
    if (!currentUserId) {
        return { success: false, error: { message: "Utilisateur non connecté." } };
    }

    const cosmeticToDeactivate = allAvailableCosmetics.find(c => c.id === cosmeticId);
    if (!cosmeticToDeactivate) {
        return { success: false, error: { message: "Cosmétique introuvable pour la désactivation." } };
    }

    // Drop rate boosts and debuffs are automatically active and accumulated, cannot be "deactivated" explicitly.
    if (cosmeticToDeactivate.type === 'slot_symbol_drop_rate_bonus' || cosmeticToDeactivate.type === 'slot_bomb_drop_rate_debuff') {
        console.log(`FirebaseService: Attempted to deactivate ${cosmeticToDeactivate.type}. These are always active once purchased.`);
        return { success: true }; // Consider it successful as they don't deactivate
    }

    const userDocRef = db.collection('users').doc(currentUserId);
    try {
        const newActiveCosmetics = { ...activeCosmetics };
        
        // Remove the specific cosmetic ID from active cosmetics
        // Check if the cosmetic's type value was stored in activeCosmetics or its ID.
        // For visual cosmetics, we stored the ID as the key in activeCosmetics
        // Example: activeCosmetics = { 'gold_theme_class': 'gold_theme_class', 'border_neon_red': 'border_neon_red' }
        // So we need to delete by the cosmetic's ID.
        if (newActiveCosmetics[cosmeticId] !== undefined) {
             delete newActiveCosmetics[cosmeticId];
        } else {
            console.warn(`FirebaseService: Cosmetic with ID ${cosmeticId} was not found as active or its type mapping was different.`);
            return { success: true }; // Already inactive or not found in active list, consider it successful
        }
        
        await userDocRef.update({ activeCosmetics: newActiveCosmetics });

        // Update local state
        activeCosmetics = newActiveCosmetics;
        if (onActiveCosmeticsUpdatedCallback) {
            onActiveCosmeticsUpdatedCallback(activeCosmetics);
        }
        console.log(`FirebaseService: Deactivated cosmetic ${cosmeticToDeactivate.name}`);
        return { success: true };
    } catch (error) {
        console.error("FirebaseService: Error deactivating cosmetic:", error);
        return { success: false, error: { message: error.message } };
    }
}


/**
 * Gets all available cosmetic items.
 * @returns {Array<Object>} An array of all available cosmetic objects.
 */
function getAllAvailableCosmetics() {
    // This explicit check ensures an array is ALWAYS returned,
    // even if 'allAvailableCosmetics' somehow (unexpectedly) became undefined.
    // It's a defensive programming measure.
    if (!Array.isArray(allAvailableCosmetics)) {
        console.warn("FirebaseService: allAvailableCosmetics was not an array. Resetting to empty array.");
        allAvailableCosmetics = []; // Ensure it's an array if it somehow got corrupted
    }
    return allAvailableCosmetics;
}

// Ensure the auth listener is set up once the script loads
setupFirebaseAuthListener();

// Expose functions globally for gameLogic.js and shop.js to use
window.firebaseService = {
    setAuthStateChangedCallback,
    setUserDataLoadedCallback,
    setBalanceUpdatedCallback,
    setJackpotUpdatedCallback,
    setLeaderboardUpdatedCallback,
    setRewardDataLoadedCallback,
    onUserCosmeticsUpdated, // Expose new callback
    onActiveCosmeticsUpdated, // Expose new callback
    onAllCosmeticsLoaded, // Expose new callback
    setupFirebaseAuthListener, // Expose for initial setup
    signInUser,
    registerUser,
    sendPasswordResetEmail,
    logoutUser,
    saveUserBalance,
    getUserBalance,
    saveProgressiveJackpot,
    incrementProgressiveJackpot,
    getProgressiveJackpot,
    loadLeaderboard, // Make sure this is exposed
    collectFreeRewardFromService,
    getRewardConstants,
    getCurrentUserId,
    loadAllCosmetics, // Expose new function
    loadUserCosmetics, // Expose new function
    getUserOwnedCosmetics, // Expose new function
    getActiveCosmetics, // Expose new function
    purchaseCosmetic, // Expose new function
    activateCosmetic, // Expose new function
    deactivateCosmetic, // Expose new function
    getAllAvailableCosmetics // EXPOSE THIS FUNCTION
};
