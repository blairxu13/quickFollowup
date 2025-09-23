function scanUntilFirstDMable(links, subject, body) {
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


//
function fetchReadableLinks (company,subject, body) {
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


function sendEmailWithGmailAPI(to, subject, body) {

  chrome.identity.getAuthToken({ interactive: true }, function(token) {
    if (chrome.runtime.lastError) {
      console.error("Auth failed:", chrome.runtime.lastError.message);
      return;
    }

    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=UTF-8",
      "",
      body
    ];

    const email = emailLines.join("\n");

    const base64EncodedEmail = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-').replace(/\//g, '_');

    fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        raw: base64EncodedEmail
      })
    })
      .then(res => res.json())
      .then(data => {
        console.log("✅ Email sent successfully:", data);
      })
      .catch(err => {
        console.error("❌ Failed to send email:", err);
      });
  });
}

chrome.storage.local.get(["isTracking"], (result) => {
    if (result.isTracking) {
      console.log("Auto-trackingtabs");
      trackingTabs();
    }
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
  
console.log("background.js is triggered");


const jobSites = [
    "linkedin.com/jobs",
    "simplify.jobs",
    "myworkdayjobs.com",
    "greenhouse.io",
  ];

function isJobSite(url) {
    try {
        const hostname = new URL(url).hostname;
        return jobSites.some(site => hostname.includes(site));
      } catch {
        return false;
      }
}

let isTrackingInitialized = false;

function trackingTabs() {
    if (isTrackingInitialized) return; 
    isTrackingInitialized = true;
    console.log("🚀 trackingTabs() initialized");
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
       
        console.log("🌍 Tab finished loading:", tab.url);
        if (!tab.url) {
          console.warn("⚠️ No URL found for this tab update");
        } else if (!isJobSite(tab.url)) {
          console.log("⛔ Not a tracked job site:", tab.url);
        } else {
          console.log("🟢 Job-related site loaded:", tab.url);
          chrome.tabs.sendMessage(tabId, { action: "start-observing" });

        
       }
    });
  }
  

// Startup + manual start

chrome.runtime.onInstalled.addListener(() => {
    console.log("🆕 Extension installed or reloaded");
    chrome.storage.local.get(null, console.log);
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
  let sentOnce = false;

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === "close_this_tab") {
    chrome.storage.local.get("searchTabId", ({ searchTabId }) => {
      if (searchTabId) {
        chrome.tabs.remove(searchTabId);
        chrome.storage.local.remove("searchTabId"); // cleanup
      }
    });
  }
    console.log("📨 Received message!:", msg);
    if (msg.action === "send_gmail") {
      sendEmailWithGmailAPI(msg.to, msg.subject, msg.body);
    }
    if (msg.action === "startpasting") {
      console.log("i am in pasting")
      // connect vs sales navigator?
      fetchReadableLinks(msg.vcompany,msg.subject, msg.body)
    }
  if (msg.action === "start-tracking") {
 
    trackingTabs();
  }

  if (msg.action === "recruiter_links_found") {
    chrome.storage.local.get(["draftSubject", "draftBody"], ({ draftSubject, draftBody }) => {
      scanUntilFirstDMable(msg.links, draftSubject, draftBody);
    });
  }

  console.log("before button clicked");
  if (msg.action === "apply-button-clicked" && !sentOnce) {
    // job application stored

    console.log("after button clicked");
    sentOnce = true;
    chrome.storage.local.get(["user_id", "isTracking"], (result) => { 
      const job = {
        ...msg.job,                  // original job info from content.js
        user_id: result.user_id,    // add user_id from local storage
        isSent: false
      };
      //isTracking is for not to run the application excessively

      console.log("✅ Final job payload:", job);
      console.log("📤 Sending to backend:", job);

      fetch("http://localhost:8000/track_application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      })
      .then(() => { 
        console.log("✅ track_application returned successfully");
        return fetch(`http://localhost:8000/get_unsent_emails?user_id=${result.user_id}`);
      })
      .then(res => {
        console.log("📥 Received response for get_unsent_emails", res.status);
        return res.json();
      })
      .then(data => {
        console.log("📬 Parsed unsent emails:", data);
        chrome.runtime.sendMessage({ action: "emails-fetched", emails: data });
      })
      .catch(err => {
        console.error("❌ Error in fetch chain:", err);
      });
      
      
    });
  }


  
  console.log("at the end of the background.js");
});
