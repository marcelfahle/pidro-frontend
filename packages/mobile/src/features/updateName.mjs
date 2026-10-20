/**
 * The friendly name of a beta update, like "Vaasa-Boudreaux": a place where
 * Pidro is played and a name or a word from its tables. A pure function of
 * the commit sha, so a tester's "I'm on Vaasa-Boudreaux" is always the same
 * commit. Plain JavaScript: scripts/publish-beta.mjs runs it under Node and
 * inlines the result as EXPO_PUBLIC_UPDATE_NAME; the app only reads that.
 */

// Ostrobothnia first, then the rest of Finland, then Cajun Louisiana.
export const PLACES = [
  'Vaasa',
  'Jakobstad',
  'Kokkola',
  'Nykarleby',
  'Kronoby',
  'Larsmo',
  'Närpes',
  'Seinäjoki',
  'Kristinestad',
  'Korsholm',
  'Malax',
  'Pedersöre',
  'Vörå',
  'Kaskö',
  'Oulu',
  'Kuopio',
  'Turku',
  'Tampere',
  'Joensuu',
  'Rovaniemi',
  'Lahti',
  'Porvoo',
  'Savonlinna',
  'Hanko',
  'Lafayette',
  'Opelousas',
  'Thibodaux',
  'Houma',
  'Mamou',
  'Eunice',
  'Natchitoches',
  'Abbeville',
  'Crowley',
  'Rayne',
  'Carencro',
  'Kaplan',
  'Arnaudville',
  'Cecilia',
  'Basile',
  'Jennings',
];

// Finnish, Finland-Swedish and Cajun first names, then a few words from the table.
export const WORDS = [
  'Antti',
  'Pekka',
  'Kalle',
  'Matti',
  'Aino',
  'Eino',
  'Seppo',
  'Liisa',
  'Tuula',
  'Kaisa',
  'Jocke',
  'Bertil',
  'Stig',
  'Göran',
  'Majken',
  'Ulla',
  'Gunnel',
  'Holger',
  'Britt',
  'Marcel',
  'Boudreaux',
  'Thibodeaux',
  'Clotile',
  'Alcide',
  'Alphonse',
  'Evangeline',
  'Toussaint',
  'Ophelia',
  'Clovis',
  'Odile',
  'Aurelie',
  'Sisu',
  'Gumbo',
  'Kaffe',
  'Pulla',
  'Boudin',
  'Beignet',
  'Roux',
  'Lagniappe',
  'Mustikka',
];

/** "Vaasa-Boudreaux" for a commit sha (7 to 40 hex digits), or null for anything else. */
export function updateName(sha) {
  const hex = typeof sha === 'string' ? sha.trim().toLowerCase() : '';
  if (!/^[0-9a-f]{7,40}$/.test(hex)) return null;
  // FNV-1a, so neighbouring shas land far apart.
  let hash = 0x811c9dc5;
  for (const char of hex) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  return `${PLACES[hash % PLACES.length]}-${WORDS[Math.floor(hash / PLACES.length) % WORDS.length]}`;
}
