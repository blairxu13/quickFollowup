// NO imports here — this runs in the page context
export function extractLinkedInLinks() {
  console.log("extract links from first page of Google");
  const anchors = Array.from(document.querySelectorAll('a'));
  const linkedinLinks = anchors
    .map(a => (a as HTMLAnchorElement).href)
    .filter(href => {
      try {
        const url = new URL(href);
        return url.hostname.includes("linkedin.com") && url.pathname.startsWith("/in/");
      } catch {
        return false;
      }
    });

  const cleanedLinks = Array.from(new Set(
    linkedinLinks.map(link => link.split("?")[0].split("&")[0])
  ));

  console.log("✅ Extracted:", cleanedLinks);
  return cleanedLinks; // <- return serializable data
}
