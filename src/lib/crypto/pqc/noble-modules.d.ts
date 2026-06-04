declare module '@noble/post-quantum/ml-dsa.js' {
  export const ml_dsa87: {
    keygen(seed?: Uint8Array): { publicKey: Uint8Array; secretKey: Uint8Array };
    sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array;
    verify(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean;
  };
}

declare module '@noble/post-quantum/ml-kem.js' {
  export const ml_kem1024: {
    keygen(seed?: Uint8Array): { publicKey: Uint8Array; secretKey: Uint8Array };
    encapsulate(publicKey: Uint8Array): { cipherText: Uint8Array; sharedSecret: Uint8Array };
    decapsulate(cipherText: Uint8Array, secretKey: Uint8Array): Uint8Array;
  };
}

declare module '@noble/post-quantum/slh-dsa.js' {
  export const slh_dsa_sha2_256f: {
    keygen(seed?: Uint8Array): { publicKey: Uint8Array; secretKey: Uint8Array };
    sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array;
    verify(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean;
  };
}

declare module '@noble/post-quantum/hybrid.js' {
  export const ml_kem768_x25519: {
    keygen(seed?: Uint8Array): { publicKey: Uint8Array; secretKey: Uint8Array };
    encapsulate(publicKey: Uint8Array): { cipherText: Uint8Array; sharedSecret: Uint8Array };
    decapsulate(cipherText: Uint8Array, secretKey: Uint8Array): Uint8Array;
  };
}

declare module '@noble/post-quantum/utils.js' {
  export function randomBytes(length: number): Uint8Array;
}
