export const PERK_SEARCH_QUERIES = [
  'dead', 'sprint', 'strike', 'deliver', 'adren', 'unbreakable',
  'bbq', 'chili', 'pop', 'ruin', 'corrupt', 'pain', 'nowhere'
];

export const CHARACTER_SEARCH_QUERIES = [
  'meg', 'dwight', 'claudette', 'feng', 'trapper', 'wraith', 'huntress', 'blight'
];

export const LOCALES = ['en', 'pl', 'de', 'fr', 'es'];

export function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getRandomPerkQuery() {
  return getRandomElement(PERK_SEARCH_QUERIES);
}

export function getRandomCharacterQuery() {
  return getRandomElement(CHARACTER_SEARCH_QUERIES);
}

export function getRandomCharacter() {
  return getRandomCharacterQuery();
}

export function getRandomLocale() {
  return getRandomElement(LOCALES);
}

export const dataGenerator = {
  PERK_SEARCH_QUERIES,
  CHARACTER_SEARCH_QUERIES,
  LOCALES,
  getRandomElement,
  getRandomPerkQuery,
  getRandomCharacterQuery,
  getRandomCharacter,
  getRandomLocale,
};

export default dataGenerator;