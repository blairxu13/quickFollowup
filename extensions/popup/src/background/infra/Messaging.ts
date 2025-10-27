import { ACTION } from '../../shared/types';
import { fetchReadableLinks } from '../handlers/recruiter';
import { trackingTabs } from '../handlers/checkjobsites';
import { jsonPost } from './apiClient';
import { emailList } from './app';
import { unsetMarker } from '@tanstack/react-query';

export const completedTabs = new Set();
let allowClose = false;
chrome.storage.local.set({ completedTabs: Array.from(completedTabs) });

console.log("background alive:", new Date().toISOString());
let sentOnce = true;
let trackingRegistered = false; // 🧠 new guard to prevent duplicate listeners

interface generatedFollowUp {
  jt: string;
  jd: string;
}


console.log("1️⃣ background start fetchReadableLinks");
chrome.runtime.onMessage.addListener((msg) => {
  console.log("2️⃣ background got message:", msg.action);
  return undefined;
});
chrome.tabs.onRemoved.addListener((tabId, info) => {
  console.log("3️⃣ tab closed:", tabId, info);
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action == ACTION.CONNECTION.APPLY_BUTTON_CLICKED) {
    console.log("after button clicked");
    if (sender.tab?.id) {
      completedTabs.add(sender.tab.id);
    }

    chrome.storage.local.get(["user_id"], async (result) => {
      console.log("userid is", result.user_id);
      const job = {
        ...msg.job,
        user_id: result.user_id,
        isSent: false,
      };
      try {
        const list = await emailList(job, result.user_id);
        console.log("✅ got list", list);
        chrome.storage.local.set({ emailList: list }, () => {
          console.log("hello america good bye!");
          chrome.runtime.sendMessage({ action: ACTION.RENDER.EMAIL_FETCHED });
          console.log("hello america good bye!slay");
        });
      } catch (err) {
        console.error("❌ emailList failed", err);
      }
    });
  } else if (msg.action == ACTION.CONNECTION.START_TRACKING) {
    console.log("tracking tabs initialized by action");
    startTrackingOnce();
  } else if (msg.action == ACTION.RECRUITER.START_PASTING) {
    fetchReadableLinks(msg.company, msg.subject, msg.body);

  }

  return undefined;
});


function startTrackingOnce() {
  if (trackingRegistered) return;
  trackingRegistered = true;
  console.log(" registering trackingTabs listener once");
  trackingTabs();
}


chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["isTracking"], (result) => {
    if (result.isTracking) startTrackingOnce();
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(["isTracking"], (result) => {
    if (result.isTracking) startTrackingOnce();
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
