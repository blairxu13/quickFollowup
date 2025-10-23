import {JOBSITES_TYPE, JOBSITES} from '../../shared/types';
import {ACTION} from '../../shared/types';
import {completedTabs} from '../infra/Messaging'
const sites = Object.values(JOBSITES); 

function isJobSite(url: string): url is JOBSITES_TYPE {
    try {
        const hostname = new URL(url).hostname;
        return sites.some(site => hostname.includes(site));
      } catch {
        return false;
      }
}

let isTrackingInitialized = false;

export function trackingTabs() {
    if (isTrackingInitialized) return; 
    isTrackingInitialized = true;
    console.log("🚀 trackingTabs() initialized");
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
       
        console.log("🌍 Tab finished loading:", tab.url);
        if (!tab.url) {
          console.warn("⚠️ No URL found for this tab update");
        } else if (!isJobSite(tab.url)) {
          console.log("⛔ Not a tracked job site:", tab.url);
        } else {
          console.log("🟢 Job-related site loaded:", tab.url);
          console.log("before sending out start obs")
          chrome.runtime.onMessage.addListener((msg, sender) => {
            if (msg.action === 'READY') {
              //waiting for content.js to be in injected in successfully
              const tabId = sender.tab?.id;
              if (!tabId) return;
          
              if (completedTabs.has(tabId)) {
                console.log('⚠️ Tab already completed, skipping START_OBSERVING');
                return;
              }else {
                console.log('✅ Content ready, sending START_OBSERVING');
                chrome.tabs.sendMessage(tabId, { action: ACTION.CONNECTION.START_OBSERVING });
              }
          
           
            }
            return undefined;
          });
        
          console.log("after sending out start obs")

        
       }
    });
  }

  