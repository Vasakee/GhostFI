/**
 * SECURE LOCAL KEY CONVERTER
 * 
 * Usage:
 * 1. Open your terminal
 * 2. Run: npm install bs58
 * 3. Open this file and paste your BASE58 private key (from Phantom) into the variable below
 * 4. Run: node convert-key.js
 * 5. COPY THE HEX RESULT and delete your key from this file immediately.
 */

const bs58 = require('bs58');

// PASTE YOUR BASE58 KEY HERE (Starting with 3Fs6...)
const BASE58_PRIVATE_KEY = 'PASTE_YOUR_NEW_KEY_HERE';

try {
  const decoded = bs58.decode(BASE58_PRIVATE_KEY);
  const hexKey = Buffer.from(decoded).toString('hex');
  
  console.log("\n--- CONVERSION SUCCESSFUL ---");
  console.log("Your HEX Private Key for MASTER_TREASURY_KEY:");
  console.log(hexKey);
  console.log("-----------------------------\n");
  console.log("⚠️ REMINDER: Delete your key from this file now!");
} catch (e) {
  console.error("Error: Invalid Base58 string. Make sure you copied the full key from Phantom.");
}
