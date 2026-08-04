# UkeTile

우쿨렐레 코드를 타일처럼 드래그해서 대시보드에 배치하고 저장하는 코드 조합기 앱.

- 코드 선택 → 소리 미리듣기 (Karplus-Strong 합성 샘플)
- 팔레트에서 대시보드로 드래그 → 자석처럼 가장 가까운 빈 칸에 스냅
- 여러 타일을 선택해 한번에 복제 / 삭제
- 보드 상태는 기기에 자동 저장 (재시작 후에도 유지)

## 로컬 실행

```bash
npm install
npm start        # Expo Go 또는 시뮬레이터로 QR/키 입력 실행
npm run android  # 연결된 기기/에뮬레이터
npm run ios      # macOS + Xcode 시뮬레이터
```

## 테스트 / 타입체크

```bash
npm test         # jest: 코드→음 계산, 그리드 스냅/복제, 스토어, 다이어그램 렌더링
npm run typecheck
```

## 사운드 샘플 재생성

`assets/samples/*.wav`와 `src/data/sampleMap.ts`는 아래 스크립트로 생성된 결과물이며 저장소에 커밋되어 있습니다. 재생성이 필요할 때만 실행하세요.

```bash
npm run generate:samples
```

## Android 릴리스 APK 빌드 (앱스토어 업데이트용)

이 프로젝트는 **EAS Update(OTA)를 사용하지 않습니다.** 대신 기존 설치를 유지한 채 위에 덮어 설치 가능한 릴리스 APK를 로컬에서 직접 빌드합니다. 이를 위한 3가지 전제 조건을 고정해 둡니다:

1. **`applicationId` 고정** — `app.json`의 `android.package = "com.khj1870.uketile"`. 절대 변경하지 마세요. 이 값이 바뀌면 Android가 별개의 새 앱으로 인식해 기존 앱 위에 설치할 수 없습니다.
2. **서명키 고정** — `credentials/android/uketile-release.keystore`(저장소에 커밋됨)가 모든 릴리스 빌드에 항상 동일하게 사용됩니다. `plugins/withAndroidSigning.js` config plugin이 `expo prebuild` 시 이 keystore를 `android/app/build.gradle`의 release 서명 설정에 자동으로 주입합니다. 서명키가 다르면 Android가 설치를 거부합니다.
3. **`versionCode` 증가** — 새 APK를 배포할 때마다 `app.json`의 `android.versionCode`를 이전 값보다 큰 정수로 올려야 합니다. 같은 값이나 더 낮은 값은 업데이트 설치가 거부됩니다. (`android.versionCode`와 함께 사용자에게 보이는 `expo.version`도 올려주는 것을 권장합니다.)

빌드 절차:

```bash
# app.json에서 android.versionCode를 이전보다 높게 수정한 뒤:
npm run build:apk
# = expo prebuild --platform android --clean && cd android && ./gradlew assembleRelease
```

결과물: `android/app/build/outputs/apk/release/app-release.apk`

이 APK를 기존 앱이 설치된 기기에 그대로 설치(adb install 또는 파일 전송 후 실행)하면 삭제 없이 업데이트되고, `AsyncStorage`에 저장된 보드/타일 데이터도 그대로 유지됩니다.

> keystore 비밀번호는 데모용으로 코드에 하드코딩되어 있습니다(`plugins/withAndroidSigning.js`). 실제 배포 전에는 환경변수나 CI 시크릿으로 옮기는 것을 권장합니다.

## iOS 빌드

iOS는 Apple 정책상 항상 App Store Connect 심사를 거쳐야 하며, 로컬 `.ipa` 재설치만으로는 업데이트할 수 없습니다. Xcode 또는 EAS Build로 아카이브 후 App Store Connect에 업로드하세요. `app.json`의 `ios.bundleIdentifier`(`com.khj1870.uketile`)를 고정하고 `ios.buildNumber`를 매 제출마다 올리면 됩니다.

## 프로젝트 구조

```
src/
  app/            expo-router 화면 (_layout, index)
  components/     ChordDiagram, TileCard, DraggableTile, Board, Palette, ...
  data/           코드 라이브러리(chords.ts), 샘플 매핑(sampleMap.ts, 생성됨)
  hooks/          드래그 보드 좌표/고스트 상태 훅
  lib/            순수 로직 — chordNotes(코드→음), grid(스냅/복제), player(사운드)
  state/          zustand 보드 스토어 (AsyncStorage persist)
plugins/          Android 서명 config plugin
scripts/          사운드 샘플 생성 스크립트
credentials/      Android 릴리스 keystore (커밋됨, 동일 서명 유지용)
```
