import '@testing-library/jest-dom/vitest';

const arrayBufferResizableDescriptor = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'resizable');
if (!arrayBufferResizableDescriptor) {
  Object.defineProperty(ArrayBuffer.prototype, 'resizable', {
    configurable: true,
    enumerable: false,
    get() {
      return false;
    },
  });
}

const sharedArrayBufferGlobal = globalThis as typeof globalThis & { SharedArrayBuffer?: SharedArrayBufferConstructor };

if (typeof sharedArrayBufferGlobal.SharedArrayBuffer === 'undefined') {
  class SharedArrayBufferShim extends ArrayBuffer {
    constructor(byteLength: number) {
      super(byteLength);
    }
  }

  Object.defineProperty(SharedArrayBufferShim.prototype, 'growable', {
    configurable: true,
    enumerable: false,
    get() {
      return false;
    },
  });

  sharedArrayBufferGlobal.SharedArrayBuffer = SharedArrayBufferShim as unknown as SharedArrayBufferConstructor;
} else if (!Object.getOwnPropertyDescriptor(sharedArrayBufferGlobal.SharedArrayBuffer.prototype, 'growable')) {
  Object.defineProperty(sharedArrayBufferGlobal.SharedArrayBuffer.prototype, 'growable', {
    configurable: true,
    enumerable: false,
    get() {
      return false;
    },
  });
}
