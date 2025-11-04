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
    chrome.storage.local.set({ pendingJob: job }, () => {});
}


export function scrapeJobInfoEarly(user: any) {
    const site = window.location.hostname;
    const pathname = window.location.pathname;
    const pathParts = pathname.split("/");

    const looksLikeJob = /(job|jobs|career|careers)/.test(pathname) && /\d+/.test(pathname);

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
        if (pathParts.length >= 4 &&
            pathParts[2] === "jobs" &&
            looksLikeJob) {
            if (pathname.includes("confirmation")) {
                return;
            }

            const titleEl = document.querySelector(".job__title") as HTMLElement | null;
            const descEl = document.querySelector(".job__description") as HTMLElement | null;

            job_title = titleEl?.innerText?.trim();
            company = pathParts[1];
            jd = descEl?.innerText?.trim();
            
            saveJobData({ user_id: user, url: window.location.href, job_title, company, jd });
            return;
        }
    }

 //need to add jobs.lever.co, jd and application is in different sites
 //need to add ashbyhq, but jd and application is in different sites?
}