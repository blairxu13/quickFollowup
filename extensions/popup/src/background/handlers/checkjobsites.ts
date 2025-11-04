import { JOBSITES_TYPE, JOBSITES } from '../../shared/types';
import { ACTION } from '../../shared/types';
import { completedTabs } from '../infra/Messaging';

const sites = Object.values(JOBSITES);

function isJobSite(url: string): url is JOBSITES_TYPE {
  try {
    const hostname = new URL(url).hostname;
    const isMatch = sites.some(site => hostname.includes(site));
    console.log('🔍 isJobSite check:', { url, hostname, sites, isMatch });
    return isMatch;
  } catch (error) {
    console.error('❌ Error checking isJobSite:', error);
    return false;
  }
}

let isTrackingInitialized = false;

export function trackingTabs() {
  if (isTrackingInitialized) return;
  isTrackingInitialized = true;
  console.log("🚀 trackingTabs() initialized");


  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!tab.url) {
      console.warn("⚠️ No URL found for this tab update");
      return;
    }

    // WHY: Only process when page fully loads (status === 'complete')
    // - This prevents duplicate processing during loading
    if (changeInfo.status !== 'complete') {
      return;
    }

    console.log("🌍 Tab finished loading:", tab.url);
    if (!isJobSite(tab.url)) {
      console.log("⛔ Not a tracked job site:", tab.url);
      return;
    }

    console.log("🟢 Job-related site loaded:", tab.url);
    
    // WHY: Clear completed status for this tab if URL changed
    // - This allows scraping when user navigates to a different job page in same tab
    const previousUrl = completedTabs.get(tabId);
    if (previousUrl && previousUrl !== tab.url) {
      console.log(`🔄 URL changed for tab ${tabId}, clearing completed status`);
      console.log(`   Previous: ${previousUrl}`);
      console.log(`   New: ${tab.url}`);
      completedTabs.delete(tabId);
    }
  });


  const handleContentReady = (msg: any, sender: chrome.runtime.MessageSender) => {
    if (msg.action === 'READY') {
      const tabId = sender.tab?.id;
      const tabUrl = sender.tab?.url;
      
      console.log('✅ READY message received in handleContentReady from tab:', tabId, 'URL:', tabUrl);
      
      if (!tabId || !tabUrl) {
        console.warn('⚠️ No tab ID or URL in sender');
        return;
      }
      
      // WHY: Check if this specific URL has already been processed
      const previousUrl = completedTabs.get(tabId);
      if (previousUrl === tabUrl) {
        console.log(`⚠️ Tab ${tabId} already processed this URL in handleContentReady, skipping START_OBSERVING`);
        return;
      }
      
      console.log(`✅ Sending START_OBSERVING from handleContentReady to tab ${tabId} for URL: ${tabUrl}`);
      try {
        chrome.tabs.sendMessage(tabId, { action: ACTION.CONNECTION.START_OBSERVING });
        completedTabs.set(tabId, tabUrl); // Store tabId -> URL mapping
        console.log('✅ Message sent successfully from handleContentReady');
      } catch (error) {
        console.error('❌ Error sending message from handleContentReady:', error);
      }
    } else {
      console.log('⏭️ Not a READY message in handleContentReady, ignoring');
    }
    return undefined;
  };

  if (!chrome.runtime.onMessage.hasListener(handleContentReady)) {
    console.log('📝 Registering handleContentReady listener');
    chrome.runtime.onMessage.addListener(handleContentReady);
  } else {
    console.log('⚠️ handleContentReady listener already registered');
  }


}
