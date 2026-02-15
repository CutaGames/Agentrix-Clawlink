// Expo config plugin to add <queries> to AndroidManifest.xml
// Required for Android 11+ (API 30+) to use Linking.canOpenURL()
const { withAndroidManifest } = require('@expo/config-plugins');

function withAndroidQueries(config) {
  return withAndroidManifest(config, (config) => {
    try {
      const manifest = config.modResults.manifest;

      // Schemes to query via intent filters
      const schemes = [
        'metamask',
        'okx',
        'trust',
        'rainbow',
        'twitter',
        'twitterauth',
        'discord',
        'tg',
        'telegram',
      ];

      // Package names to query directly
      const packageNames = [
        'io.metamask',
        'com.wallet.crypto.trustapp',
        'com.okinc.okex.gp',
        'me.rainbow',
        'com.twitter.android',
        'com.discord',
        'org.telegram.messenger',
      ];

      // Initialize queries array if it doesn't exist
      if (!manifest.queries) {
        manifest.queries = [];
      }

      // Add intent-filter queries for each scheme
      schemes.forEach((scheme) => {
        manifest.queries.push({
          intent: [
            {
              action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
              data: [{ $: { 'android:scheme': scheme } }],
            },
          ],
        });
      });

      // Add package queries for known apps
      packageNames.forEach((packageName) => {
        manifest.queries.push({
          package: [{ $: { 'android:name': packageName } }],
        });
      });

      return config;
    } catch (error) {
      console.error('Error in withAndroidQueries plugin:', error);
      return config;
    }
  });
}

module.exports = withAndroidQueries;
