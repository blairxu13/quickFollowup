import { ACTION } from '../../shared/types';
import { extractLinkedInLinks } from './extractlinks';
import { scanUntilFirstDMable } from './scanDm';

let searchTabId: number | null = null;

export function fetchReadableLinks(company: string, subject: string, body: string) {
  const query = `site:linkedin.com/in recruiter ${company}`;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  chrome.storage.local.set({ draftSubject: subject, draftBody: body }, () => {
    chrome.tabs.create({ url: searchUrl }, (tab) => {
      if (!tab.id) return;

      const currentTabId = tab.id;
      searchTabId = tab.id;
      chrome.storage.local.set({ searchTabId: tab.id });

      const onLoad = (updatedId: number, info: { status?: string }) => {
        if (updatedId !== currentTabId || info.status !== "complete") return;
        chrome.tabs.onUpdated.removeListener(onLoad);

        chrome.scripting.executeScript({
          target: { tabId: currentTabId },
          func: extractLinkedInLinks, // must RETURN the links
        })
        .then(([inj]) => {
          const links = Array.isArray(inj?.result) ? inj.result : [];
          scanUntilFirstDMable(links);
          chrome.tabs.remove(currentTabId); 
        })
        .catch((err) => {
          chrome.tabs.remove(currentTabId); // don't leave zombie tabs
        });
      };
        
      chrome.tabs.onUpdated.addListener(onLoad);
    });
  });
}

