interface storedJob {
    url: string,
    user_id: string,
    job_title: string | undefined,
    company: string,
    jd: string | undefined
}


//when scrape workday.com
function waitFor(selector: string, minLen = 30, cb: (txt: string) => void) {
    const iv = setInterval(() => {
        const el = document.querySelector(selector) as HTMLElement | null;
        const txt = el?.innerText?.trim() || "";


        if (txt.length >= minLen) {
            clearInterval(iv);
            cb(txt);
        }
    }, 300);
}

function saveJobData(job: storedJob) {
    chrome.storage.local.set({ pendingJob: job }, () => {
        console.log("📦 Job info stored early!", job);
    });
}


export function scrapeJobInfoEarly(user: any) {
    const site = window.location.hostname;
    const pathname = window.location.pathname;
    const pathParts = pathname.split("/");

    console.log("🔍 scrapeJobInfoEarly called");
    console.log("📍 Site:", site);
    console.log("📍 Pathname:", pathname);
    console.log("📍 PathParts:", pathParts);
    console.log("📍 PathParts length:", pathParts.length);
    console.log("📍 PathParts[2]:", pathParts[2]);

    const looksLikeJob = /(job|jobs|career|careers)/.test(pathname) && /\d+/.test(pathname);
    console.log("📍 looksLikeJob:", looksLikeJob);

    let job_title: string | undefined, company: string, jd: string | undefined;


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

            waitFor('[data-automation-id="jobPostingHeader"]', 5, (titleText: string) => {
                job_title = titleText;

                waitFor('[data-automation-id="jobPostingDescription"]', 30, (desc: string) => {
                    jd = desc;

                    saveJobData({  user_id: user, url: window.location.href, job_title, company, jd });
                });
            });

            return;
        }
    }


    // WHY: Check for greenhouse.io (including job-boards.greenhouse.io)
    // The URL pattern is: /companyname/jobs/jobid
    // For job-boards.greenhouse.io: pathParts = ["", "companyname", "jobs", "jobid"]
    // So pathParts.length = 4, pathParts[2] = "jobs" ✓
    if (site.includes("greenhouse.io")) {
        console.log("✅ Greenhouse site detected");
        console.log("📍 Checking conditions:");
        console.log("  - pathParts.length >= 4:", pathParts.length >= 4);
        console.log("  - pathParts[2] === 'jobs':", pathParts[2] === "jobs");
        console.log("  - looksLikeJob:", looksLikeJob);
        
        if (pathParts.length >= 4 &&
            pathParts[2] === "jobs" &&
            looksLikeJob) {
            console.log("✅ Greenhouse job page detected!");
            console.log("here"); // This is the log you're looking for
            
            if (pathname.includes("confirmation")) {
                console.log("🔒 Confirmation page — skipping job scrape");
                return;
            }

            const titleEl = document.querySelector(".job__title") as HTMLElement | null;
            const descEl = document.querySelector(".job__description") as HTMLElement | null;

            console.log("📍 Title element found:", !!titleEl);
            console.log("📍 Description element found:", !!descEl);

            job_title = titleEl?.innerText?.trim();
            company = pathParts[1];
            jd = descEl?.innerText?.trim();
            
            console.log("📍 Scraped data:", { job_title, company, jd: jd?.substring(0, 50) + "..." });
            
            saveJobData({ user_id: user, url: window.location.href, job_title, company, jd });
            return;
        } else {
            console.log("❌ Greenhouse site but conditions not met");
        }
    }

 //need to add jobs.lever.co, jd and application is in different sites
 //need to add ashbyhq, but jd and application is in different sites?

    console.log("⛔ Not a job detail page, skipping.");
}