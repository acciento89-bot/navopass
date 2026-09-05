# NavoPass Android / Google Play

## Release identity

- App: NavoPass
- Package: `de.kamilunavo.navopass`
- Version: `1.0.1`
- versionCode: `6`
- Target SDK: Android 16 / API 36
- Distribution: Android App Bundle (`.aab`)

## Native scope

The Android app is a native Jetpack Compose implementation of the SwiftUI product. It uses the same authenticated mobile API and includes:

- secure session restoration and sign-out
- passes overview, search, creation and detail views
- service and warranty overview
- native Google Code Scanner for NavoPass QR codes
- shared-pass deep links
- automatic German/English language selection
- account and legal links
- in-app permanent account deletion

No WebView is used for the primary app experience.

## Play Console checklist

1. Create the app with package `de.kamilunavo.navopass`.
2. Publish the business support contact details and business phone number.
3. Set privacy policy to `https://navopass.de/datenschutz`.
4. Set account deletion URL to `https://navopass.de/konto-loeschen`.
5. Upload the signed release AAB to Internal testing first.
6. Complete Data safety for account data, asset/pass data and optional professional contact data.
7. Declare the QR scanner; Google Code Scanner performs on-device scanning without app camera permission.
8. Verify `https://navopass.de/p/...` App Links after Play signing fingerprints are available.
