/**
 * Geometry for the floating tab bar, in one place.
 *
 * This deliberately does not live in `app/(tabs)/_layout.tsx`: the screens need
 * the clearance value, and the layout renders those screens, so importing it
 * from there is a cycle. Metro resolves cycles by handing back whatever is
 * defined at the time, which can be `undefined` — a spacer of `undefined`
 * silently collapses and content ends up under the bar.
 */
export const TAB_BAR_HEIGHT = 62;

/** Gap between the capsule and the safe-area edge below it. */
export const TAB_BAR_GAP = 10;

/** What a scrolling screen must leave free so its last item clears the bar. */
export const TAB_BAR_CLEARANCE = TAB_BAR_HEIGHT + TAB_BAR_GAP + 16;
