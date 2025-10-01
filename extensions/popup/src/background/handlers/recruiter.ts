export function fetchReadableLinks (company,subject, body) {
    console.log("hi i am in fetch readable links!")
    const query = `site:linkedin.com/in recruiter ${company}`;
    console.log(query)
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  
    chrome.storage.local.set({ draftSubject: subject, draftBody: body, shouldRunExtractor: true }, () => {
      chrome.tabs.create({ url: searchUrl }, (tab) => {
        console.log("🔍 Opened Google Search Tab:", tab.id);
         chrome.storage.local.set({ searchTabId: tab.id });
      });
    });
  }
  




export function scanUntilFirstDMable(links, subject, body) {
    let found = false;
   
    //for sales navigator
    function sendPrefillMessage(tabId, subject, body, retries = 10) {
      if (retries === 0) return console.warn("❌ Failed to reach content.js");
    
      chrome.tabs.sendMessage(tabId, { action: "prefill_message", subject, body }, (res) => {
        if (chrome.runtime.lastError) {
          
          setTimeout(() => sendPrefillMessage(tabId, subject, body, retries - 1), 500);
        } else {
          console.log("✅ sales Message received by content.js");
        }
      });
    }
     //for connect 
    function sendPrefillConnect (tabId, connectBody, retries = 10) {
      
      chrome.tabs.sendMessage(tabId, { action: "ready to connect", connectBody }, (res) => {
        if (chrome.runtime.lastError) {
         
          setTimeout(() => sendPrefillConnect(tabId,  connectBody, retries - 1), 500);
        } else {
          console.log("✅ connect Message received by content.js");
        }
      });
  
    }
  
    function tryNext(index) {
      if (index >= links.length || found) return;
  
      const url = links[index];
  
      chrome.tabs.create({ url, active: false }, (tab) => {
        const tabId = tab.id;
  
        chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const observer = new MutationObserver(() => {
              const btn = Array.from(document.querySelectorAll(".artdeco-button__text"))
                .find(el => el.innerText.trim() === "Connect");
  
              if (btn) {
                chrome.runtime.sendMessage({ action: "recruiter_dm_ready" });
                observer.disconnect();
              }
            });
  
            observer.observe(document.body, {
              childList: true,
              subtree: true
            });
  
            setTimeout(() => {
              observer.disconnect();
              chrome.runtime.sendMessage({ action: "recruiter_not_dmable" });
            }, 5000);
          }
        });
  
  
        const handler = (msg, sender) => {
          if (sender.tab.id !== tabId) return;
        
  
          if (found) return; 
           
          if (msg.action === "recruiter_dm_ready" && !found) {
            found = true;
            chrome.runtime.onMessage.removeListener(handler);
           
        
            // Step 1: Click the "Connect" button
            chrome.scripting.executeScript({
              target: { tabId },
              func: () => {
                const btn = Array.from(document.querySelectorAll(".artdeco-button__text"))
                  .find(el => el.innerText.trim() === "Connect");
                if (btn) btn.click();
              },
            });
             // condition for the sales navigator only? for future dev,
            // Step 2: After the tab finishes updating (e.g. redirect to Sales Nav), send message to fill
            // const listener = function (updatedTabId, info) {
            //   console.log("in const listener = function (updatedTab!! ")
            //   console.log("tabId",tabId)
            //   console.log("tupdatedTabId",updatedTabId)
            //   if (info.status === "complete") {
            //     chrome.tabs.onUpdated.removeListener(listener);
            //     console.log(" in const listener = function (updatedTab, and send to content.js?")
            //     sendPrefillMessage(updatedTabId, subject, body);
            //   }
  
            // };
           
            // chrome.tabs.onUpdated.addListener(listener);
            // chrome.tabs.update(tabId, { active: true });
            sendPrefillConnect(tabId, body);
        
          } else {
            chrome.tabs.remove(tabId);
            setTimeout(() => tryNext(index + 1), 4000);
          }
        };
        
  
        chrome.runtime.onMessage.addListener(handler);
      });
    }
  
    tryNext(0);
  }
  