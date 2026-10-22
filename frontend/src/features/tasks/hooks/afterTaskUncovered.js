// Confirmation/edit dialogs can cover the card while a successful mutation
// refetches. Start the feedback clock only once those dialogs have closed.
export function afterTaskUncovered(element, callback) {
  const covered = () => element && [...document.querySelectorAll('[aria-modal="true"]')]
    .some((dialog) => !dialog.contains(element) && !dialog.closest('[aria-hidden="true"]'));
  if (!covered()) {
    callback();
    return () => {};
  }
  const observer = new MutationObserver(() => {
    if (!covered()) {
      observer.disconnect();
      callback();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-hidden", "aria-modal"] });
  return () => observer.disconnect();
}
