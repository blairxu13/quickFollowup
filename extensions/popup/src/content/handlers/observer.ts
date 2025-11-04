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
        console.log("🔄 URL changed from listing to:", currentUrl);
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
        console.log(`✅ Found confirmation phrase: "${matchedPhrase}"`);
        console.log('📍 URL changed:', hasUrlChanged);
        console.log('📍 Is confirmation page:', isConfirmationPage());
        console.log('📝 Full page text sample:', combinedText.substring(0, 200));
        
        sent = true;
        if (checkTimeout) clearTimeout(checkTimeout);
        obs.disconnect();
        
   
        if (originalPushState) history.pushState = originalPushState;
        if (originalReplaceState) history.replaceState = originalReplaceState;
        
        chrome.storage.local.get(["pendingJob"], ({ pendingJob }) => {
          if (pendingJob) {
            console.log("📤 Sending job to background:", pendingJob);
            chrome.runtime.sendMessage({ 
              action: ACTION.CONNECTION.APPLY_BUTTON_CLICKED, 
              job: pendingJob 
            });
            chrome.storage.local.remove("pendingJob");
            console.log("✅ Application confirmed → sent job to background");
          } else {
            // WHY: Warn if job data is missing - helps debug if scraping failed
            console.warn("⚠️ No pendingJob found in storage - application may have been detected but job data missing");
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
      console.log("✅ Already on confirmation page, checking immediately");
      checkForConfirmation();
    } else {
      console.log("⏳ On job listing page, waiting for URL change or confirmation");
      // Check URL change only
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
      if (!sent) {
        console.warn("⏱️ Observer timeout after 30s - no confirmation detected");
      }
      obs.disconnect();
      clearInterval(periodicCheck);
      if (checkTimeout) clearTimeout(checkTimeout);
      
      // WHY: Restore original history methods to prevent memory leaks
      if (originalPushState) history.pushState = originalPushState;
      if (originalReplaceState) history.replaceState = originalReplaceState;
    }, 30_000);
  }
  