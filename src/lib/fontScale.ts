import React from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet } from 'react-native';
import { getSettings } from './settingsStore';

// ─────────────────────────────────────────────────────────────────────────────
// App-wide text scaling driven by Settings → Appearance → Text Size.
//
// Rather than thread a scale factor through every StyleSheet in the app, we
// patch the render of React Native's <Text> and <TextInput> once at startup so
// any explicit `fontSize` is multiplied by the user's chosen factor. Reading
// the setting at render time means new/re-rendered screens pick up the current
// size automatically. If the internal render hook isn't available on this RN
// version, the patch safely no-ops (text just stays at its default size).
// ─────────────────────────────────────────────────────────────────────────────

export function currentFontScale(): number {
  const fs = getSettings().appearance.fontSize;
  return fs === 'small' ? 0.9 : fs === 'large' ? 1.15 : 1;
}

function patch(Comp: any) {
  if (!Comp || Comp.__ffScalePatched) return;
  const orig = Comp.render;
  if (typeof orig !== 'function') return;
  Comp.__ffScalePatched = true;
  Comp.render = function (props: any, ref: any) {
    const el = orig.call(this, props, ref);
    const scale = currentFontScale();
    if (scale === 1 || !el || !el.props) return el;
    const flat = StyleSheet.flatten(el.props.style) || {};
    if (typeof flat.fontSize === 'number') {
      return React.cloneElement(el, {
        style: [el.props.style, { fontSize: Math.round(flat.fontSize * scale) }],
      });
    }
    return el;
  };
}

export function installFontScaling() {
  patch(RNText as any);
  patch(RNTextInput as any);
}
