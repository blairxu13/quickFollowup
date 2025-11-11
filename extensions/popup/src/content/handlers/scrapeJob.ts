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

    if (site.includes("jobs.ashbyhq.com")) {
        const cleanedParts = pathParts.filter(Boolean);
        if (cleanedParts.length === 0) {
            return;
        }

        const isApplicationView = cleanedParts[cleanedParts.length - 1] === "application";
        const baseParts = isApplicationView ? cleanedParts.slice(0, -1) : cleanedParts;

        if (baseParts.length === 0) {
            return;
        }

        const companySlug = baseParts[0];
        const jobBaseUrl = `${window.location.origin}/${baseParts.join("/")}`;

        const extractFromDocument = (doc: Document) => {
            const titleEl =
                (doc.querySelector("h1.ashby-job-posting-heading") as HTMLElement | null) ??
                (doc.querySelector('h1[class*="ashby-job-posting-heading"]') as HTMLElement | null);

            const descEl =
                (doc.querySelector('[class*="_descriptionText"]') as HTMLElement | null) ??
                (doc.querySelector('[class*="ashby-job-posting"]') as HTMLElement | null);

            const extractedTitle = titleEl?.innerText?.trim();
            const extractedDescription = descEl?.innerText?.trim();

            if (extractedTitle || extractedDescription) {
                saveJobData({
                    user_id: user,
                    url: jobBaseUrl,
                    job_title: extractedTitle,
                    company: companySlug,
                    jd: extractedDescription,
                });
            }
        };

        if (isApplicationView) {
            fetch(jobBaseUrl, { credentials: "include" })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Failed to fetch job page (${response.status})`);
                    }
                    return response.text();
                })
                .then((html) => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, "text/html");
                    extractFromDocument(doc);
                })
                .catch(() => {
                    // If fetch fails, attempt to scrape from the current document as a fallback
                    extractFromDocument(document);
                });
        } else {
            extractFromDocument(document);
        }

        return;
    }

 //need to add jobs.lever.co, jd and application is in different sites
 //need to add ashbyhq, but jd and application is in different sites?
}