// app/src/utils/passwordGenerator.js

/**
 * Generates a random password based on specified criteria.
 * @param {number} length - The desired length of the password.
 * @param {boolean} includeUppercase - Whether to include uppercase letters.
 * @param {boolean} includeLowercase - Whether to include lowercase letters.
 * @param {boolean} includeNumbers - Whether to include numbers.
 * @param {boolean} includeSymbols - Whether to include symbols.
 * @returns {string} The generated password.
 */
function generatePassword(length = 16, includeUppercase = true, includeLowercase = true, includeNumbers = true, includeSymbols = true) {
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numberChars = '0123456789';
  const symbolChars = '!@#$%^&*()-_=+[]{}|;:,.<>?';

  let availableChars = '';
  if (includeLowercase) availableChars += lowercaseChars;
  if (includeUppercase) availableChars += uppercaseChars;
  if (includeNumbers) availableChars += numberChars;
  if (includeSymbols) availableChars += symbolChars;

  if (availableChars.length === 0) {
    throw new Error("No character types selected for password generation.");
  }

  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * availableChars.length);
    password += availableChars[randomIndex];
  }

  // Ensure at least one char from each selected type is present (if available in availableChars)
  // This helps guarantee strength, especially for shorter passwords
  let ensureChars = [];
  if (includeLowercase) ensureChars.push(lowercaseChars);
  if (includeUppercase) ensureChars.push(uppercaseChars);
  if (includeNumbers) ensureChars.push(numberChars);
  if (includeSymbols) ensureChars.push(symbolChars);

  // For each required type, if the password doesn't contain it, replace a random char
  // This is a simple way to ensure complexity without over-complicating the main loop
  for (let i = 0; i < ensureChars.length; i++) {
    const charSet = ensureChars[i];
    if (!password.split('').some(char => charSet.includes(char))) {
      const randomIndexInPassword = Math.floor(Math.random() * password.length);
      const randomCharFromSet = charSet[Math.floor(Math.random() * charSet.length)];
      password = password.substring(0, randomIndexInPassword) + randomCharFromSet + password.substring(randomIndexInPassword + 1);
    }
  }

  return password;
}

export default generatePassword;