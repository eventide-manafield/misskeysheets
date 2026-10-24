/*
 * SPDX-FileCopyrightText: Noctemblith contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Locale } from './autogen/locale.js';
export const noctemblithSheetTranslations: Record<string, Locale['_sheetMode']> = {
	ko: {
		title: '시트모드',
		displayMode: 'UI 표시 모드: 시트',
		description: '켜면 시트 모드, 끄면 일반 모드를 표시합니다. 계정별로 저장됩니다.',
		normal: '일반 모드로 돌아가기',
		settings: '시트 모드 설정',
		manualRefresh: '수동 갱신',
		updatedAt: '마지막 조회',
		compact: '간결한 편집기',
		fullComposer: '전체 작성 옵션',
		discard: '편집기를 닫으시겠습니까? 미전송 내용은 초안에 보존됩니다.',
		readState: '읽음 상태',
		read: '읽음',
		muted: '뮤트된 노트 표시',
		collapse: '접기',
	},
	en: {
		title: 'Spreadsheet mode',
		displayMode: 'UI display mode: spreadsheet',
		description: 'Enable for spreadsheet mode, disable for normal mode. Saved per account.',
		normal: 'Return to normal mode',
		settings: 'Spreadsheet settings',
		manualRefresh: 'Manual refresh',
		updatedAt: 'Last fetched',
		compact: 'Compact editor',
		fullComposer: 'All composer options',
		discard: 'Close this editor? Unsent content will be kept as a draft.',
		readState: 'Read status',
		read: 'Read',
		muted: 'Show muted note',
		collapse: 'Collapse',
	},
};
