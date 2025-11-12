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
    console.log("[scrapeJob] start", { site, pathname });

    const looksLikeJob = /(job|jobs|career|careers)/.test(pathname) && /\d+/.test(pathname);
    console.log("[scrapeJob] looksLikeJob", looksLikeJob);

    let job_title: string | undefined, company: string, jd: string | undefined;

    if (site.includes("wd5.myworkdayjobs.com")) {
        console.log("[scrapeJob] workday detected");
        const currentUrl = window.location.href;
        const isApplicationView = currentUrl.includes("/apply");
        
        let jobBaseUrl = currentUrl;
        if (isApplicationView) {
            // Extract base URL by removing /apply and everything after it
            const applyIndex = currentUrl.indexOf("/apply");
            jobBaseUrl = currentUrl.substring(0, applyIndex);
            // Remove trailing slash if present
            if (jobBaseUrl.endsWith("/")) {
                jobBaseUrl = jobBaseUrl.slice(0, -1);
            }
        }
        
        company = site.split(".")[0];
        console.log("[scrapeJob] workday", { isApplicationView, jobBaseUrl, company });

        const extractFromDocument = (doc: Document) => {
            const titleEl = doc.querySelector('h2[data-automation-id="jobPostingHeader"]') as HTMLElement | null;
            const descEl = doc.querySelector('div[data-automation-id="jobPostingDescription"]') as HTMLElement | null;

            const extractedTitle = titleEl?.innerText?.trim();
            
            // Extract text from <p> tags inside the description div
            let extractedDescription = "";
            if (descEl) {
                const pTags = descEl.querySelectorAll("p");
                if (pTags.length > 0) {
                    extractedDescription = Array.from(pTags)
                        .map(p => p.innerText?.trim())
                        .filter(Boolean)
                        .join("\n\n");
                } else {
                    // Fallback to innerText if no p tags found
                    extractedDescription = descEl.innerText?.trim() || "";
                }
            }

            console.log("[scrapeJob] workday extracted", {
                hasTitle: Boolean(extractedTitle),
                hasDescription: Boolean(extractedDescription),
                descriptionLength: extractedDescription.length
            });

            if (extractedTitle || extractedDescription) {
                saveJobData({
                    user_id: user,
                    url: jobBaseUrl,
                    job_title: extractedTitle,
                    company: company,
                    jd: extractedDescription,
                });
                console.log("[scrapeJob] workday saved");
                return true;
            } else {
                console.log("[scrapeJob] workday no data to save");
                return false;
            }
        };

        const waitForWorkdayData = (doc: Document, maxAttempts = 20) => {
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                if (extractFromDocument(doc)) {
                    clearInterval(checkInterval);
                } else if (attempts >= maxAttempts) {
                    console.warn("[scrapeJob] workday timeout waiting for data");
                    clearInterval(checkInterval);
                }
            }, 300);
        };

        if (isApplicationView) {
            console.log("[scrapeJob] workday application view, fetching base page");
            fetch(jobBaseUrl, { credentials: "include" })
                .then((response) => {
                    if (!response.ok) {
                        console.warn("[scrapeJob] workday fetch failed", response.status);
                        throw new Error(`Failed to fetch job page (${response.status})`);
                    }
                    return response.text();
                })
                .then((html) => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, "text/html");
                    waitForWorkdayData(doc);
                })
                .catch((err) => {
                    console.warn("[scrapeJob] workday fetch error", err);
                    // If fetch fails, attempt to scrape from the current document as a fallback
                    waitForWorkdayData(document);
                });
        } else {
            waitForWorkdayData(document);
        }

        return;
    }

    // WHY: Check for greenhouse.io (including job-boards.greenhouse.io)
    // The URL pattern is: /companyname/jobs/jobid
    // For job-boards.greenhouse.io: pathParts = ["", "companyname", "jobs", "jobid"]
    // So pathParts.length = 4, pathParts[2] = "jobs" ✓
    if (site.includes("greenhouse.io")) {
        if (pathParts.length >= 4 &&
            pathParts[2] === "jobs" &&
            looksLikeJob) {
            console.log("[scrapeJob] greenhouse detected");
            if (pathname.includes("confirmation")) {
                console.log("[scrapeJob] greenhouse confirmation page, skip scrape");
                return;
            }

            const titleEl = document.querySelector(".job__title") as HTMLElement | null;
            const descEl = document.querySelector(".job__description") as HTMLElement | null;

            job_title = titleEl?.innerText?.trim();
            company = pathParts[1];
            jd = descEl?.innerText?.trim();
            
            saveJobData({ user_id: user, url: window.location.href, job_title, company, jd });
            console.log("[scrapeJob] greenhouse saved", { job_title, company });
            return;
        }
    }

    if (site.includes("jobs.ashbyhq.com")) {
        console.log("[scrapeJob] ashby detected");
        const cleanedParts = pathParts.filter(Boolean);
        if (cleanedParts.length === 0) {
            console.log("[scrapeJob] ashby no path parts");
            return;
        }

        const isApplicationView = cleanedParts[cleanedParts.length - 1] === "application";
        const baseParts = isApplicationView ? cleanedParts.slice(0, -1) : cleanedParts;

        if (baseParts.length === 0) {
            console.log("[scrapeJob] ashby no base parts after trimming application");
            return;
        }

        const companySlug = baseParts[0];
        const jobBaseUrl = `${window.location.origin}/${baseParts.join("/")}`;
        console.log("[scrapeJob] ashby base url", { companySlug, jobBaseUrl, isApplicationView });

        const extractFromDocument = (doc: Document) => {
            const titleEl =
                (doc.querySelector("h1.ashby-job-posting-heading") as HTMLElement | null) ??
                (doc.querySelector('h1._title_ud4nd_34._large_ud4nd_67.ashby-job-posting-heading') as HTMLElement | null) ??
                (doc.querySelector('h1[class*="_title_ud4nd_34"][class*="ashby-job-posting-heading"]') as HTMLElement | null) ??
                (doc.querySelector('h1[class*="_title_ud4nd_34"]') as HTMLElement | null) ??
                (doc.querySelector('h1[class*="_title_"]') as HTMLElement | null);

            const descEl =
                (doc.querySelector('[class*="_descriptionText_oj0x8_198"]') as HTMLElement | null) ??
                (doc.querySelector('#overview [class*="_descriptionText_"]') as HTMLElement | null) ??
                (doc.querySelector('[class*="_descriptionText_"]') as HTMLElement | null) ??
                (doc.querySelector('[class*="ashby-job-posting"]') as HTMLElement | null);

            const extractedTitle = titleEl?.innerText?.trim();
            const extractedDescription = descEl?.innerText?.trim();
            console.log("[scrapeJob] ashby extracted", {
                hasTitle: Boolean(extractedTitle),
                hasDescription: Boolean(extractedDescription)
            });

            if (extractedTitle || extractedDescription) {
                saveJobData({
                    user_id: user,
                    url: jobBaseUrl,
                    job_title: extractedTitle,
                    company: companySlug,
                    jd: extractedDescription,
                });
                console.log("[scrapeJob] ashby saved");
                console.log("job data is", { user_id: user, url: jobBaseUrl, job_title: extractedTitle, company: companySlug, jd: extractedDescription });
                return true;
            } else {
                console.log("[scrapeJob] ashby no data to save");
                return false;
            }
        };

        const waitForAshbyData = (doc: Document, maxAttempts = 20) => {
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                if (extractFromDocument(doc)) {
                    clearInterval(checkInterval);
                } else if (attempts >= maxAttempts) {
                    console.warn("[scrapeJob] ashby timeout waiting for data");
                    clearInterval(checkInterval);
                }
            }, 300);
        };

        if (isApplicationView) {
            console.log("[scrapeJob] ashby application view, fetching base page");
            fetch(jobBaseUrl, { credentials: "include" })
                .then((response) => {
                    if (!response.ok) {
                        console.warn("[scrapeJob] ashby fetch failed", response.status);
                        throw new Error(`Failed to fetch job page (${response.status})`);
                    }
                    return response.text();
                })
                .then((html) => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, "text/html");
                    waitForAshbyData(doc);
                })
                .catch((err) => {
                    console.warn("[scrapeJob] ashby fetch error", err);
                    // If fetch fails, attempt to scrape from the current document as a fallback
                    waitForAshbyData(document);
                });
        } else {
            waitForAshbyData(document);
        }

        return;
    }

    if (site.includes("jobs.lever.co")) {
        console.log("[scrapeJob] lever detected");
        const cleanedParts = pathParts.filter(Boolean);
        if (cleanedParts.length < 2) {
            console.log("[scrapeJob] lever insufficient path parts");
            return;
        }

        const isApplicationView = cleanedParts[cleanedParts.length - 1] === "apply";
        const baseParts = isApplicationView ? cleanedParts.slice(0, -1) : cleanedParts;

        if (baseParts.length < 2) {
            console.log("[scrapeJob] lever insufficient base parts after trimming apply");
            return;
        }

        const companySlug = baseParts[0];
        const jobBaseUrl = `${window.location.origin}/${baseParts.join("/")}`;
        console.log("[scrapeJob] lever base url", { companySlug, jobBaseUrl, isApplicationView });

        const extractFromDocument = (doc: Document) => {
            const titleEl =
                (doc.querySelector("div.posting-headline h2") as HTMLElement | null) ??
                (doc.querySelector(".posting-headline h2") as HTMLElement | null) ??
                (doc.querySelector("h2") as HTMLElement | null);

            const descEl =
                (doc.querySelector('.section-wrapper.page-full-width') as HTMLElement | null) ??
                (doc.querySelector('.section-wrapper') as HTMLElement | null) ??
                (doc.querySelector('[data-qa="job-description"]') as HTMLElement | null);

            const extractedTitle = titleEl?.innerText?.trim();
            const extractedDescription = descEl?.innerText?.trim();
            console.log("[scrapeJob] lever extracted", {
                hasTitle: Boolean(extractedTitle),
                hasDescription: Boolean(extractedDescription)
            });

            if (extractedTitle || extractedDescription) {
                saveJobData({
                    user_id: user,
                    url: jobBaseUrl,
                    job_title: extractedTitle,
                    company: companySlug,
                    jd: extractedDescription,
                });
                console.log("[scrapeJob] lever saved");
                return true;
            } else {
                console.log("[scrapeJob] lever no data to save");
                return false;
            }
        };

        const waitForLeverData = (doc: Document, maxAttempts = 20) => {
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                if (extractFromDocument(doc)) {
                    clearInterval(checkInterval);
                } else if (attempts >= maxAttempts) {
                    console.warn("[scrapeJob] lever timeout waiting for data");
                    clearInterval(checkInterval);
                }
            }, 300);
        };

        if (isApplicationView) {
            console.log("[scrapeJob] lever application view, fetching base page");
            fetch(jobBaseUrl, { credentials: "include" })
                .then((response) => {
                    if (!response.ok) {
                        console.warn("[scrapeJob] lever fetch failed", response.status);
                        throw new Error(`Failed to fetch job page (${response.status})`);
                    }
                    return response.text();
                })
                .then((html) => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, "text/html");
                    waitForLeverData(doc);
                })
                .catch((err) => {
                    console.warn("[scrapeJob] lever fetch error", err);
                    waitForLeverData(document);
                });
        } else {
            waitForLeverData(document);
        }

        return;
    }

    console.log("[scrapeJob] no matching scraper branch");
}