/*
 * SPDX-FileCopyrightText: Noctemblith contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
/** Includes confirmation, upload and API awaits in a single submission. */
export function createSheetSubmission() {
	let pending = false;
	return {
		get pending() { return pending; },
		async run(send: () => Promise<void>) {
			if (pending) return;
			pending = true;
			try {
				await send();
			} finally {
				pending = false;
			}
		},
	};
}
