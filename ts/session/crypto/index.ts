import * as MessageEncrypter from './MessageEncrypter';

export { MessageEncrypter };

// libsodium-wrappers requires the `require` call to work
// tslint:disable-next-line: no-require-imports
import libsodiumwrappers = require('libsodium-wrappers');
import { fromHex } from 'bytebuffer';
import { toHex } from '../utils/String';
import { ECKeyPair } from '../../receiver/closedGroupsV2';

export async function getSodium(): Promise<typeof libsodiumwrappers> {
  await libsodiumwrappers.ready;
  return libsodiumwrappers;
}

export const concatUInt8Array = (...args: Array<Uint8Array>): Uint8Array => {
  const totalLength = args.reduce((acc, current) => acc + current.length, 0);

  const concatted = new Uint8Array(totalLength);
  let currentIndex = 0;
  args.forEach(arr => {
    concatted.set(arr, currentIndex);
    currentIndex += arr.length;
  });

  return concatted;
};

/**
 * Returns a generated curve25519 hex public key being of length 66 and starting with 05.
 * For a closed group v2, we have one publicKey (with prefix) used for polling (this function),
 * and one keypair without prefix used for encoding of the messages (function generateCurve25519KeyPairWithoutPrefix).
 */
export async function generateClosedGroupV2PublicKey() {
  const sodium = await getSodium();

  const ed25519KeyPair = sodium.crypto_sign_keypair();
  const x25519PublicKey = sodium.crypto_sign_ed25519_pk_to_curve25519(
    ed25519KeyPair.publicKey
  );
  // prepend version byte (coming from `processKeys(raw_keys)`)
  const origPub = new Uint8Array(x25519PublicKey);
  const prependedX25519PublicKey = new Uint8Array(33);
  prependedX25519PublicKey.set(origPub, 1);
  prependedX25519PublicKey[0] = 5;

  return toHex(prependedX25519PublicKey);
}

/**
 * Returns a generated curve25519 keypair without the prefix on the public key.
 */
export async function generateCurve25519KeyPairWithoutPrefix(): Promise<ECKeyPair | null> {
  const sodium = await getSodium();

  try {
    const ed25519KeyPair = sodium.crypto_sign_keypair();
    const x25519PublicKey = sodium.crypto_sign_ed25519_pk_to_curve25519(
      ed25519KeyPair.publicKey
    );
    const x25519SecretKey = sodium.crypto_sign_ed25519_sk_to_curve25519(
      ed25519KeyPair.privateKey
    );

    return new ECKeyPair(x25519PublicKey, x25519SecretKey);
  } catch (err) {
    return null;
  }
}
