/**
 * Geometry for the floating tab bar, in one place.
 *
 * This deliberately does not live in `app/(tabs)/_layout.tsx`: the screens need
 * the clearance value, and the layout renders those screens, so importing it
 * from there is a cycle. Metro resolves cycles by handing back whatever is
 * defined at the time, which can be `undefined` — a spacer of `undefined`
 * silently collapses and content ends up under the bar.
 */
export const TAB_BAR_HEIGHT = 64;

/**
 * How far the capsule's bottom edge sits above the screen's bottom.
 *
 * Not simply the safe-area inset: on a phone with a home indicator that inset
 * is ~34pt, which parks the bar noticeably high. Sitting partway into that
 * space looks right and still leaves the indicator its own room, so the bar
 * does not fight the system gesture.
 */
export const TAB_BAR_GAP = 10;

/** Bottom offset for the capsule, given the device's safe-area inset. */
export function tabBarBottom(safeAreaBottom: number): number {
  return Math.max(safeAreaBottom - 16, TAB_BAR_GAP);
}

/** What a scrolling screen must leave free so its last item clears the bar. */
export const TAB_BAR_CLEARANCE = TAB_BAR_HEIGHT + TAB_BAR_GAP + 16;
