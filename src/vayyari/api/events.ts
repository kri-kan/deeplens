import { EventEmitter } from 'eventemitter3';

export const authEvents = new EventEmitter();
export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';
