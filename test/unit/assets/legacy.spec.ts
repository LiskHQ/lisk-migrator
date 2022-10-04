/*
 * Copyright © 2022 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
import { utils, legacy, legacyAddress } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';

import { addLegacyModuleEntry } from '../../../src/assets/legacy';
import { MODULE_NAME_LEGACY } from '../../../src/constants';
import { unregisteredAddressesSchema } from '../../../src/schemas';
import { UnregisteredAccount } from '../../../src/types';

const getLegacyBytesFromPassphrase = (passphrase: string): Buffer => {
	const { publicKey } = legacy.getKeys(passphrase);
	return legacyAddress.getFirstEightBytesReversed(utils.hash(publicKey));
};

describe('Build assets/legacy', () => {
	let unregisteredAddresses: UnregisteredAccount[];
	let encodedUnregisteredAddresses: Buffer;

	interface Accounts {
		[key: string]: {
			passphrase: string;
		};
	}

	const testAccounts: Accounts = {
		account1: {
			passphrase: 'float slow tiny rubber seat lion arrow skirt reveal garlic draft shield',
		},
		account2: {
			passphrase: 'hand nominee keen alarm skate latin seek fox spring guilt loop snake',
		},
		account3: {
			passphrase: 'february large secret save risk album opera rebel tray roast air captain',
		},
	};

	describe('addLegacyModuleEntry', () => {
		beforeEach(async () => {
			for (const account of Object.values(testAccounts)) {
				unregisteredAddresses = [];
				unregisteredAddresses.push({
					address: getLegacyBytesFromPassphrase(account.passphrase),
					balance: BigInt(Math.floor(Math.random() * 1000)),
				});
			}

			encodedUnregisteredAddresses = await codec.encode(unregisteredAddressesSchema, {
				unregisteredAddresses,
			});
		});

		it('should get legacy accounts', async () => {
			const response = await addLegacyModuleEntry(encodedUnregisteredAddresses);

			// Assert
			expect(response.module).toEqual(MODULE_NAME_LEGACY);
			expect(response.data.accounts.length).toBeGreaterThan(0);
			expect(Object.keys(response.data.accounts[0])).toEqual(['address', 'balance']);
		});

		it('should throw error when invalid encodedUnregisteredAddresses', async () => {
			const invalidEncodedData = Buffer.alloc(48);
			await expect(addLegacyModuleEntry(invalidEncodedData)).rejects.toThrow();
		});
	});
});
