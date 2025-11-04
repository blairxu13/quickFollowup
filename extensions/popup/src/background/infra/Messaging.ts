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

console.log("background alive:", new Date().toISOString());
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
    console.log("✅ READY message received in Messaging.ts");
    
    const tabId = sender.tab?.id;
    const tabUrl = sender.tab?.url;
    
    // Ensure tracking is initialized (it might not be if user hasn't opened popup yet)
    if (!trackingRegistered) {
      console.log("⚠️ Tracking not initialized yet, initializing now from READY message");
      startTrackingOnce();
      // WHY: After initializing, wait a moment for handleContentReady to register
      // Then handle it ourselves as fallback
      setTimeout(() => {
        if (tabId && tabUrl) {
          const previousUrl = completedTabs.get(tabId);
          if (previousUrl !== tabUrl) {
            console.log(`✅ Fallback: Sending START_OBSERVING to tab ${tabId} for URL: ${tabUrl}`);
            try {
              chrome.tabs.sendMessage(tabId, { action: ACTION.CONNECTION.START_OBSERVING });
              completedTabs.set(tabId, tabUrl);
              console.log('✅ START_OBSERVING sent successfully (fallback)');
            } catch (error) {
              console.error('❌ Error sending START_OBSERVING (fallback):', error);
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
    console.log("after button clicked");
    if (sender.tab?.id && sender.tab?.url) {
      completedTabs.set(sender.tab.id, sender.tab.url);
    }

    chrome.storage.local.get(["user_id"], async (result) => {
      console.log("userid is", result.user_id);
      const job = {
        ...msg.job,
        user_id: result.user_id,
        isSent: false,
      };
      try {
        const emailListResponse = await emailList(job, result.user_id);
        console.log("✅ got email list response", emailListResponse);
        
        // WHY: emailList returns APIresult, need to extract data
        if (emailListResponse && emailListResponse.ok) {
          const emails = emailListResponse.data || [];
          console.log("✅ Extracted emails:", emails);
          
          // Store in chrome.storage for persistence
          chrome.storage.local.set({ emailList: emails }, () => {
            console.log("✅ Email list stored in chrome.storage");
          });
          
          // Send message to frontend with the email list
          chrome.runtime.sendMessage({ 
            action: ACTION.RENDER.EMAIL_FETCHED,
            list: emails 
          });
          console.log("✅ EMAIL_FETCHED message sent with list");
        } else {
          console.error("❌ emailList failed:", emailListResponse?.error || "Unknown error");
          // Still send empty list so UI doesn't break
          chrome.runtime.sendMessage({ 
            action: ACTION.RENDER.EMAIL_FETCHED,
            list: [] 
          });
        }
      } catch (err) {
        console.error("❌ emailList exception:", err);
        // Send empty list on error
        chrome.runtime.sendMessage({ 
          action: ACTION.RENDER.EMAIL_FETCHED,
          list: [] 
        });
      }
    });
  } else if (msg.action == ACTION.CONNECTION.START_TRACKING) {
    console.log("✅ START_TRACKING action received, initializing tracking");
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
  console.log("🔧 Extension installed/reloaded");
  chrome.storage.local.get(["isTracking"], (result) => {
    console.log("🔍 isTracking value:", result.isTracking);
    if (result.isTracking) {
  
      startTrackingOnce();
    } else {
  
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  console.log("🚀 Extension startup");
  chrome.storage.local.get(["isTracking"], (result) => {
    console.log("🔍 isTracking value:", result.isTracking);
    if (result.isTracking) {
      console.log("✅ Starting tracking on startup");
      startTrackingOnce();
    } else {
      console.log("⏭️ Tracking not enabled, skipping");
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
