# Onboarding backgrounds

Seven photographs, one behind each card. Drop a file in here and point the slide
at it in `src/lib/onboardingSlides.ts`:

    image: require('../../assets/images/onboarding/welcome.jpg'),

Until a slide has one it draws its gradient instead, which is a finished look
rather than a hole — so they can arrive one at a time and in any order.

**Size.** Portrait, and large enough for the biggest phone: 1290 × 2796 covers
every current iPhone. Smaller will stretch and look soft.

**Weight.** JPEG, quality around 70, under about 400 KB each. These ship inside
the app, so seven large files are seven megabytes everyone downloads.

**What reads well.** Text sits over the middle of the image with a dark scrim
above and below it. Pictures with a quiet centre work; a busy one fights the
words. Dark originals need less help than bright ones.

**Licence.** Only images there is a right to use commercially — owned,
commissioned, or from a free-for-commercial-use source. These ship inside an app
that charges for tickets, which is exactly the use a stock licence is checked
against.
