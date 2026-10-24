# Misskey Spreadsheet Mode

[![Buy Me a Coffee](https://img.shields.io/badge/Buy_Me_a_Coffee-Support_Manafield-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=000000)](https://buymeacoffee.com/manafield)

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

## CLI 설치

Node.js 22 이상과 Git이 필요합니다. 설치 대상은 실행 중인 컨테이너가 아닌 변경 사항이 없는 호스트 소스 저장소입니다.

```sh
# Linux / macOS: 경로를 생략하면 대화형으로 입력
sh install.sh "/path/to/misskey" --check
sh install.sh "/path/to/misskey"
```

```bat
rem Windows 명령 프롬프트
install.bat "C:\path to\misskey" --check
install.bat "C:\path to\misskey"
```

`--check`는 변경 없이 호환성과 적용 파일을 확인합니다. 기본 실행은 적용 전 확인을 받으며, 자동화할 때만 `--yes`로 확인을 생략하세요. 설치기는 본체·참고 패치·번역 로더를 연결하고 Git 메타데이터 디렉터리에 원본을 백업합니다. 호환되지 않는 구조나 기존 대상 파일이 있으면 중단합니다. 설치 도중 오류가 나면 변경한 파일을 원본으로 복구합니다.

소스 연결 후 번역 타입 재생성, 호스트 검사·빌드와 브라우저 검증은 별도로 진행해야 합니다. 서비스 재시작·배포는 자동 실행하지 않습니다. 모든 Misskey 버전에 자동 적용되는 설치기는 아닙니다. 자세한 절차와 수동 설치는 아래 안내를 참고하세요.

## 호스트 연결

[설치·포팅 안내 (한국어)](docs/PORTING.ko.md) · [English](docs/PORTING.md)를 참고하세요. `scripts/sync-host.mjs`는 `src/` 본체와 참고 어댑터를 호스트의 `ui/sheet/`에 설치하고 어댑터의 상대 경로를 맞춥니다.

```sh
node scripts/sync-host.mjs /absolute/path/to/misskey --check
node scripts/sync-host.mjs /absolute/path/to/misskey --write
```

동기화는 시트 본체/참고 어댑터만 복사합니다. 라우트·메뉴·작성기 연결 패치는 자동 적용하지 않으며, DB·인증·배포 설정도 수정하지 않습니다. 다른 Misskey 버전은 참고 어댑터와 패치를 맞추고 프런트엔드를 다시 빌드해야 합니다.
