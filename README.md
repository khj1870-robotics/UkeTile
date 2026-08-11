# UkeTile

우쿨렐레 코드 진행을 마디 위에 배치해 곡을 만들고, BPM에 맞춰 현재/다음 코드와 운지법을 자동으로 넘겨가며 연주할 수 있는 코드 조합기 앱.

- 곡은 마디(4/4, 8개의 반박 slot) 단위 타이밍 그리드로 구성 — 자유 좌표 배치가 아님
- Root Note(C D E F G A B + ♯/♭) → 코드 종류(Major/Minor/7/...) 순으로 코드 선택
- 코드 블록을 탭으로 마디에 배치, 드래그로 이동·리사이즈(반박 단위 스냅)
- 스트로크 프리셋(기본/팝/발라드/커스텀)에 따라 코드 하나가 여러 번 스트럼
- 연주 화면: 큰 현재 코드 + 가로형 운지법, 다음 코드 미리보기, 진행 타임라인
- 메트로놈 ON/OFF와 코드 사운드 ON/OFF를 완전히 독립적으로 제어 (합성 샘플, 라이선스 이슈 없음)
- 곡은 기기에 자동 저장 (재시작 후에도 유지)

## 로컬 실행

```bash
npm install
npm start        # Expo Go 또는 시뮬레이터로 QR/키 입력 실행
npm run android  # 연결된 기기/에뮬레이터
npm run ios      # macOS + Xcode 시뮬레이터
```

## 테스트 / 타입체크

```bash
npm test         # jest: 코드 이론, 타이밍 그리드 스냅/충돌, 재생 엔진 타임라인/스케줄러, 스토어, 다이어그램 렌더링
npm run typecheck
```

## 사운드 샘플 재생성

`assets/samples/*.wav`(노트 + 메트로놈 클릭)와 `src/data/sampleMap.ts` / `src/data/clickSamples.ts`는 아래 스크립트로 생성된 결과물이며 저장소에 커밋되어 있습니다. 재생성이 필요할 때만 실행하세요.

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
  app/            expo-router 화면
                    index(홈), new-song(새 곡), settings(설정)
                    song/[id]/edit(편집 화면), song/[id]/play(연주 화면)
  components/     ChordDiagram, ChordPalette, MiniChordCard, StaffMeasure, ChordBlockTile,
                  ChordBottomSheet, TransportBar, CurrentChordPanel, NextChordPreview,
                  PerformanceTimeline, PlaybackControls
  data/           코드 라이브러리(chords.ts), 곡 데이터 모델(song.ts), 스트로크 프리셋(strokePatterns.ts),
                  샘플 매핑(sampleMap.ts, clickSamples.ts — 생성됨)
  lib/            순수 로직 — chordTheory/chordNotes(코드→음·운지), timingGrid(슬롯 스냅/충돌),
                  playbackEngine(타임라인 계산 + 재생 스케줄러), player/metronome(사운드)
  state/          zustand 스토어 — songStore(곡, AsyncStorage persist), settingsStore(왼손잡이/카운트인)
plugins/          Android 서명 config plugin
scripts/          사운드 샘플 생성 스크립트
credentials/      Android 릴리스 keystore (커밋됨, 동일 서명 유지용)
```
