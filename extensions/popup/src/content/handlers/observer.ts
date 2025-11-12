import { ACTION } from '../../shared/types'

export function attachObserverOnce() {
  let sent = false;
  let checkTimeout: ReturnType<typeof setTimeout> | null = null;
  const initialUrl = window.location.href;
  let hasUrlChanged = false;

  const checkUrlChange = () => {
    const currentUrl = window.location.href;
    if (currentUrl !== initialUrl) {
      hasUrlChanged = true;
      console.log("[URL Change] URL changed to:", currentUrl);
    }
    return hasUrlChanged;
  };

  const isConfirmationPage = () => {
    const url = window.location.href.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();
    const confirmationPatterns = [
      '/confirmation', '/thank-you', '/thankyou',
      '/application-submitted', '/submitted',
      '/success', '/complete', '/done', '/thanks'
    ];
    return confirmationPatterns.some(pattern =>
      url.includes(pattern) || pathname.includes(pattern)
    );
  };

  const checkForConfirmation = () => {
    console.log("[checkForConfirmation] running");
    if (sent) return;

    const ashbySuccessNode = document.querySelector('[class*="ashby-application-form-success-container"]');
    console.log("[Ashby check] Found:", !!ashbySuccessNode, ashbySuccessNode);

    if (ashbySuccessNode) {
      console.log("[✅ SUCCESS DETECTED] Ashby success node found!");
      sent = true;
      if (checkTimeout) clearTimeout(checkTimeout);
      obs.disconnect();

      if (originalPushState) history.pushState = originalPushState;
      if (originalReplaceState) history.replaceState = originalReplaceState;

      chrome.storage.local.get(["pendingJob"], ({ pendingJob }) => {
        console.log("[Storage] Retrieved pendingJob:", pendingJob);
        if (pendingJob) {
          console.log("[Message] Sending APPLY_BUTTON_CLICKED with job:", pendingJob);
          chrome.runtime.sendMessage({
            action: ACTION.CONNECTION.APPLY_BUTTON_CLICKED,
            job: pendingJob
          });
          chrome.storage.local.remove("pendingJob");
        }
      });
      return;
    }

    // Check for Lever.co submission (URL ends with /thanks)
    const currentUrl = window.location.href;
    const pathname = window.location.pathname;
    const isLeverSite = currentUrl.includes("jobs.lever.co");
    const isLeverThanks = pathname.endsWith("/thanks");
    console.log("[Lever check] URL:", currentUrl, "pathname:", pathname, "isLeverSite:", isLeverSite, "isLeverThanks:", isLeverThanks);

    if (isLeverSite && isLeverThanks) {
      console.log("[✅ SUCCESS DETECTED] Lever.co /thanks page detected!");
      sent = true;
      if (checkTimeout) clearTimeout(checkTimeout);
      obs.disconnect();

      if (originalPushState) history.pushState = originalPushState;
      if (originalReplaceState) history.replaceState = originalReplaceState;

      chrome.storage.local.get(["pendingJob"], ({ pendingJob }) => {
        console.log("[Storage] Retrieved pendingJob:", pendingJob);
        if (pendingJob) {
          console.log("[Message] Sending APPLY_BUTTON_CLICKED with job:", pendingJob);
          chrome.runtime.sendMessage({
            action: ACTION.CONNECTION.APPLY_BUTTON_CLICKED,
            job: pendingJob
          });
          chrome.storage.local.remove("pendingJob");
        }
      });
      return;
    }

    if (!hasUrlChanged && !isConfirmationPage()) {
      checkUrlChange();
      return;
    }

    const innerText = (document.body.innerText || '').toLowerCase().trim();
    const textContent = (document.body.textContent || '').toLowerCase().trim();
    const combinedText = (innerText + ' ' + textContent).replace(/\s+/g, ' ');

    const confirmationPhrases = [
      "application submitted", "thank you for applying",
      "thanks for applying", "we've received your application",
      "we have received your application",
      "your application has been submitted",
      "application received successfully",
      "your application was submitted",
      "submitted successfully", "application received",
      "received your application"
    ];

    const matchedPhrase = confirmationPhrases.find(phrase =>
      combinedText.includes(phrase.toLowerCase())
    );
    console.log("[Text check] Matched phrase:", matchedPhrase);

    if (matchedPhrase) {
      console.log("[✅ SUCCESS DETECTED] Text-based confirmation found!");
      sent = true;
      if (checkTimeout) clearTimeout(checkTimeout);
      obs.disconnect();

      if (originalPushState) history.pushState = originalPushState;
      if (originalReplaceState) history.replaceState = originalReplaceState;

      chrome.storage.local.get(["pendingJob"], ({ pendingJob }) => {
        console.log("[Storage] Retrieved pendingJob:", pendingJob);
        if (pendingJob) {
          console.log("[Message] Sending APPLY_BUTTON_CLICKED with job:", pendingJob);
          chrome.runtime.sendMessage({
            action: ACTION.CONNECTION.APPLY_BUTTON_CLICKED,
            job: pendingJob
          });
          chrome.storage.local.remove("pendingJob");
        }
      });
    }
  };

  const obs = new MutationObserver(() => {
    console.log("[Observer] DOM changed");
    if (sent) return;
    checkUrlChange();
    if (checkTimeout) clearTimeout(checkTimeout);
    checkTimeout = setTimeout(checkForConfirmation, 300);
  });

  obs.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  let originalPushState: typeof history.pushState | null = null;
  let originalReplaceState: typeof history.replaceState | null = null;

  if (history.pushState) originalPushState = history.pushState.bind(history);
  if (history.replaceState) originalReplaceState = history.replaceState.bind(history);

  history.pushState = function (...args) {
    console.log("[History] pushState triggered");
    originalPushState!.apply(history, args);
    checkUrlChange();
    setTimeout(checkForConfirmation, 100);
  };

  history.replaceState = function (...args) {
    console.log("[History] replaceState triggered");
    originalReplaceState!.apply(history, args);
    checkUrlChange();
    setTimeout(checkForConfirmation, 100);
  };

  window.addEventListener('popstate', () => {
    console.log("[History] popstate triggered");
    checkUrlChange();
    setTimeout(checkForConfirmation, 100);
  });

  if (isConfirmationPage()) {
    console.log("[Init] Detected confirmation page immediately");
    checkForConfirmation();
  } else {
    console.log("[Init] Not a confirmation page, starting observer");
    checkUrlChange();
  }

  const periodicCheck = setInterval(() => {
    if (sent) {
      clearInterval(periodicCheck);
      return;
    }
    checkUrlChange();
    checkForConfirmation();
  }, 500);

  // setTimeout(() => {
  //   console.log("[Cleanup] 30s timeout reached, disconnecting observer");
  //   obs.disconnect();
  //   clearInterval(periodicCheck);
  //   if (checkTimeout) clearTimeout(checkTimeout);
  //   if (originalPushState) history.pushState = originalPushState;
  //   if (originalReplaceState) history.replaceState = originalReplaceState;
  // }, 30_000);
}
