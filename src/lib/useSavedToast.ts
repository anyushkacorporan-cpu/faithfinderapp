import { useRef } from 'react';
import { useToast } from '../components/Toast';

/**
 * A "saved" confirmation for settings screens.
 *
 * Settings apply the moment a switch moves, so each change deserves an
 * acknowledgement - but toasts queue rather than replace, and someone going
 * down a list flipping four switches would stack four of them. This suppresses
 * a second confirmation within a short window, so a burst of changes reads as
 * one "Saved" rather than a pile.
 */
export function useSavedToast(message = 'Your settings have been updated.') {
  const { showToast } = useToast();
  const last = useRef(0);
  return function confirmSaved() {
    const now = Date.now();
    if (now - last.current < 1500) return;
    last.current = now;
    showToast('Saved', message, 'success');
  };
}
