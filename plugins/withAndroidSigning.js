const { withAppBuildGradle } = require('expo/config-plugins');

// Injects the committed release keystore into the generated android project so
// every release APK is signed with the same key. Keeping the key identical
// across builds (plus the fixed applicationId) is what lets a new APK install
// over the previous one without uninstalling, preserving user data.
const SIGNING_CONFIG = `        release {
            storeFile file('../../credentials/android/uketile-release.keystore')
            storePassword 'uketile-release-2026'
            keyAlias 'uketile-release'
            keyPassword 'uketile-release-2026'
        }
`;

function applySigning(buildGradle) {
  if (buildGradle.includes('uketile-release.keystore')) {
    return buildGradle;
  }

  const signingConfigsAnchor = /signingConfigs\s*\{\n/;
  if (!signingConfigsAnchor.test(buildGradle)) {
    throw new Error('withAndroidSigning: signingConfigs block not found in app/build.gradle');
  }
  let result = buildGradle.replace(
    signingConfigsAnchor,
    (match) => match + SIGNING_CONFIG
  );

  const releaseDebugSigning =
    /(release\s*\{[^}]*?signingConfig\s+signingConfigs\.)debug/;
  if (!releaseDebugSigning.test(result)) {
    throw new Error('withAndroidSigning: release buildType with debug signing not found in app/build.gradle');
  }
  result = result.replace(releaseDebugSigning, '$1release');

  return result;
}

module.exports = function withAndroidSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error('withAndroidSigning: expected a groovy app/build.gradle');
    }
    config.modResults.contents = applySigning(config.modResults.contents);
    return config;
  });
};
