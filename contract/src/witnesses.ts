// This file is part of midnightntwrk/example-counter.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/*
 * This file defines the shape of the bulletin board's private state,
 * as well as the single witness function that accesses it.
 */

import { Ledger, Witnesses } from "./managed/bboard/contract/index.cjs";
import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

/* **********************************************************************
 * The only hidden state needed by the bulletin board contract is
 * the user's secret key.  Some of the library code and
 * compiler-generated code is parameterized by the type of our
 * private state, so we define a type for it and a function to
 * make an object of that type.
 */

export type BBoardPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createBBoardPrivateState = (secretKey: Uint8Array) => ({
  secretKey,
});


/** ===================== *
 *  Helpers de conversión *
 *  ===================== */
function hexToBytes32(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length !== 64) throw new Error("Se esperan 32 bytes (64 hex chars)");
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(clean.slice(2 * i, 2 * i + 2), 16);
  return out;
}

// Edad como u16 dentro de Bytes<32> en BIG-ENDIAN (coincide con convert_Uint8Array_to_bigint)
function u16ToBytes32LE(n: number): Uint8Array {
  if (!Number.isInteger(n) || n < 0 || n > 0xffff)
    throw new Error("edad fuera de rango u16");
  const out = new Uint8Array(32);
  out[0] = n & 0xff;
  out[1] = (n >> 8) & 0xff;
  return out;
}

function iso2ToBytes2(code: string): Uint8Array {
  if (!/^[A-Z]{2}$/.test(code)) throw new Error("ISO-3166-1 alpha-2 inválido");
  return new TextEncoder().encode(code); // "AR" -> [0x41,0x52]
}

/** ===================== *
 *  Valores fijos de test *
 *  ===================== */
// ¡OJO!: userSecretKey es un *secreto de usuario*, no tu ZswapCoinPublicKey.
// Para tests, podés usar cualquier 32B (esto derivará siempre el mismo uPk).
const TEST_USER_SK_HEX =
  "6e63651bbc5746b77ab8e520462b484b97bf5d92f2adce05c52c10468873c8a1";

const TEST_AGE_YEARS = 21;   // se evaluará contra allowedMinAge on-chain
const TEST_COUNTRY   = "AR"; // se evaluará contra allowedCountry on-chain

/** ===================== *
 *  Private state (dummy) *
 *  ===================== */
export type KycPrivateState = Readonly<{}>; // no necesitamos guardar nada

/** ===================== *
 *  Witnesses “hardcoded” *
 *  ===================== */
export const witnesses: Witnesses<BBoardPrivateState> = {
  // Bytes<32>
  userSecretKey: (
    ctx: WitnessContext<Ledger, BBoardPrivateState>
  ): [BBoardPrivateState, Uint8Array] => [ctx.privateState, hexToBytes32(TEST_USER_SK_HEX)],

  // Bytes<32> – el contrato lo castea a Field -> Uint<16> -> Uint<8>
  userAgeBytes: (
    ctx: WitnessContext<Ledger, BBoardPrivateState>
  ): [BBoardPrivateState, Uint8Array] => [ctx.privateState, u16ToBytes32LE(TEST_AGE_YEARS)],

  // Bytes<2>
  userCountryAlpha2: (
    ctx: WitnessContext<Ledger, BBoardPrivateState>
  ): [BBoardPrivateState, Uint8Array] => [ctx.privateState, iso2ToBytes2(TEST_COUNTRY)],
};

/* **********************************************************************
 * The witnesses object for the bulletin board contract is an object
 * with a field for each witness function, mapping the name of the function
 * to its implementation.
 *
 * The implementation of each function always takes as its first argument
 * a value of type WitnessContext<L, PS>, where L is the ledger object type
 * that corresponds to the ledger declaration in the Compact code, and PS
 *  is the private state type, like BBoardPrivateState defined above.
 *
 * A WitnessContext has three
 * fields:
 *  - ledger: T
 *  - privateState: PS
 *  - contractAddress: string
 *
 * The other arguments (after the first) to each witness function
 * correspond to the ones declared in Compact for the witness function.
 * The function's return value is a tuple of the new private state and
 * the declared return value.  In this case, that's a BBoardPrivateState
 * and a Uint8Array (because the contract declared a return value of Bytes[32],
 * and that's a Uint8Array in TypeScript).
 *
 * The userSecretKey witness does not need the ledger or contractAddress
 * from the WitnessContext, so it uses the parameter notation that puts
 * only the binding for the privateState in scope.
 */
// export const witnesses = {
//   userSecretKey: ({
//     privateState,
//   }: WitnessContext<Ledger, BBoardPrivateState>): [
//     BBoardPrivateState,
//     Uint8Array,
//   ] => [privateState, privateState.secretKey],
//   userAgeBytes: ({
//     privateState,
//   }: WitnessContext<Ledger, BBoardPrivateState>): [
//     BBoardPrivateState,
//     Uint8Array,
//   ] => [privateState, privateState.secretKey],
//   userCountryAlpha2: ({
//     privateState,
//   }: WitnessContext<Ledger, BBoardPrivateState>): [
//     BBoardPrivateState,
//     Uint8Array,
//   ] => [privateState, privateState.secretKey],
// };
