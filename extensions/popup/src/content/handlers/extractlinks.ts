import {ACTION} from '../../shared/types'

export function extractLinkedInLinks() {
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
      action: ACTION.RECRUITER.RECRUITER_LINKS_FOUND,
      links: cleanedLinks
    });
     
    chrome.runtime.sendMessage({ action: ACTION.RECRUITER.CLOSE_THIS_TAB });
  }