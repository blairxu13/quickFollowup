import { ACTION } from '../../shared/types';
import { attachObserverOnce } from '../handlers/observer';
import { scrapeJobInfoEarly } from '../handlers/scrapeJob';
import { extractLinkedInLinks } from '../handlers/extractlinks';

chrome.runtime.onMessage.addListener((msg) => {
  //connection between background and content
  if (msg == ACTION.CONNECTION.START_OBSERVING) {
    scrapeJobInfoEarly();
    attachObserverOnce();


  } else if (msg == ACTION.RECRUITER.RECRUITER_LINKS_FOUND) {
    chrome.runtime.sendMessage({ action: ACTION.RECRUITER.CLOSE_THIS_TAB });

  } else if (msg == ACTION.RECRUITER.READY_TO_CONNECT) {
    console.log("📥 start prefilling _ready to connect");



  }
  return true;
});

if (
  window.location.hostname === "www.google.com" &&
  window.location.pathname === "/search"
  //needs to add more condition here
) {
  chrome.storage.local.get(["shouldRunExtractor", "draftSubject", "draftBody"], (res) => {
    if (res.shouldRunExtractor && res.draftSubject && res.draftBody) {
      console.log("🟢 Trigger conditions met. Extracting...");
      chrome.storage.local.remove("shouldRunExtractor"); 
      //callback always fires no matter what but this part will be silently skipped if condition is not met

      setTimeout(() => {
        extractLinkedInLinks();
        //res.draftSubject, res.draftBody
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
