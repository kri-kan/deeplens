const Baileys = require('@whiskeysockets/baileys');
console.log('Keys:', Object.keys(Baileys));
console.log('makeInMemoryStore present:', !!Baileys.makeInMemoryStore);
if (Baileys.default) {
    console.log('Default keys:', Object.keys(Baileys.default));
    console.log('makeInMemoryStore in default:', !!Baileys.default.makeInMemoryStore);
}
