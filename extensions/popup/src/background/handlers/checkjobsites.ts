import {JOBSITES_TYPE, JOBSITES} from '../../shared/types';

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
          chrome.tabs.sendMessage(tabId, { action: "start-observing" });

        
       }
    });
  }

  