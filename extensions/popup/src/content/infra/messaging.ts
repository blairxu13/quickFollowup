import {ACTION} from '../../shared/types';
import {attachObserverOnce} from '../handlers/observer';
import {scrapeJobInfoEarly} from '../handlers/scrapeJob';
import {extractLinkedInLinks} from '../handlers/extractlinks';

chrome.runtime.onMessage.addListener((msg) => {
    //connection between background and content
if (msg == ACTION.CONNECTION.START_OBSERVING) {
        scrapeJobInfoEarly();
        attachObserverOnce();
        return true;

    } else if (msg == ACTION.RECRUITER.RECRUITER_LINKS_FOUND) {
        chrome.runtime.sendMessage({ action: "close_this_tab" });

    } else if (msg == ACTION.RECRUITER.READY_TO_CONNECT) {
        console.log("📥 start prefilling _ready to connect");
    
        const observer = new MutationObserver(() => {
          // const currentURL = window.location.href;
           const connectBox = document.querySelector("textarea#custom-message");;
            connectBox.value = msg.body ;
            connectBox.dispatchEvent(new Event("input", { bubbles: true }));
            console.log("✅ Prefilled Sales Navigator message");
            observer.disconnect();
          
        });
    
        observer.observe(document.body, { childList: true, subtree: true });
    
        // Stop after 10s if not found
        setTimeout(() => {
          console.warn("⏱️ Timeout: message UI not found.");
          observer.disconnect();
        }, 10000);
    
    

    } 

});

if (
    window.location.hostname === "www.google.com" &&
    window.location.pathname === "/search"
    //needs to add more condition here
  ) {
    chrome.storage.local.get(["shouldRunExtractor", "draftSubject", "draftBody"], (res) => {
      if (res.shouldRunExtractor) {
        console.log("🟢 Trigger conditions met. Extracting...");
        chrome.storage.local.remove("shouldRunExtractor"); // clear so it doesn't retrigger
  
        setTimeout(() => {
          extractLinkedInLinks(res.draftSubject, res.draftBody);
        }, 2000);
      }
    });
  }
  



  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data.type === "dm_check_result") {
      chrome.runtime.sendMessage({
        action: event.data.dmable ? "recruiter_dm_ready" : "recruiter_not_dmable"
      });
    }
  });
  