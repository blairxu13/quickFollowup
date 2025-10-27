import { JOBSITES_TYPE, JOBSITES } from '../../shared/types';
import { ACTION } from '../../shared/types';
import { completedTabs } from '../infra/Messaging';

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

  // ✅ 1. Register the tab update listener (once)
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!tab.url) {
      console.warn("⚠️ No URL found for this tab update");
      return;
    }

    console.log("🌍 Tab finished loading:", tab.url);
    if (!isJobSite(tab.url)) {
      console.log("⛔ Not a tracked job site:", tab.url);
      return;
    }

    console.log("🟢 Job-related site loaded:", tab.url);
    console.log("before sending out start obs");

    // You can optionally ping content script here if needed:
    // chrome.tabs.sendMessage(tabId, { action: ACTION.CONNECTION.CHECK_READY });
  });

  // ✅ 2. Register the message listener (once, globally)
  const handleContentReady = (msg: any, sender: chrome.runtime.MessageSender) => {
    if (msg.action === 'READY') {
      const tabId = sender.tab?.id;
      if (!tabId) return;

      if (completedTabs.has(tabId)) {
        console.log('⚠️ Tab already completed, skipping START_OBSERVING');
        return;
      }

      console.log('✅ Content ready, sending START_OBSERVING');
      chrome.tabs.sendMessage(tabId, { action: ACTION.CONNECTION.START_OBSERVING });
      completedTabs.add(tabId);
    }
    return undefined;
  };

  if (!chrome.runtime.onMessage.hasListener(handleContentReady)) {
    chrome.runtime.onMessage.addListener(handleContentReady);
  }


}
