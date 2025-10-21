import {ACTION} from '../../shared/types'

export function attachObserverOnce() {
    let sent = false;
    console.log("i am in observeronce")
    const obs = new MutationObserver(() => {
      if (sent) return; 
      const txt = document.body.innerText.toLowerCase();
        console.log(txt);
      if (!sent &&
          (txt.includes("application submitted")  ||
           txt.includes("thank you for applying") ||
           txt.includes("thanks for applying") ||
           txt.includes("thank you for your interest") ||
           txt.includes("received") ||
           txt.includes("submitted") ||
           txt.includes("we’ve received your application"))) {
              console.log('inside1')
        sent = true;
        obs.disconnect();
  
        chrome.storage.local.get(["pendingJob"], ({ pendingJob }) => {
          if (pendingJob) {
            chrome.runtime.sendMessage({ action: ACTION.CONNECTION.APPLY_BUTTON_CLICKED, job: pendingJob });
            chrome.storage.local.remove("pendingJob")
            console.log("✅ Application confirmed → sent job to background",pendingJob);
          }
        });
      }
    });
  
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 10_000);   // safety timeout
  }
  