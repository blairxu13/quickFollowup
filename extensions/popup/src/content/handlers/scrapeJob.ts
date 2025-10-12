interface storedJob {
    job_url: string,
    job_title: string | undefined,
    job_company: string,
    job_description: string | undefined
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


export function scrapeJobInfoEarly() {
    const site = window.location.hostname;
    const pathname = window.location.pathname;
    const pathParts = pathname.split("/");


    const looksLikeJob = /(job|jobs|career|careers)/.test(pathname) && /\d+/.test(pathname);

    let job_title: string | undefined, job_company: string, job_description: string | undefined;


    if (site.includes("myworkdayjobs.com") &&
        pathParts.length >= 5 &&
        pathParts[3] === "job" &&
        looksLikeJob) {
        if (
            pathParts.length >= 5 &&
            pathParts[3] === "job" &&
            looksLikeJob
        ) {
            job_company = site.split(".")[0];

            waitFor('[data-automation-id="jobPostingHeader"]', 5, (titleText: string) => {
                job_title = titleText;

                waitFor('[data-automation-id="jobPostingDescription"]', 30, (desc: string) => {
                    job_description = desc;

                    saveJobData({ job_url: window.location.href, job_title, job_company, job_description });
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

        const titleEl = document.querySelector(".job__title") as HTMLElement | null;
        const descEl = document.querySelector(".job__description") as HTMLElement | null;

        job_title = titleEl?.innerText?.trim();
        job_company = pathParts[1];
        job_description = descEl?.innerText?.trim();
        
        saveJobData({ job_url: window.location.href, job_title, job_company, job_description });
        return;
    }

 //need to add jobs.lever.co, jd and application is in different sites
 //need to add ashbyhq, but jd and application is in different sites?

    console.log("⛔ Not a job detail page, skipping.");
}