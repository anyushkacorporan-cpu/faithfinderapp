import { ReactNode } from 'react';
import {
  KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, View,
  Platform, StyleProp, ViewStyle,
} from 'react-native';

/**
 * One keyboard behaviour for the whole app.
 *
 * Every screen with a text field was solving this on its own, and eight of them
 * were not solving it at all — the keyboard simply covered whatever was at the
 * bottom, which on a composer is the Post button. This is the shared piece so
 * the next screen with an input inherits the behaviour instead of re-earning it.
 *
 * WHY TWO MECHANISMS
 *
 * Tapping away to dismiss and dragging to dismiss are not the same gesture, and
 * one component cannot cover both. A ScrollView swallows taps before they reach
 * anything wrapping it, so the tap-away below only works over static content.
 * Scrolling content needs `KEYBOARD_SCROLL_PROPS` on the ScrollView itself.
 * Screens that have both want both.
 */
export function KeyboardScreen({ children, style, offset = 0, dismissOnTap = true }: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Height above the keyboard to keep clear — a fixed header, usually. */
  offset?: number;
  /** Off for screens whose content is entirely a scroll view. */
  dismissOnTap?: boolean;
}) {
  const body = dismissOnTap ? (
    // accessible={false} keeps VoiceOver from announcing the whole screen as one
    // button; the wrapper exists for the dismiss gesture, not as a control.
    <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
      <View style={{ flex: 1 }}>{children}</View>
    </TouchableWithoutFeedback>
  ) : (
    children
  );

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      // 'padding' shrinks the view on iOS so the content above the keyboard
      // stays whole; 'height' is the Android equivalent, where 'padding' fights
      // the system's own resize and leaves a gap.
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={offset}
    >
      {body}
    </KeyboardAvoidingView>
  );
}

/**
 * Spread onto any ScrollView or FlatList that sits near a text field.
 *
 * `keyboardShouldPersistTaps: 'handled'` is the one that fixes the bug people
 * actually report: without it the first tap anywhere only dismisses the
 * keyboard and is swallowed, so Post, Send and Like all need tapping twice
 * while typing. 'handled' lets the button take the tap on the first try and
 * still dismisses when the tap hits nothing.
 */
export const KEYBOARD_SCROLL_PROPS = {
  keyboardShouldPersistTaps: 'handled' as const,
  keyboardDismissMode: 'on-drag' as const,
};
