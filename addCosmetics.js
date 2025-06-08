// addCosmetics.js

// Import the Firebase Admin SDK
const admin = require('firebase-admin');

// Replace 'path/to/your/serviceAccountKey.json' with the actual path to your service account key file.
// This file MUST be in the same folder as this script, or a correct relative path must be provided.
const serviceAccount = require('./serviceAccountKey.json');

// Initialize the Firebase Admin application
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Get a reference to Firestore
const db = admin.firestore();

// Define the symbols for which drop rate boosts can be purchased
const SYMBOLS_FOR_DROP_RATE_BOOST = ['🍒', '🍊', '🔔', '💎', '7️⃣', 'BAR', '⭐', '💯']; // Excluding '💣' (Malus)

// Configuration for drop rate boost cosmetics
// NEW: Base prices based on rarity (updated values)
const BASE_DROP_RATE_PRICES_BY_SYMBOL = {
    '🍒': 200000,
    '🍊': 300000,
    '🔔': 500000,
    '💎': 650000,
    '7️⃣': 850000,
    'BAR': 1000000,
    '⭐': 1000000,
    '💯': 1200000
};

const DROP_RATE_PRICE_FACTOR = 2.5; // Factor for exponential price increase
const MAX_DROP_RATE_LEVEL = 5; // Maximum level for drop rate boosts
const DROP_RATE_BONUS_PER_LEVEL = 0.01; // 1% increase per level (as requested, remains 1%)

// Configuration for bomb drop rate decrease cosmetics
const BOMB_DROP_RATE_BASE_PRICE = 1000000; // Base price for level 1 for bomb as specified (updated value)
const BOMB_DROP_RATE_PRICE_FACTOR = 3; // Factor for exponential price increase
const MAX_BOMB_DROP_RATE_LEVEL = 5; // Maximum level for bomb drop rate decrease
const BOMB_DROP_RATE_DECREASE_PER_LEVEL = -0.01; // -1% decrease per level

// Generate drop rate boost cosmetics for each symbol
const generateDropRateBoosts = () => {
  const boosts = [];
  SYMBOLS_FOR_DROP_RATE_BOOST.forEach(symbol => {
    // Get the base price for the current symbol, default to 10000 if not found
    const basePrice = BASE_DROP_RATE_PRICES_BY_SYMBOL[symbol] || 10000; 
    for (let level = 1; level <= MAX_DROP_RATE_LEVEL; level++) {
      const price = basePrice * Math.pow(DROP_RATE_PRICE_FACTOR, level - 1);
      boosts.push({
        id: `drop_rate_${symbol}_level_${level}`,
        name: `Boost de Taux de Drop ${symbol} Niveau ${level}`,
        description: `Augmente de ${level * 1}% le taux de drop du symbole ${symbol}.`, // Description reflects 1% per level
        price: Math.round(price), // Round to nearest integer
        type: 'slot_symbol_drop_rate_bonus', // Specific type for symbol drop rates
        value: DROP_RATE_BONUS_PER_LEVEL, // Value is 1% per level (remains 0.01)
        symbol: symbol, // Store the specific symbol this boost is for
        level: level, // Store the level of this boost
        icon: symbol, // Use the symbol itself as the icon
        imageUrl: `https://placehold.co/100x100/40E0D0/000000?text=${encodeURIComponent(symbol)}` // Turquoise background, black text
      });
    }
  });
  return boosts;
};

// Generate bomb drop rate decrease cosmetics
const generateBombDropRateDecreases = () => {
  const decreases = [];
  const symbol = '💣'; // Correct symbol for bomb
  for (let level = 1; level <= MAX_BOMB_DROP_RATE_LEVEL; level++) {
    const price = BOMB_DROP_RATE_BASE_PRICE * Math.pow(BOMB_DROP_RATE_PRICE_FACTOR, level - 1);
    decreases.push({
      id: `bomb_drop_rate_level_${level}`,
      name: `Réduction Taux de Bombe Niveau ${level}`,
      description: `Diminue de ${level * 1}% le taux de drop du symbole ${symbol}.`, // Description reflects 1% decrease per level
      price: Math.round(price), // Round to nearest integer
      type: 'slot_bomb_drop_rate_debuff', // Specific type for bomb drop rate
      value: BOMB_DROP_RATE_DECREASE_PER_LEVEL, // Value is -1% per level (remains -0.01)
      symbol: symbol, // Store the specific symbol this debuff is for
      level: level, // Store the level of this debuff
      icon: symbol, // Use the symbol itself as the icon
      imageUrl: `https://placehold.co/100x100/FF0000/FFFFFF?text=${encodeURIComponent(symbol)}` // Red background, white text
    });
  }
  return decreases;
};


// Define all cosmetic items to add to your shop
const cosmeticsToAdd = [
  // Add generated drop rate boosts
  ...generateDropRateBoosts(),
  // Add generated bomb drop rate decreases
  ...generateBombDropRateDecreases()
];

/**
 * Function to delete all existing cosmetics from Firestore.
 * @returns {Promise<void>}
 */
async function clearAllCosmetics() {
  console.log('Starting deletion of all existing cosmetics...');
  const collectionRef = db.collection('cosmetics');
  const snapshot = await collectionRef.get();
  const batch = db.batch();
  let deletedCount = 0;

  if (snapshot.empty) {
    console.log('No cosmetics to delete.');
    return;
  }

  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
    deletedCount++;
  });

  try {
    await batch.commit();
    console.log(`${deletedCount} cosmetics successfully deleted.`);
  } catch (error) {
    console.error('Error deleting cosmetics:', error);
    throw error; // Propagate the error to stop the process if deletion fails
  }
}

/**
 * Function to add cosmetics to Firestore.
 * This function will first call clearAllCosmetics.
 */
async function addCosmetics() {
  console.log('Launching cosmetic addition script.');
  
  try {
    await clearAllCosmetics(); // Delete all existing cosmetics first
    console.log('Starting addition of new cosmetics to Firestore...');
    const batch = db.batch(); // Use a batch for multiple writes

    for (const cosmetic of cosmeticsToAdd) {
      const docRef = db.collection('cosmetics').doc(cosmetic.id);
      batch.set(docRef, cosmetic);
      console.log(`Preparing to add item: ${cosmetic.name}`);
    }

    await batch.commit(); // Execute the batch
    console.log('All cosmetics successfully added/updated in Firestore!');
  } catch (error) {
    console.error('Global error during cosmetic operation:', error);
  } finally {
    // Exit the Node.js process after the operation
    process.exit(0);
  }
}

// Execute the function
addCosmetics();