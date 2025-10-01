import {trackingTabs} from './handlers/checkjobsites';

chrome.runtime.onInstalled.addListener(() => {
    console.log("🆕 Extension installed or reloaded");

    chrome.storage.local.get(["isTracking"], (result) => {
      if (result.isTracking) {
        console.log("Starting tracking after install/reload");
        trackingTabs();
      }
    });
  });

  chrome.runtime.onStartup.addListener(() => {
    console.log("tracking when Chrome restarted");
    chrome.storage.local.get(["isTracking"], (result) => {
      if (result.isTracking) {
        trackingTabs();
      }
    });
  });