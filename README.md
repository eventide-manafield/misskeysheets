# Misskey Spreadsheet Mode

Misskey 계열 프런트엔드에 메뉴 버튼으로 진입하는 시트 UI를 추가하는 소스 모듈입니다.

- 홈·로컬·소셜·글로벌·알림 시트, 수동 갱신과 조회 캐시
- 셀에서 원본 노트에 답글 작성, 독립 새 노트 작성
- 호스트의 작성기·MFM·CW·미디어·권한 로직 재사용
- Vue 3.5 이상, 호환 `misskey-js` 타입, SCSS 지원 필요
- 라이선스: AGPL-3.0-only ([COPYING](COPYING))

## 구조

`src/`는 호스트 API/라우터/인증에 직접 의존하지 않는 본체입니다. `adapters/misskey.ts`는 Noctemblith에서 사용하는 참고 어댑터이며, `integration/`에는 호스트 연결 패치와 진입 파일이 있습니다. 본체의 `SheetHost`에 각 포크의 API·작성기·렌더러를 주입합니다.

## 개발

```sh
npm install
npm test
npm run typecheck
npm run build
```

호환 `misskey-js` 패키지/워크스페이스 타입은 소비 호스트에서 제공해야 합니다. 의존성과 빌드 결과물은 Git에 포함하지 않습니다.

## 호스트 연결

[설치·포팅 안내 (한국어)](docs/PORTING.ko.md) · [English](docs/PORTING.md)를 참고하세요. `scripts/sync-host.mjs`는 `src/` 본체와 참고 어댑터를 호스트의 `ui/sheet/`에 설치하고 어댑터의 상대 경로를 맞춥니다.

```sh
node scripts/sync-host.mjs /absolute/path/to/misskey --check
node scripts/sync-host.mjs /absolute/path/to/misskey --write
```

동기화는 시트 본체/참고 어댑터만 복사합니다. 라우트·메뉴·작성기 연결 패치는 자동 적용하지 않으며, DB·인증·배포 설정도 수정하지 않습니다. 다른 Misskey 버전은 참고 어댑터와 패치를 맞추고 프런트엔드를 다시 빌드해야 합니다.
