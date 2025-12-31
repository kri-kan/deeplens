const Baileys = require('@whiskeysockets/baileys');
// To check socket methods, we need to create a dummy socket or just check the factory
console.log('makeWASocket exports:', Object.keys(Baileys.default || {}));
