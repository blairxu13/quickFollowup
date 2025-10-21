import { ACTION } from '../../shared/types';
import { attachObserverOnce } from '../handlers/observer';
import { scrapeJobInfoEarly } from '../handlers/scrapeJob';
import { extractLinkedInLinks } from '../handlers/extractlinks';

let user_id: any;
chrome.storage.local.get("user_id", (result) => {
  user_id = result.user_id;
})
chrome.runtime.sendMessage({ action: 'READY' });
console.log("in content.js");
chrome.runtime.onMessage.addListener((msg) => {
  //connection between background and content
  if (msg.action == ACTION.CONNECTION.START_OBSERVING) {
    console.log("in content.js start observing")
    scrapeJobInfoEarly(user_id);
    attachObserverOnce();


  } else if (msg.action == ACTION.RECRUITER.RECRUITER_LINKS_FOUND) {
    chrome.runtime.sendMessage({ action: ACTION.RECRUITER.CLOSE_THIS_TAB });

  } else if (msg.action == ACTION.RECRUITER.READY_TO_CONNECT) {
    console.log("📥 start prefilling _ready to connect");

  }
  return undefined; 

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
