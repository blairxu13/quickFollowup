import {ACTION} from '../../shared/types'

export function attachObserverOnce() {
    let sent = false;
    let checkTimeout: ReturnType<typeof setTimeout> | null = null;
    const initialUrl = window.location.href;
    let hasUrlChanged = false;
 
    const checkUrlChange = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== initialUrl) {
        hasUrlChanged = true;
      }
      return hasUrlChanged;
    };
    
    // WHY: Check if we're on a confirmation page by URL pattern
    const isConfirmationPage = () => {
      const url = window.location.href.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();
      
      // Common confirmation page URL patterns
      const confirmationPatterns = [
        '/confirmation',
        '/thank-you',
        '/thankyou',
        '/application-submitted',
        '/submitted',
        '/success',
        '/complete',
        '/done'
      ];
      
      return confirmationPatterns.some(pattern => 
        url.includes(pattern) || pathname.includes(pattern)
      );
    };

    const checkForConfirmation = () => {
      if (sent) return;
      

      if (!hasUrlChanged && !isConfirmationPage()) {
     
        checkUrlChange();
        return;
      }
      

      const innerText = (document.body.innerText || '').toLowerCase().trim();
      const textContent = (document.body.textContent || '').toLowerCase().trim();
      const combinedText = (innerText + ' ' + textContent).replace(/\s+/g, ' '); // Normalize whitespace
     
      const confirmationPhrases = [
        "application submitted",
        "thank you for applying",
        "thanks for applying", 
        "we've received your application",
        "we have received your application",
        "your application has been submitted",
        "application received successfully",
        "your application was submitted",
        "submitted successfully",
      
        "application received",
        "received your application"
      ];
      
     
      const matchedPhrase = confirmationPhrases.find(phrase => 
        combinedText.includes(phrase.toLowerCase())
      );
      
      if (matchedPhrase) {
        sent = true;
        if (checkTimeout) clearTimeout(checkTimeout);
        obs.disconnect();
        
        if (originalPushState) history.pushState = originalPushState;
        if (originalReplaceState) history.replaceState = originalReplaceState;
        
        chrome.storage.local.get(["pendingJob"], ({ pendingJob }) => {
          if (pendingJob) {
            console.log("[observer] confirmation detected -> sending job", pendingJob);
            chrome.runtime.sendMessage({ 
              action: ACTION.CONNECTION.APPLY_BUTTON_CLICKED, 
              job: pendingJob 
            }, () => {
              if (chrome.runtime.lastError) {
                console.warn("[observer] sendMessage error", chrome.runtime.lastError);
              }
            });
            chrome.storage.local.remove("pendingJob", () => {
              console.log("[observer] pendingJob cleared");
            });
          } else {
            console.log("[observer] confirmation detected but no pendingJob");
          }
        });
      }
    };
    
  
    const obs = new MutationObserver(() => {
      if (sent) return;
      
    
      checkUrlChange();
      
      // Clear previous timeout and set new one (debounce pattern)
      if (checkTimeout) clearTimeout(checkTimeout);
      checkTimeout = setTimeout(checkForConfirmation, 300);
    });

    obs.observe(document.body, { 
      childList: true, 
      subtree: true,
      characterData: true // Also watch for text changes
    });

    let originalPushState: typeof history.pushState | null = null;
    let originalReplaceState: typeof history.replaceState | null = null;
    
    // Store originals before overriding
    if (history.pushState) {
      originalPushState = history.pushState.bind(history);
    }
    if (history.replaceState) {
      originalReplaceState = history.replaceState.bind(history);
    }
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      checkUrlChange();
      setTimeout(checkForConfirmation, 100);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      checkUrlChange();
      setTimeout(checkForConfirmation, 100);
    };
    
    window.addEventListener('popstate', () => {
      checkUrlChange();
      setTimeout(checkForConfirmation, 100);
    });
    if (isConfirmationPage()) {
      checkForConfirmation();
    } else {
      checkUrlChange();
    }
    

    const periodicCheck = setInterval(() => {
      if (sent) {
        clearInterval(periodicCheck);
        return;
      }
      // Check URL change first
      checkUrlChange();
      // Then check for confirmation
      checkForConfirmation();
    }, 500);
    

    setTimeout(() => {
      obs.disconnect();
      clearInterval(periodicCheck);
      if (checkTimeout) clearTimeout(checkTimeout);
      
      // WHY: Restore original history methods to prevent memory leaks
      if (originalPushState) history.pushState = originalPushState;
      if (originalReplaceState) history.replaceState = originalReplaceState;
    }, 30_000);
  }
  