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
/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */

import { resolve } from 'path';

import { address } from '@liskhq/lisk-cryptography';
import { Database } from '@liskhq/lisk-db';
import { Block } from '@liskhq/lisk-chain';

import {
	Account,
	StakerBuffer,
	ValidatorEntryBuffer,
	VoteWeightsWrapper,
} from '../../../src/types';
import { createFakeDefaultAccount } from '../utils/account';
import { generateBlocks } from '../utils/blocks';
import { ADDRESS_LISK32 } from '../utils/regex';

import {
	createGenesisDataObj,
	createValidatorsArrayEntry,
	createStakersArrayEntry,
	getStakes,
	getPoSModuleEntry,
} from '../../../src/assets/pos';
import { MODULE_NAME_POS } from '../../../src/constants';

const mockBlockFilePath = resolve(`${__dirname}/../../../src/utils/block.ts`);
const mockTransactionFilePath = resolve(`${__dirname}/../../../src/utils/transaction.ts`);

const { getLisk32AddressFromAddress } = address;

jest.mock('@liskhq/lisk-db');

describe('Build assets/pos', () => {
	let db: any;
	const tokenID = '0400000000000000';
	let accounts: Account[];
	let blocks: Block[];
	let blockIDs: string[];
	let delegates: VoteWeightsWrapper;
	const snapshotHeight = 10815;
	const pageSize = 1000;

	beforeAll(async () => {
		db = new Database('testDB');
		blocks = generateBlocks({
			startHeight: 1,
			numberOfBlocks: 10,
		});

		blockIDs = blocks.map(block => block.header.id.toString('hex'));

		delegates = {
			voteWeights: [
				{
					round: 103,
					delegates: [
						{
							address: Buffer.from('b8982f66903a6bfa5d6994c08ddf97707200d316', 'hex'),
							voteWeight: BigInt('2130000000000'),
						},
						{
							address: Buffer.from('f1b5b0c9d35957ca463b817467782ffa5d2e6945', 'hex'),
							voteWeight: BigInt('5304000000000'),
						},
					],
				},
			],
		};

		accounts = [
			createFakeDefaultAccount({
				address: Buffer.from('abd2ed5ad35b3a0870aadae6dceacc988ba63895', 'hex'),
				token: {
					balance: BigInt(Math.floor(Math.random() * 1000)),
				},
				dpos: {
					delegate: {
						username: 'genesis_1',
						lastForgedHeight: 5,
						isBanned: false,
						pomHeights: [],
						consecutiveMissedBlocks: 0,
						totalVotesReceived: BigInt('0'),
					},
					sentVotes: [],
					unlocking: [],
				},
				sequence: {
					nonce: BigInt('0'),
				},
				keys: {
					mandatoryKeys: [],
					optionalKeys: [],
					numberOfSignatures: 0,
				},
			}),
			createFakeDefaultAccount({
				address: Buffer.from('fa526a1611ccc66dec815cb963174118074b736e', 'hex'),
				keys: {
					mandatoryKeys: [
						Buffer.from('456efe283f25ea5bb21476b6dfb77cec4dbd33a4d1b5e60e4dc28e8e8b10fc4e', 'hex'),
					],
					optionalKeys: [],
					numberOfSignatures: 2,
				},
				token: {
					balance: BigInt(Math.floor(Math.random() * 1000)),
				},
				dpos: {
					delegate: {
						username: 'genesis_2',
						lastForgedHeight: 6,
						isBanned: false,
						pomHeights: [],
						consecutiveMissedBlocks: 0,
						totalVotesReceived: BigInt('0'),
					},
					sentVotes: [
						{
							delegateAddress: Buffer.from('03f6d90b7dbd0497dc3a52d1c27e23bb8c75897f', 'hex'),
							amount: BigInt('1000000000000'),
						},
						{
							delegateAddress: Buffer.from('0903f4c5cb599a7928aef27e314e98291d1e3888', 'hex'),
							amount: BigInt('1000000000000'),
						},
					],
					unlocking: [],
				},
				sequence: {
					nonce: BigInt('0'),
				},
			}),
		];
	});

	it('should create createValidatorsArrayEntry', async () => {
		jest.mock(mockBlockFilePath, () => {
			const actual = jest.requireActual(mockBlockFilePath);
			return {
				...actual,
				getBlockPublicKeySet() {
					return new Set(blockIDs);
				},
			};
		});

		jest.mock(mockTransactionFilePath, () => {
			const actual = jest.requireActual(mockTransactionFilePath);
			return {
				...actual,
				getTransactionPublicKeySet() {
					return new Set();
				},
			};
		});

		const { getValidatorKeys } = require('../../../src/assets/pos');

		const validatorKeys = await getValidatorKeys(accounts, db, pageSize);

		const validator = (await createValidatorsArrayEntry(
			accounts[0],
			validatorKeys,
			snapshotHeight,
			tokenID,
		)) as ValidatorEntryBuffer;

		// Assert
		expect(validator.address).toBeInstanceOf(Buffer);
		expect(Object.getOwnPropertyNames(validator)).toEqual([
			'address',
			'name',
			'blsKey',
			'proofOfPossession',
			'generatorKey',
			'lastGeneratedHeight',
			'isBanned',
			'reportMisbehaviorHeights',
			'consecutiveMissedBlocks',
			'lastCommissionIncreaseHeight',
			'commission',
			'sharingCoefficients',
		]);
	});

	it('should create createStakersArrayEntry', async () => {
		const staker = (await createStakersArrayEntry(accounts[1], tokenID)) as StakerBuffer;

		// Assert
		expect(staker.address).toBeInstanceOf(Buffer);
		expect(Object.getOwnPropertyNames(staker)).toEqual(['address', 'stakes', 'pendingUnlocks']);
		staker.stakes.forEach(stake =>
			expect(stake.validatorAddress).toEqual(expect.stringMatching(ADDRESS_LISK32)),
		);
		staker.pendingUnlocks.forEach(unlock =>
			expect(unlock.validatorAddress).toEqual(expect.stringMatching(ADDRESS_LISK32)),
		);
	});

	it('should create createGenesisDataObj', async () => {
		const genesisDataObj = await createGenesisDataObj(accounts, delegates, snapshotHeight);

		// Assert
		genesisDataObj.initValidators.forEach(addr => {
			expect(addr).toEqual(expect.stringMatching(ADDRESS_LISK32));
		});
		expect(Object.getOwnPropertyNames(genesisDataObj)).toEqual(['initRounds', 'initValidators']);
	});

	it('getStakes array', async () => {
		const stakes = await getStakes(accounts[1], tokenID);

		// Assert
		expect(stakes).toBeInstanceOf(Array);
		stakes.forEach(stake => {
			expect(stake.validatorAddress).toEqual(expect.stringMatching(ADDRESS_LISK32));
			expect(Object.getOwnPropertyNames(stake)).toEqual([
				'amount',
				'sharingCoefficients',
				'validatorAddress',
			]);
			stake.sharingCoefficients.forEach(sharingCoefficient => {
				expect(Object.getOwnPropertyNames(sharingCoefficient)).toEqual(['tokenID', 'coefficient']);
			});
		});
	});

	it('should throw error when getBlockPublicKeySet methods fails', async () => {
		jest.mock(mockBlockFilePath, () => {
			const actual = jest.requireActual(mockBlockFilePath);
			return {
				...actual,
				getBlockPublicKeySet() {
					throw new Error();
				},
			};
		});

		const { getValidatorKeys } = require('../../../src/assets/pos');

		await expect(getValidatorKeys(accounts, db, pageSize)).rejects.toThrow();
	});

	it('should create PoS module asset', async () => {
		jest.mock(mockBlockFilePath, () => {
			const actual = jest.requireActual(mockBlockFilePath);
			return {
				...actual,
				getBlockPublicKeySet() {
					return new Set(blockIDs);
				},
			};
		});

		jest.mock(mockTransactionFilePath, () => {
			const actual = jest.requireActual(mockTransactionFilePath);
			return {
				...actual,
				getTransactionPublicKeySet() {
					return new Set();
				},
			};
		});

		const { getValidatorKeys } = require('../../../src/assets/pos');

		const validatorKeys = await getValidatorKeys(accounts, db, pageSize);

		const validator = (await createValidatorsArrayEntry(
			accounts[0],
			validatorKeys,
			snapshotHeight,
			tokenID,
		)) as ValidatorEntryBuffer;

		const staker = (await createStakersArrayEntry(accounts[1], tokenID)) as StakerBuffer;
		const genesisDataObj = await createGenesisDataObj(accounts, delegates, snapshotHeight);

		const posModuleAsset = await getPoSModuleEntry(
			[validator].map(e => ({ ...e, address: getLisk32AddressFromAddress(e.address) })),
			[staker].map(e => ({ ...e, address: getLisk32AddressFromAddress(e.address) })),
			genesisDataObj,
		);

		// Assert
		expect(posModuleAsset.module).toEqual(MODULE_NAME_POS);
		expect(Object.getOwnPropertyNames(posModuleAsset.data)).toEqual([
			'validators',
			'stakers',
			'genesisData',
		]);
	});
});
