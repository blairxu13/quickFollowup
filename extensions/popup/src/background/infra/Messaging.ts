import { ACTION } from '../../shared/types';
import { fetchReadableLinks } from '../handlers/recruiter';
import { trackingTabs } from '../handlers/checkjobsites';
import { jsonPost } from './apiClient';
import { emailList } from './app';
import { unsetMarker } from '@tanstack/react-query';

// WHY: Track completed tabs by URL, not just tabId
// - Tab IDs can be reused, and same tab can load different URLs
// - We want to scrape each unique URL, even if it's the same tab
export const completedTabs = new Map<number, string>(); // Map<tabId, url>
let allowClose = false;

let sentOnce = true;
let trackingRegistered = false; // 🧠 new guard to prevent duplicate listeners

interface generatedFollowUp {
  jt: string;
  jd: string;
}



// WHY: This listener handles various actions including START_TRACKING
// Make sure this is registered BEFORE trackingTabs() sets up its own listener
chrome.runtime.onMessage.addListener((msg, sender) => {

  if (msg.action === 'READY') {
    const tabId = sender.tab?.id;
    const tabUrl = sender.tab?.url;
    
    // Ensure tracking is initialized (it might not be if user hasn't opened popup yet)
    if (!trackingRegistered) {
      startTrackingOnce();
      // WHY: After initializing, wait a moment for handleContentReady to register
      // Then handle it ourselves as fallback
      setTimeout(() => {
        if (tabId && tabUrl) {
          const previousUrl = completedTabs.get(tabId);
          if (previousUrl !== tabUrl) {
            try {
              chrome.tabs.sendMessage(tabId, { action: ACTION.CONNECTION.START_OBSERVING });
              completedTabs.set(tabId, tabUrl);
            } catch (error) {
              // Error sending message
            }
          }
        }
      }, 100);
    }
    
    // WHY: Let handleContentReady in checkjobsites.ts handle the READY message if tracking is already registered
    // - It has better logic for checking URL changes
    // - Return undefined to let other listeners process it
    return undefined;
  }
  
  if (msg.action == ACTION.CONNECTION.APPLY_BUTTON_CLICKED) {
    console.log("[background] APPLY_BUTTON_CLICKED", msg.job);
    if (sender.tab?.id && sender.tab?.url) {
      completedTabs.set(sender.tab.id, sender.tab.url);
    }

    chrome.storage.local.get(["user_id"], async (result) => {
      console.log("[background] user_id from storage", result.user_id);
      const job = {
        ...msg.job,
        user_id: result.user_id,
        isSent: false,
      };
      console.log("[background] job payload to emailList", job);
      try {
        const emailListResponse = await emailList(job, result.user_id);
        console.log("[background] emailList response", emailListResponse);
        
        // WHY: emailList returns APIresult, need to extract data
        if (emailListResponse && emailListResponse.ok) {
          const emails = emailListResponse.data || [];
          console.log("[background] emailList data", emails);
          
          // Store in chrome.storage for persistence
          chrome.storage.local.set({ emailList: emails }, () => {
            console.log("[background] emailList stored");
          });
          
          // Send message to frontend with the email list
          chrome.runtime.sendMessage({ 
            action: ACTION.RENDER.EMAIL_FETCHED,
            list: emails 
          });
        } else {
          console.warn("[background] emailList error result", emailListResponse?.error);
          // Still send empty list so UI doesn't break
          chrome.runtime.sendMessage({ 
            action: ACTION.RENDER.EMAIL_FETCHED,
            list: [] 
          });
        }
      } catch (err) {
        console.error("[background] emailList threw", err);
        // Send empty list on error
        chrome.runtime.sendMessage({ 
          action: ACTION.RENDER.EMAIL_FETCHED,
          list: [] 
        });
      }
    });
  } else if (msg.action == ACTION.CONNECTION.START_TRACKING) {
    startTrackingOnce();
  } else if (msg.action == ACTION.RECRUITER.START_PASTING) {
    fetchReadableLinks(msg.company, msg.subject, msg.body);

  }

  return undefined;
});


function startTrackingOnce() {
  if (trackingRegistered) {

    return;
  }
  trackingRegistered = true;

  trackingTabs();
}


chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["isTracking"], (result) => {
    if (result.isTracking) {
      startTrackingOnce();
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(["isTracking"], (result) => {
    if (result.isTracking) {
      startTrackingOnce();
    }
  });
});

chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: chrome.runtime.getURL("popup/index.html"),
    type: "popup",
    width: 625,
    height: 575,
    top: 100,
    left: 100,
  });
});
