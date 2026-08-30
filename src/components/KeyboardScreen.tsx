import { ReactNode, useEffect, useState } from 'react';
import {
  Keyboard, TouchableWithoutFeedback, View, Platform, LayoutAnimation,
  StyleProp, ViewStyle, KeyboardEvent,
} from 'react-native';

/**
 * One keyboard behaviour for the whole app.
 *
 * WHY NOT KeyboardAvoidingView
 *
 * This used to wrap React Native's and it was broken in
 * two ways that only show up on a device.
 *
 * On iOS works out how far to lift by measuring its own
 * frame against the keyboard's screen coordinates. Inside a Modal presented as
 * a `pageSheet` those two are not in the same coordinate space — the sheet is
 * its own presentation, inset from the top — so the sum comes out short and the
 * bottom of the composer stays under the keyboard. Seven of this app's text
 * fields live in pageSheet modals, which is to say most of the ones anyone
 * types in.
 *
 * On Android it did nothing at all. The fourteen screens using it passed
 * `behavior={undefined}`, which is correct only when the window itself resizes
 * for the keyboard — and `edgeToEdgeEnabled` (on by default in SDK 54, and set
 * explicitly in app.json) stops it doing that.
 *
 * So this measures nothing. It reads the keyboard's own height from the event
 * and pads the bottom by exactly that. A container whose bottom edge is the
 * bottom of the screen — every screen and sheet here — lifts correctly with no
 * coordinate maths to get wrong, on both platforms and in any presentation.
 */
export function KeyboardScreen({ children, style, offset = 0, dismissOnTap = true }: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Added to the padding. Pass a negative safe-area inset on a container that
   * already reserves the home-indicator strip, since the keyboard's reported
   * height covers that strip too and it would otherwise be counted twice.
   */
  offset?: number;
  /**
   * Tap anywhere over static content to dismiss. Off only where the content is
   * entirely a scroll view, which takes the tap first and makes the wrapper a
   * dead layer.
   */
  dismissOnTap?: boolean;
}) {
  const [pad, setPad] = useState(0);

  useEffect(() => {
    // 'will' events fire before the keyboard moves and carry the system's own
    // duration, so the layout travels with it instead of snapping afterwards.
    // Android has no 'will' pair and animates the resize itself.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    function apply(next: number, duration?: number) {
      if (Platform.OS === 'ios') {
        LayoutAnimation.configureNext({
          duration: duration || 250,
          update: { type: LayoutAnimation.Types.keyboard },
        });
      }
      setPad(next);
    }

    const show = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      const height = e.endCoordinates?.height ?? 0;
      apply(Math.max(0, height + offset), e.duration);
    });
    const hide = Keyboard.addListener(hideEvent, (e: KeyboardEvent) => {
      apply(0, e?.duration);
    });

    return () => { show.remove(); hide.remove(); };
  }, [offset]);

  const content = <View style={[{ flex: 1 }, style, { paddingBottom: pad }]}>{children}</View>;

  return dismissOnTap ? (
    // accessible={false} keeps VoiceOver from announcing the screen as one
    // button; this exists for the gesture, not as a control.
    <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
      {content}
    </TouchableWithoutFeedback>
  ) : (
    content
  );
}

/**
 * Spread onto any ScrollView or FlatList that sits near a text field.
 *
 * `keyboardShouldPersistTaps: 'handled'` is the one that fixes the bug people
 * actually report: without it the first tap anywhere only dismisses the
 * keyboard and is swallowed, so Post, Send and Like all need tapping twice
 * while typing. 'handled' lets the button take the tap on the first try and
 * still dismisses when the tap hits nothing. `on-drag` covers the other
 * gesture — a scroll view swallows taps before they reach the wrapper above,
 * so dragging is how you dismiss over scrolling content.
 */
export const KEYBOARD_SCROLL_PROPS = {
  keyboardShouldPersistTaps: 'handled' as const,
  keyboardDismissMode: 'on-drag' as const,
};
