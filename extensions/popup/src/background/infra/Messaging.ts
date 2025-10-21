import { ACTION } from '../../shared/types';
import { scanUntilFirstDMable, fetchReadableLinks } from '../handlers/recruiter';
import { trackingTabs } from '../handlers/checkjobsites';
import { jsonPost } from './apiClient';
import { emailList } from './app';


export const completedTabs = new Set();
chrome.storage.local.set({ completedTabs: Array.from(completedTabs) });

console.log("background alive:", new Date().toISOString());
let sentOnce = true;
interface generatedFollowUp  {
    jt: string;
    jd: string;
}


chrome.runtime.onMessage.addListener((msg, sender) => {
    //connection between background and content
    //&& !sentOnce
    if (msg.action == ACTION.CONNECTION.APPLY_BUTTON_CLICKED ) {
        //extract the local object
        console.log("after button clicked");
        if (sender.tab?.id) {
            completedTabs.add(sender.tab.id);
          }
        // sentOnce = true;


        //sent once, glith here??? 
        chrome.storage.local.get(["user_id"], async (result) => {
            console.log("userid is", result.user_id)
            const job = {
                ...msg.job,                  // original job info from content.js
                user_id: result.user_id,    // add user_id from local storage
                isSent: false
            };
            try {
                const list = await emailList(job, result.user_id);
                console.log("✅ got list", list);
                chrome.storage.local.set({ emailList: list }, () => {
                    console.log("hello america good bye!")
                    chrome.runtime.sendMessage({ action: ACTION.RENDER.EMAIL_FETCHED});
                    console.log("hello america good bye!slay")
                });
              
              } catch (err) {
                console.error("❌ emailList failed", err);
              }

        });

console.log("hello america ")
    } else if (msg.action == ACTION.RECRUITER.CLOSE_THIS_TAB) {
        chrome.storage.local.get("searchTabId", ({ searchTabId }) => {
            if (searchTabId) {
                chrome.tabs.remove(searchTabId);
                chrome.storage.local.remove("searchTabId"); // cleanup
            }
        });
    } else if (msg.action == ACTION.RECRUITER.RECRUITER_LINKS_FOUND) {
        
        
        scanUntilFirstDMable(msg.cleanedLinks);

    } else if (msg.action == ACTION.CONNECTION.START_TRACKING) {
        console.log("tracking tabs initialized by action")
        trackingTabs();
    } else if (msg.action == ACTION.RECRUITER.START_PASTING) {
        fetchReadableLinks( msg.company, msg.subject, msg.body);
    }

    return undefined;
});


chrome.tabs.onUpdated.addListener(() => {


    chrome.storage.local.get(["isTracking"], (result) => {
        if (result.isTracking) {
            console.log("Starting tracking .onUpdated");
            trackingTabs();
        }
    });
});
chrome.webNavigation.onCompleted.addListener(() => {


    chrome.storage.local.get(["isTracking"], (result) => {
        if (result.isTracking) {
            console.log("Starting tracking .onCompleted");
            trackingTabs();
        }
    });
});
chrome.alarms.onAlarm.addListener(() => {


    chrome.storage.local.get(["isTracking"], (result) => {
        if (result.isTracking) {
            console.log("Starting tracking onAlarm");
            trackingTabs();
        }
    });
});

chrome.runtime.onInstalled.addListener(() => {


    chrome.storage.local.get(["isTracking"], (result) => {
        if (result.isTracking) {
            console.log("Starting tracking runtime.onInstalled");
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


chrome.action.onClicked.addListener(() => {
    chrome.windows.create({
        url: chrome.runtime.getURL("popup/index.html"),
        type: "popup",
        width: 625,
        height: 575,
        top: 100,
        left: 100
    });
});