import { EventEmitter } from 'events';

// In a real production environment with multiple server instances,
// a more robust solution like Redis Pub/Sub would be necessary.
// For this single-process demo, a global EventEmitter is sufficient.

declare global {
  var sseEmitter: EventEmitter | undefined;
}

const sseEmitter = global.sseEmitter || new EventEmitter();
// The emitter can handle many listeners, e.g., one per connected client
sseEmitter.setMaxListeners(0);

if (process.env.NODE_ENV !== 'production') {
  global.sseEmitter = sseEmitter;
}

export default sseEmitter;
