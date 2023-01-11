/*
 * Copyright © 2020 Lisk Foundation
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

import cli from 'cli-ux';
import { Block, BlockHeader } from '@liskhq/lisk-chain';
import { getAPIClient } from '../client';
import { NETWORKS } from '../constants';

let blockIDAtSnapshotHeight: string;
let TOKEN_ID_LSK: string;
let HEIGHT_PREVIOUS_SNAPSHOT_BLOCK: number;

interface ObserveParams {
	readonly label: string;
	readonly height: number;
	readonly liskCorePath: string;
	readonly delay: number;
	readonly isFinal: boolean;
}

export const getTokenIDLisk = (): string => TOKEN_ID_LSK;

export const setTokenIDLisk = async (networkIdentifier: string): Promise<void> => {
	TOKEN_ID_LSK = NETWORKS[networkIdentifier].tokenID;
};

export const getSnapshotHeightPrevBlock = (): number => HEIGHT_PREVIOUS_SNAPSHOT_BLOCK;

export const setSnapshotHeightPrevBlock = async (networkIdentifier: string): Promise<void> => {
	HEIGHT_PREVIOUS_SNAPSHOT_BLOCK = NETWORKS[networkIdentifier].snapshotHeightPrevBlock;
};

export const getNodeInfo = async (
	liskCorePath: string,
): Promise<{ height: number; finalizedHeight: number }> => {
	const client = await getAPIClient(liskCorePath);
	const { height, finalizedHeight, networkIdentifier } = await client.node.getNodeInfo();
	await setTokenIDLisk(networkIdentifier);
	return { height, finalizedHeight };
};

export const setBlockIDAtSnapshotHeight = async (
	liskCorePath: string,
	height: number,
): Promise<void> => {
	const client = await getAPIClient(liskCorePath);
	const result = (await client.block.getByHeight(height)) as Record<string, Block>;
	const blockHeader = (result.header as unknown) as BlockHeader;
	blockIDAtSnapshotHeight = blockHeader.id.toString('hex');
};

export const getBlockIDAtSnapshotHeight = (): string => blockIDAtSnapshotHeight;

export const getBlockIDAtHeight = async (liskCorePath: string, height: number): Promise<string> => {
	const client = await getAPIClient(liskCorePath);
	const result: Record<string, unknown> = await client.block.getByHeight(height);
	const blockHeader = (result.header as unknown) as BlockHeader;
	const blockID = blockHeader.id.toString('hex');
	return blockID;
};

const secondsToHumanString = (seconds: number): string => {
	const years = Math.floor(seconds / 31536000);
	const days = Math.floor((seconds % 31536000) / 86400);
	const hours = Math.floor(((seconds % 31536000) % 86400) / 3600);
	const minutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
	const numSeconds = (((seconds % 31536000) % 86400) % 3600) % 60;

	const result = [];

	if (years > 0) {
		result.push(`${years}y`);
	}

	if (days > 0) {
		result.push(`${days}d`);
	}

	if (hours > 0) {
		result.push(`${hours}h`);
	}

	if (minutes > 0) {
		result.push(`${minutes}m`);
	}

	if (numSeconds > 0) {
		result.push(`${numSeconds}s`);
	}

	if (result.length === 0) {
		return '0';
	}

	return result.join(' ');
};

const getRemainingTime = (currentHeight: number, observedHeight: number): string =>
	secondsToHumanString((observedHeight - currentHeight) * 10);

export const observeChainHeight = async (options: ObserveParams): Promise<number> => {
	const observedHeight = options.height;
	const startHeight = options.isFinal
		? (await getNodeInfo(options.liskCorePath)).finalizedHeight
		: (await getNodeInfo(options.liskCorePath)).height;

	if (startHeight === observedHeight) {
		return startHeight;
	}

	if (startHeight > observedHeight) {
		throw new Error(`Chain height: ${startHeight} crossed the observed height: ${observedHeight}`);
	}

	const progress = cli.progress({
		format: `${options.label}: [{bar}] {percentage}% | Remaining: {remaining}/{total} | Height: {height}/${observedHeight} | ETA: {timeLeft}`,
		fps: 2,
		synchronousUpdate: false,
		etaAsynchronousUpdate: false,
		barsize: 30,
	});

	progress.start(observedHeight - startHeight, 0, {
		timeLeft: getRemainingTime(startHeight, observedHeight),
		remaining: observedHeight - startHeight,
		height: startHeight,
	});

	await new Promise((resolve, reject) => {
		let intervalId: NodeJS.Timer;

		// eslint-disable-next-line consistent-return
		const checkHeight = async () => {
			let height!: number;
			try {
				height = options.isFinal
					? (await getNodeInfo(options.liskCorePath)).finalizedHeight
					: (await getNodeInfo(options.liskCorePath)).height;
			} catch (error) {
				return reject(error);
			}

			progress.update(height - startHeight, {
				timeLeft: getRemainingTime(height, observedHeight),
				remaining: observedHeight - height,
				height,
			});

			if (height === observedHeight) {
				clearInterval(intervalId);
				return resolve(height);
			}

			if (height > observedHeight) {
				return reject(
					new Error(`Chain height: ${height} crossed the observed height: ${observedHeight}`),
				);
			}
		};

		intervalId = setInterval(checkHeight, options.delay);
	});

	progress.stop();

	return observedHeight;
};
