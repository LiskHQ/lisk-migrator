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
import { createServer } from 'net';

import { Port } from '../types';

export const isPortAvailable = async (port: Port): Promise<boolean | Error> =>
	new Promise((resolve, reject) => {
		const server = createServer();

		server.once('error', (err: { code: string }) => {
			if (err.code === 'EADDRINUSE') {
				// Port is currently in use
				resolve(false);
			} else {
				reject(err);
			}
		});

		server.once('listening', () => {
			// Close the server if listening doesn't fail
			server.close(() => resolve(true));
		});

		server.listen(port);
	});