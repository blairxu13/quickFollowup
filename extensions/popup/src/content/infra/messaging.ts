import { ACTION } from '../../shared/types';
import { attachObserverOnce } from '../handlers/observer';
import { scrapeJobInfoEarly } from '../handlers/scrapeJob';
import { extractLinkedInLinks } from '../../background/handlers/extractlinks';

let user_id: any;
export const completedTabs = new Set();
chrome.storage.local.set({ completedTabs: Array.from(completedTabs) });

chrome.storage.local.get("user_id", (result) => {
  user_id = result.user_id;
  console.log("👤 User ID loaded:", user_id);
})
chrome.runtime.sendMessage({ action: 'READY' });

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  //connection between background and content
  if (msg.action == ACTION.CONNECTION.START_OBSERVING) {
  
    scrapeJobInfoEarly(user_id);
 
    attachObserverOnce();


  }  else if (msg.action == ACTION.RECRUITER.READY_TO_CONNECT) {
    console.log("📥 start prefilling _ready to connect");

  } else {
    console.log("⚠️ Unknown message action:", msg.action);
  }
  return undefined; 

});




window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data.type === "dm_check_result") {
    chrome.runtime.sendMessage({
      action: event.data.dmable ? "recruiter_dm_ready" : "recruiter_not_dmable"
    });
  }
});
