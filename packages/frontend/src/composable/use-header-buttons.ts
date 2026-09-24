import { createSharedComposable, useLocalStorage } from '@vueuse/core';

/**
 * Per-device visibility of the optional buttons in the app header, toggled from
 * Settings → Appearance.
 *
 * localStorage rather than UserSettings: which of these is worth its space is a
 * property of the screen the header is being read on — a self-hosted instance
 * with no bank connections gets nothing from the sync button on a phone, while
 * the same account on a wide desktop display has room to spare.
 *
 * Only buttons that are safe to lose are listed here. The sync button's
 * error states (a connection needing re-link) ignore this and always render.
 *
 * The header's Support button has its own account-wide setting
 * (`useSupportButton`) and is deliberately not duplicated here.
 */
export const useHeaderButtons = createSharedComposable(() => ({
  /** Opens the feedback dialog. */
  isFeedbackVisible: useLocalStorage('header:feedback-visible', true),
  /** Bank-connection sync status and the "Connect bank" entry point. */
  isBankSyncVisible: useLocalStorage('header:bank-sync-visible', true),
}));
