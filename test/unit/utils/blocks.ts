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
 *
 */
import { utils } from '@liskhq/lisk-cryptography';
import { BlockHeader, Block } from '@liskhq/lisk-chain';

const { hash, getRandomBytes } = utils;

type DeepPartial<T> = T extends Buffer
	? T // eslint-disable-next-line @typescript-eslint/ban-types
	: T extends Function
	? T
	: T extends object
	? { [P in keyof T]?: DeepPartial<T[P]> }
	: T;

export const createFakeBlockHeader = (header?: DeepPartial<BlockHeader>): BlockHeader => ({
	id: header?.id ?? hash(getRandomBytes(8)),
	version: 2,
	timestamp: header?.timestamp ?? 32578370,
	height: header?.height ?? 489,
	previousBlockID: header?.previousBlockID ?? hash(getRandomBytes(4)),
	generatorPublicKey: header?.generatorPublicKey ?? getRandomBytes(32),
	reward: BigInt(0),
	transactionRoot: getRandomBytes(32),
	signature: getRandomBytes(64),
	asset: {
		seedReveal: Buffer.alloc(0),
		maxHeightPreviouslyForged: header?.asset?.maxHeightPreviouslyForged ?? 0,
		maxHeightPrevoted: header?.asset?.maxHeightPrevoted ?? 0,
	},
});

export const generateBlocks = ({
	startHeight,
	numberOfBlocks,
}: {
	readonly startHeight: number;
	readonly numberOfBlocks: number;
}): Block[] => {
	return new Array(numberOfBlocks).fill(0).map((_v, index) => {
		const height = startHeight + index;
		return { header: createFakeBlockHeader({ height, version: 2 }), payload: [] };
	});
};
