import { ACTION } from '../../shared/types';
import { scanUntilFirstDMable, fetchReadableLinks } from '../handlers/recruiter';
import { trackingTabs } from '../handlers/checkjobsites';
import { jsonPost } from './apiClient';
import { emailList } from './app';

let sentOnce = true;
interface generatedFollowUp  {
    jt: string;
    jd: string;
}


chrome.runtime.onMessage.addListener((msg) => {
    //connection between background and content
    if (msg == ACTION.CONNECTION.APPLY_BUTTON_CLICKED && !sentOnce) {
        //extract the local object
        console.log("after button clicked");
        // sentOnce = true;


        //sent once, glith here??? 
        chrome.storage.local.get(["user_id"], async (result) => {
            const job = {
                ...msg.job,                  // original job info from content.js
                user_id: result.user_id,    // add user_id from local storage
                isSent: false
            };
            const list = await emailList(job, result.user_id);
            chrome.storage.local.set({ emailList: list }, () => {
                chrome.runtime.sendMessage({ action: ACTION.RENDER.EMAIL_FETCHED});
            });
          


        });


    } else if (msg == ACTION.RECRUITER.CLOSE_THIS_TAB) {
        chrome.storage.local.get("searchTabId", ({ searchTabId }) => {
            if (searchTabId) {
                chrome.tabs.remove(searchTabId);
                chrome.storage.local.remove("searchTabId"); // cleanup
            }
        });
    } else if (msg == ACTION.RECRUITER.RECRUITER_LINKS_FOUND) {
        
        
        scanUntilFirstDMable(msg.cleanedLinks);

    } else if (msg == ACTION.CONNECTION.START_TRACKING) {
        trackingTabs();
    } else if (msg == ACTION.RECRUITER.START_PASTING) {
        fetchReadableLinks( msg.company, msg.subject, msg.body);
    }

    return true;
});



chrome.runtime.onInstalled.addListener(() => {
    console.log(" Extension installed or reloaded");

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