# Running the app without Expo Go

Expo Go on iOS only ever runs the newest SDK. When Expo releases a new one,
the app on your phone updates itself and stops opening this project — which is
what happened at SDK 57. Nothing in the project broke; Expo Go simply moved on.

A development build is your own app, built once and installed like any other.
It does not update itself out from under you, and it can run the native code
Expo Go cannot — Stripe payments and push notifications among them, both of
which this app needs before launch. This was always going to be necessary; the
SDK bump only brought it forward.

## One-time setup

```
npm install                       # picks up expo-dev-client
npx eas-cli@latest login          # a free Expo account
npx eas-cli@latest init           # links this project, writes a projectId
```

## Building

Two profiles, because they cost differently.

**Simulator — free, works today**

```
npx eas-cli@latest build --profile development-simulator --platform ios
```

Runs on the iOS Simulator on the Mac. No Apple account needed. Good for most
work; no real camera, and photo picking and notifications behave differently
from a phone.

**Physical iPhone — needs an Apple Developer Program membership ($99/year)**

```
npx eas-cli@latest build --profile development --platform ios
```

Apple requires a paid membership to sign an app onto a real device. You need
the same membership to publish to the App Store, so it is not a detour — just
earlier than planned. EAS walks through registering the phone during the build.

Either build takes roughly 10–20 minutes the first time. EAS gives a link and
a QR code at the end to install it.

## Day to day

```
npx expo start --dev-client
```

Then open the FaithFinder app on the phone or simulator rather than Expo Go.
Metro, fast refresh and the terminal logs all work exactly as before.

## When to rebuild

Only when the native side changes — a new package with native code, or an
app.json change to permissions, icons, or the scheme. JavaScript and styling
changes still arrive over fast refresh with no rebuild.
