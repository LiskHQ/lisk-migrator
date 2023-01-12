/*
 * Copyright © 2023 Lisk Foundation
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
// var exec = require('child_process').exec;
// var child;
import { exec } from 'child_process';
import { createServer } from 'net';

type Port = number;

const isPortAvailable = async (port: number): Promise<boolean> =>
	new Promise((resolve, reject) => {
		const server = createServer();

		server.once('error', (err: { code: string }) => {
			if (err.code === 'EADDRINUSE') {
				// port is currently in use
				resolve(false);
			} else {
				reject(err.code);
			}
		});

		server.once('listening', () => {
			// close the server if listening doesn't fail
			server.close(() => resolve(true));
		});

		server.listen(port);
	});

isPortAvailable(9901);

const execAsync = async (cmd: string): Promise<string> =>
	new Promise((resolve, reject) => {
		exec(cmd, (error, stdout) => {
			if (error) {
				reject(error);
				return;
			}
			resolve(stdout);
		});
	});

export const installLiskCore = async (): Promise<string> => execAsync('npm i -g lisk-core');

export const startLiskCore = async (configPath: string): Promise<void> => {
	configPath.slice();
	// Figureout required port from the config path
	const requiredPort: Port = 0;

	if (!(await isPortAvailable(requiredPort))) {
		throw new Error(`Required ports are not available! required ports:${requiredPort}`);
	}
	await execAsync('lisk-core start --network devnet --api-ipc --log info');
};