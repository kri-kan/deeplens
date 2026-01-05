import { Chat, Contact } from '@whiskeysockets/baileys';
import { logger } from './logger';

/**
 * A minimal implementation of Baileys memory store to replace the one removed in v7+
 * Focuses on tracking contacts and chats for manual sync purposes.
 */
export function makeInMemoryStore({ logger: pinoLogger }: { logger?: any } = {}) {
    const contacts: { [jid: string]: Contact } = {};
    const chats: { [jid: string]: Chat } = {};

    return {
        contacts,
        chats: {
            all: () => Object.values(chats),
            get: (id: string) => chats[id],
            set: (id: string, val: Chat) => {
                chats[id] = val;
            },
            upsert: (id: string, val: Partial<Chat>) => {
                chats[id] = { ...(chats[id] || { id }), ...val } as Chat;
            }
        },
        bind: (ev: any) => {
            ev.on('contacts.upsert', (newContacts: Contact[]) => {
                for (const contact of newContacts) {
                    const id = contact.id;
                    if (id) {
                        contacts[id] = { ...(contacts[id] || {}), ...contact };
                    }
                }
            });

            ev.on('contacts.update', (updates: Partial<Contact>[]) => {
                for (const update of updates) {
                    const id = update.id;
                    if (id && contacts[id]) {
                        Object.assign(contacts[id], update);
                    }
                }
            });

            ev.on('chats.upsert', (newChats: Chat[]) => {
                for (const chat of newChats) {
                    const id = chat.id;
                    if (id) {
                        chats[id] = { ...(chats[id] || {}), ...chat };
                    }
                }
            });

            ev.on('chats.update', (updates: Partial<Chat>[]) => {
                for (const update of updates) {
                    const id = update.id;
                    if (id && chats[id]) {
                        Object.assign(chats[id], update);
                    }
                }
            });

            ev.on('messaging-history.set', ({ chats: newChats, contacts: newContacts }: { chats: Chat[], contacts: Contact[] }) => {
                if (newChats) {
                    for (const chat of newChats) {
                        if (chat.id) chats[chat.id] = chat;
                    }
                }
                if (newContacts) {
                    for (const contact of newContacts) {
                        if (contact.id) contacts[contact.id] = contact;
                    }
                }
            });
        }
    };
}
