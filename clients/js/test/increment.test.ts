import {
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
  appendTransactionMessageInstruction,
  generateKeyPairSigner,
  isProgramError,
  isSolanaError,
  lamports,
  pipe,
} from '@solana/web3.js';
import test from 'ava';
import {
  SOLANA_SMART_CONTRACT_ERROR__INVALID_AUTHORITY,
  SOLANA_SMART_CONTRACT_PROGRAM_ADDRESS,
  fetchCounter,
  getIncrementInstruction,
} from '../src';
import {
  createCounterForAuthority,
  createDefaultSolanaClient,
  createDefaultTransaction,
  generateKeyPairSignerWithSol,
  getBalance,
  signAndSendTransaction,
} from './_setup';

test('it increments an existing counter by 1', async (t) => {
  // Given an authority key pair with an associated counter account of value 0.
  const client = createDefaultSolanaClient();
  const authority = await generateKeyPairSignerWithSol(client);
  const counter = await createCounterForAuthority(client, authority);
  t.is((await fetchCounter(client.rpc, counter)).data.count, 0n);

  // When we increment the counter account.
  const incrementIx = getIncrementInstruction({ authority, counter });
  await pipe(
    await createDefaultTransaction(client, authority),
    (tx) => appendTransactionMessageInstruction(incrementIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Then we expect the counter account to have a value of 1.
  t.is((await fetchCounter(client.rpc, counter)).data.count, 1n);
});

test('it cannot increment a counter that does not exist', async (t) => {
  // Given an authority key pair with no associated counter account.
  const client = createDefaultSolanaClient();
  const authority = await generateKeyPairSignerWithSol(client);
  const counter = (await generateKeyPairSigner()).address;
  t.is(await getBalance(client, counter), lamports(0n));

  // When we try to increment the inexistent counter account.
  const incrementIx = getIncrementInstruction({ authority, counter });
  const transactionMessage = pipe(
    await createDefaultTransaction(client, authority),
    (tx) => appendTransactionMessageInstruction(incrementIx, tx)
  );
  const promise = signAndSendTransaction(client, transactionMessage);

  // Then we expect the program to throw an error.
  const error = await t.throwsAsync(promise);
  t.true(
    isSolanaError(
      error,
      SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE
    )
  );
  t.true(
    isProgramError(
      error.cause,
      transactionMessage,
      SOLANA_SMART_CONTRACT_PROGRAM_ADDRESS,
      3012 // Account not initialized.
    )
  );
});

test('it cannot increment a counter that belongs to another authority', async (t) => {
  // Given two authority key pairs such that
  // only one of them (authority A) is associated with a counter account.
  const client = createDefaultSolanaClient();
  const [authorityA, authorityB] = await Promise.all([
    generateKeyPairSignerWithSol(client),
    generateKeyPairSignerWithSol(client),
  ]);
  const counter = await createCounterForAuthority(client, authorityA);

  // When authority B tries to increment the counter account of authority A.
  const incrementIx = getIncrementInstruction({
    authority: authorityB,
    counter,
  });
  const transactionMessage = pipe(
    await createDefaultTransaction(client, authorityB),
    (tx) => appendTransactionMessageInstruction(incrementIx, tx)
  );
  const promise = signAndSendTransaction(client, transactionMessage);

  // Then we expect the program to throw an error.
  const error = await t.throwsAsync(promise);
  t.true(
    isSolanaError(
      error,
      SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE
    )
  );
  t.true(
    isProgramError(
      error.cause,
      transactionMessage,
      SOLANA_SMART_CONTRACT_PROGRAM_ADDRESS,
      SOLANA_SMART_CONTRACT_ERROR__INVALID_AUTHORITY
    )
  );
});
