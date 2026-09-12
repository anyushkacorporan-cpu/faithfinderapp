# The Google APIs, what they cost, and how to leave

FaithFinder calls three Google APIs, all with one key held in
`EXPO_PUBLIC_GOOGLE_API_KEY`:

| API | What it does here | Where |
|---|---|---|
| Places API | address autocomplete when creating an event | `src/lib/addressAutocomplete.ts` |
| Places API (New) | church search and place photos | `src/lib/googlePlaces.ts`, `src/lib/placesCache.ts` |
| Cloud Translation | the Translate button on posts | `src/lib/i18n.ts` callers, `TranslateRow` |

## Money

These are metered. Each has a monthly free allowance and charges past it, and
Google requires a billing account even to use the free part. Read the current
numbers rather than trusting any written here — Google has changed this pricing
model before: https://mapsplatform.google.com/pricing/

Two protections, and they are not the same thing:

- **A budget alert** emails you when spending passes a figure. It does not stop
  anything. Console → Billing → Budgets & alerts.
- **A quota cap** refuses requests past a daily count. This is the ceiling.
  Console → APIs & Services → the API → Quotas → requests per day.

Set the cap. An alert tells you about a bill you have already run up; a cap
means the bill cannot happen. A runaway loop in a release, or a key lifted from
the app bundle, both stop at the number you choose.

## The key is not a secret

It ships inside the app, where anyone who wants it can read it out. What limits
the damage is the restrictions on it in the console — the three APIs above, and
this app's bundle id — plus the quota cap. Rotating it is worth doing if it
turns up somewhere it should not, but rotation is not what protects it.

## Telling one refusal from another

A key restricted to iOS apps refuses every call that is not from the app,
including any test from a laptop. That refusal looks alarming and means
nothing is wrong. The way to tell it apart from a real fault is to read what
Google says rather than that it said no:

```
curl -s "https://maps.googleapis.com/maps/api/place/autocomplete/json?input=park&key=THE_KEY"
curl -s "https://translation.googleapis.com/language/translate/v2?key=THE_KEY&q=hi&target=es"
```

- *"This IP, site or mobile application is not authorized… with empty referer"*,
  or `API_KEY_IOS_APP_BLOCKED` with an empty `iosBundleId` — the restriction,
  working. The key is valid and the API is enabled. Expected from anywhere but
  the app.
- *"You must enable Billing on the Google Cloud Project"* — billing, and a real
  blocker.
- *"The provided API key is invalid"* with no further detail — a wrong or
  deleted key.

The first two are easy to confuse because both are refusals with a 403 beside
them, and reading only the status code gets it backwards.

## Leaving Google

Worth doing eventually, not urgently. The honest comparison:

**Apple MapKit** — the best fit, since this app is iOS only. Address search and
place lookup are free, with no API key and no billing account at all. Two costs:
it needs a development build instead of Expo Go, which changes how the app is
run day to day, and the three modules above need rewriting against
`MKLocalSearchCompleter` and `MKLocalSearch`. Apple also has an on-device
translation framework on recent iOS, which would replace the third API the same
way.

**OpenStreetMap** (Nominatim, Photon) — free, no account, works today. Its usage
policy is written for light traffic, its church coverage is thinner than
Google's, and there is nobody to escalate to when a result is wrong.

**Mapbox** — a close swap for address search with a free tier, but it still
means a billing account, so it does not answer the question that sends most
people looking.

The order that makes sense: cap the quota now, because it removes the risk in
ten minutes; move to MapKit when there is a calm day for it, because it removes
the vendor.
