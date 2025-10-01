import {RECRUITER, ACTION} from '../../shared/types';
import {scanUntilFirstDMabl, fetchReadableLinks} from '../handlers/recruiter'

chrome.runtime.onMessage.addListener((msg) => {
    //connection between background and content
    if (msg == ACTION.CONNECTION.APPLY_BUTTON_CLICKED ) {
        //extract the local object
        return true;
    } else if (msg == ACTION.CONNECTION.START_OBSERVING) {
    
    }else if (msg == RECRUITER.CLOSE_THIS_TAB) {
        chrome.storage.local.get("searchTabId", ({ searchTabId }) => {
            if (searchTabId) {
              chrome.tabs.remove(searchTabId);
              chrome.storage.local.remove("searchTabId"); // cleanup
            }
          });
    } else if (msg == RECRUITER.RECRUITER_LINKS_FOUND) {
        scanUntilFirstDMable();

    } else if (msg == RECRUITER.ACTION.START_PASTING) {
        fetchReadableLinks();
    }

});