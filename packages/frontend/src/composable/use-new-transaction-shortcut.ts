import { useSafariDetection } from '@/composable/detect-safari';
import { onBeforeUnmount, onMounted } from 'vue';

/**
 * Plain `c` ("create"), Gmail/Linear style. Browser-reserved combos can't be
 * intercepted (Ctrl/Cmd+N, +T, +W), Option+N types a dead key on macOS, and
 * plain `n` is taken by Vimium's find-next, which swallows it before the page.
 */
export const NEW_TRANSACTION_SHORTCUT_KEY = 'c';

// Any open overlay owns the keyboard: typing `c` in a combobox search or a
// dialog must never stack a second dialog on top.
const OPEN_OVERLAY_SELECTOR = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]';

const isEditableTarget = ({ target }: { target: EventTarget | null }): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
};

export const isNewTransactionShortcut = ({ event }: { event: KeyboardEvent }): boolean => {
  if (event.defaultPrevented || event.repeat || event.isComposing) return false;
  // Modifiers mean another shortcut entirely – Cmd/Ctrl+C is copy.
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false;
  if (event.key.toLowerCase() !== NEW_TRANSACTION_SHORTCUT_KEY) return false;
  if (isEditableTarget({ target: event.target })) return false;
  return !document.querySelector(OPEN_OVERLAY_SELECTOR);
};

/**
 * Opens the new-transaction dialog on `c`. Off in the installed PWA, where
 * there is no hardware keyboard to speak of and the hint would be noise.
 */
export const useNewTransactionShortcut = ({ onTrigger }: { onTrigger: () => void }) => {
  const { isPWA } = useSafariDetection();
  const isEnabled = !isPWA;

  const onKeydown = (event: KeyboardEvent) => {
    if (!isNewTransactionShortcut({ event })) return;
    event.preventDefault();
    onTrigger();
  };

  onMounted(() => {
    if (isEnabled) window.addEventListener('keydown', onKeydown);
  });
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

  return { isEnabled, shortcutKey: NEW_TRANSACTION_SHORTCUT_KEY };
};
