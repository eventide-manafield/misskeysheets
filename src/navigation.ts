/*
 * SPDX-FileCopyrightText: Noctemblith contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
/** Only shell visibility; route authentication still belongs to the host router. */
export function sheetShellState(signedIn: boolean, preferred: boolean, routeName: string | undefined) {
	const mounted = signedIn && (preferred || routeName === 'spreadsheet');
	return { mounted, visible: mounted && (routeName === 'spreadsheet' || (preferred && routeName === 'index')) };
}
