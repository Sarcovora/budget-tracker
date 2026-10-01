import { isNewTransactionShortcut } from '@/composable/use-new-transaction-shortcut';
import { afterEach, describe, expect, it } from 'vitest';

const pressOn = ({ target, init = {} }: { target: EventTarget; init?: KeyboardEventInit }) => {
  let captured: KeyboardEvent | undefined;
  const listener = (event: Event) => (captured = event as KeyboardEvent);
  window.addEventListener('keydown', listener);
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true, ...init }));
  window.removeEventListener('keydown', listener);
  return captured!;
};

const mount = ({ html }: { html: string }) => {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  return wrapper.firstElementChild as HTMLElement;
};

describe('isNewTransactionShortcut', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('fires on a plain c from the page body', () => {
    expect(isNewTransactionShortcut({ event: pressOn({ target: document.body }) })).toBe(true);
  });

  it('accepts an uppercase C from caps lock (no shift held)', () => {
    expect(isNewTransactionShortcut({ event: pressOn({ target: document.body, init: { key: 'C' } }) })).toBe(true);
  });

  it.each([
    ['meta (Cmd+C copy)', { metaKey: true }],
    ['ctrl', { ctrlKey: true }],
    ['alt', { altKey: true }],
    ['shift', { shiftKey: true, key: 'C' }],
    ['key auto-repeat', { repeat: true }],
    ['IME composition', { isComposing: true }],
    ['other keys', { key: 'n' }],
  ])('ignores %s', (_label, init) => {
    expect(isNewTransactionShortcut({ event: pressOn({ target: document.body, init }) })).toBe(false);
  });

  it.each([
    ['input', '<input />'],
    ['textarea', '<textarea></textarea>'],
    ['select', '<select></select>'],
  ])('ignores typing in a %s', (_label, html) => {
    expect(isNewTransactionShortcut({ event: pressOn({ target: mount({ html }) }) })).toBe(false);
  });

  it('ignores typing in a contenteditable element', () => {
    const el = mount({ html: '<div contenteditable="true"></div>' });
    // jsdom does not derive isContentEditable from the attribute.
    Object.defineProperty(el, 'isContentEditable', { value: true });
    expect(isNewTransactionShortcut({ event: pressOn({ target: el }) })).toBe(false);
  });

  it.each(['dialog', 'alertdialog', 'menu', 'listbox'])('ignores the key while a %s is open', (role) => {
    mount({ html: `<div role="${role}"></div>` });
    expect(isNewTransactionShortcut({ event: pressOn({ target: document.body }) })).toBe(false);
  });

  it('ignores an event another handler already consumed', () => {
    const event = new KeyboardEvent('keydown', { key: 'c', cancelable: true });
    event.preventDefault();
    expect(isNewTransactionShortcut({ event })).toBe(false);
  });
});
