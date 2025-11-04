import { JOBSITES_TYPE, JOBSITES } from '../../shared/types';
import { ACTION } from '../../shared/types';
import { completedTabs } from '../infra/Messaging';

const sites = Object.values(JOBSITES);

function isJobSite(url: string): url is JOBSITES_TYPE {
  try {
    const hostname = new URL(url).hostname;
    const isMatch = sites.some(site => hostname.includes(site));
    return isMatch;
  } catch (error) {
    return false;
  }
}

let isTrackingInitialized = false;

export function trackingTabs() {
  if (isTrackingInitialized) return;
  isTrackingInitialized = true;


  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!tab.url) {
      return;
    }

    // WHY: Only process when page fully loads (status === 'complete')
    // - This prevents duplicate processing during loading
    if (changeInfo.status !== 'complete') {
      return;
    }

    if (!isJobSite(tab.url)) {
      return;
    }

    // WHY: Clear completed status for this tab if URL changed
    // - This allows scraping when user navigates to a different job page in same tab
    const previousUrl = completedTabs.get(tabId);
    if (previousUrl && previousUrl !== tab.url) {
      completedTabs.delete(tabId);
    }
  });


  const handleContentReady = (msg: any, sender: chrome.runtime.MessageSender) => {
    if (msg.action === 'READY') {
      const tabId = sender.tab?.id;
      const tabUrl = sender.tab?.url;
      
      if (!tabId || !tabUrl) {
        return;
      }
      
      // WHY: Check if this specific URL has already been processed
      const previousUrl = completedTabs.get(tabId);
      if (previousUrl === tabUrl) {
        return;
      }
      
      try {
        chrome.tabs.sendMessage(tabId, { action: ACTION.CONNECTION.START_OBSERVING });
        completedTabs.set(tabId, tabUrl); // Store tabId -> URL mapping
      } catch (error) {
        // Error sending message
      }
    }
    return undefined;
  };

  if (!chrome.runtime.onMessage.hasListener(handleContentReady)) {
    chrome.runtime.onMessage.addListener(handleContentReady);
  }


}
