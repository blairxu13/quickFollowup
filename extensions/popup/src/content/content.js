//need to see if it's triggered
console.log("📥 content.js loaded");
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "prifill_message") {
    console.log("📥 start prefilling _message navigator");

    const observer = new MutationObserver(() => {
      const currentURL = window.location.href;

       const salesSubject = document.querySelector('input[aria-label="Subject (required)"]');
       const salesBox = document.querySelector('textarea[aria-label^="Type your message"]');

      if (currentURL.includes("linkedin.com/sales/") && salesSubject && salesBox) {
        salesSubject.value =  msg.subject;
        salesBox.value = msg.body ;
        salesSubject.dispatchEvent(new Event("input", { bubbles: true }));
        salesBox.dispatchEvent(new Event("input", { bubbles: true }));
        console.log("✅ Prefilled Sales Navigator message");
        observer.disconnect();
      }

      const normalBox = document.querySelector('[contenteditable="true"][aria-label="Write a message."]');
      if (!currentURL.includes("linkedin.com/sales/") && normalBox) {
        document.execCommand("insertText", false, msg.body);
        normalBox.dispatchEvent(new Event("input", { bubbles: true }));
        console.log("✅ Prefilled normal message");
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Stop after 10s if not found
    setTimeout(() => {
      console.warn("⏱️ Timeout: message UI not found.");
      observer.disconnect();
    }, 10000);
  } else if(msg.action === "ready to connect") {
    console.log("📥 start prefilling _ready to connect");
    
    const observer = new MutationObserver(() => {
      // const currentURL = window.location.href;
       const connectBox = document.querySelector("textarea#custom-message");;
        connectBox.value = msg.body ;
        connectBox.dispatchEvent(new Event("input", { bubbles: true }));
        console.log("✅ Prefilled Sales Navigator message");
        observer.disconnect();
      
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Stop after 10s if not found
    setTimeout(() => {
      console.warn("⏱️ Timeout: message UI not found.");
      observer.disconnect();
    }, 10000);


  }


});


window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data.type === "dm_check_result") {
    chrome.runtime.sendMessage({
      action: event.data.dmable ? "recruiter_dm_ready" : "recruiter_not_dmable"
    });
  }
});

// This function is defined somewhere in your content.js
function extractLinkedInLinks() {
  console.log("in extarct links from first poage of google")
  const anchors = Array.from(document.querySelectorAll('a'));
  const linkedinLinks = anchors
    .map(a => a.href)
    .filter(href =>{
      try {
        const url = new URL(href);
        return (
          url.hostname.includes("linkedin.com") &&
          url.pathname.startsWith("/in/")
        );
      } catch (e) {
        return false; // skip malformed URLs
      }

});


  const cleanedLinks = Array.from(new Set(linkedinLinks.map(link => {
    return link.split("?")[0].split("&")[0];
  })));

  console.log("✅ Extracted:", cleanedLinks);

  chrome.runtime.sendMessage({
    action: "recruiter_links_found",
    links: cleanedLinks
  });
   
  chrome.runtime.sendMessage({ action: "close_this_tab" });
}


if (
  window.location.hostname === "www.google.com" &&
  window.location.pathname === "/search"
  //needs to add more condition here
) {
  chrome.storage.local.get(["shouldRunExtractor", "draftSubject", "draftBody"], (res) => {
    if (res.shouldRunExtractor) {
      console.log("🟢 Trigger conditions met. Extracting...");
      chrome.storage.local.remove("shouldRunExtractor"); // clear so it doesn't retrigger

      setTimeout(() => {
        extractLinkedInLinks(res.draftSubject, res.draftBody);
      }, 2000);
    }
  });
}




//when scrape workday.com
function waitFor(selector, minLen = 30, cb) {
  const iv = setInterval(() => {
    const el  = document.querySelector(selector);
    const txt = el?.innerText?.trim() || "";
    if (txt.length >= minLen) {
      clearInterval(iv);
      cb(txt);
    }
  }, 300);
}


// class function for jobData
function saveJobData({ url, job_title, company, jd }) {
  const jobData = {
    url,
    job_title:       job_title?.trim()       || "Unknown Title",
    company:     company?.trim()     || "Unknown Company",
    jd: jd?.trim() || "No description found"
  };

  chrome.storage.local.set({ pendingJob: jobData }, () => {
    console.log("📦 Job info stored early!", jobData);
  });
}

//decides when content.js should be triggered, only allow these few websites 
function scrapeJobInfoEarly() {
  const site      = window.location.hostname;
  const pathname  = window.location.pathname;
  const pathParts = pathname.split("/");


  const looksLikeJob = /(job|jobs|career|careers)/.test(pathname) && /\d+/.test(pathname);

  let title, company, description;


  if (site.includes("myworkdayjobs.com") &&
      pathParts.length >= 5 &&
      pathParts[3] === "job" &&
      looksLikeJob) {
        if (
            pathParts.length >= 5 &&
            pathParts[3] === "job" &&
            looksLikeJob
          ) {
            company = site.split(".")[0];
        
            waitFor('[data-automation-id="jobPostingHeader"]', 5, (titleText) => {
              title = titleText;
        
              waitFor('[data-automation-id="jobPostingDescription"]', 30, (desc) => {
                description = desc;
        
                saveJobData({ url: window.location.href, title, company, description });
              });
            });
        
            return;
          }
  }

  
  if (site.includes("greenhouse.io") &&
      pathParts.length >= 4 &&
      pathParts[2] === "jobs" &&
      looksLikeJob) {
        console.log("here")
        if (pathname.includes("confirmation")) {
            console.log("🔒 Confirmation page — skipping job scrape");
            return;
          }

          job_title        = document.querySelector(".job__title")?.innerText?.trim();
    company     = pathParts[1];         
    jd = document
                    .querySelector(".job__description")
                    ?.innerText
                    ?.trim();
        
    saveJobData({ url: window.location.href, job_title , company, jd });
    return;
  }



  console.log("⛔ Not a job detail page, skipping.");
}

// check if user actually applied that job
function attachObserverOnce() {
  let sent = false;
    console.log("i am in observeronce")
  const obs = new MutationObserver(() => {
    if (sent) return; 
    const txt = document.body.innerText.toLowerCase();
      console.log(txt);
    if (!sent &&
        (txt.includes("application submitted")  ||
         txt.includes("thank you for applying") ||
         txt.includes("thanks for applying") ||
         txt.includes("thank you for your interest") ||
         txt.includes("received") ||
         txt.includes("submitted") ||
         txt.includes("we’ve received your application"))) {
            console.log('inside1')
      sent = true;
      obs.disconnect();

      chrome.storage.local.get(["pendingJob"], ({ pendingJob }) => {
        if (pendingJob) {
          chrome.runtime.sendMessage({ action: "apply-button-clicked", job: pendingJob });
          chrome.storage.local.remove("pendingJob")
          console.log("✅ Application confirmed → sent job to background",pendingJob);
        }
      });
    }
  });

  obs.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => obs.disconnect(), 10_000);   // safety timeout
}


chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "start-observing") {
    console.log("👀 start-observing received from background");
    scrapeJobInfoEarly();
    attachObserverOnce();
    console.log("i finished the job")
    sendResponse({ status: "observer-started" });
  }
});
