import { ACTION } from '../../shared/types';

export function scanUntilFirstDMable(links: string[]) {
    if (!Array.isArray(links) || links.length === 0) return;
    let found = false;

    function sendPrefillConnect(tabId: any, connectBody: any) {
        chrome.scripting.executeScript({
            target: { tabId },
            world: "MAIN",
            func: ((body: string) => {
                const observer = new MutationObserver(() => {
                    const connectBox = document.querySelector(
                        'div.msg-form__contenteditable[contenteditable="true"][role="textbox"]'
                      ) as HTMLElement | null;
                      
                    if (!connectBox) return;

                    // connectBox.textContent = body;
                    // connectBox.dispatchEvent(new Event("input", { bubbles: true }));
                    connectBox.focus();
                    connectBox.innerHTML = "";  // ensure clean slate
                    document.execCommand("insertText", false, body);

                    // fallback: force React to notice
                    connectBox.dispatchEvent(new InputEvent("input", { bubbles: true, data: body }));
                    connectBox.dispatchEvent(new Event("change", { bubbles: true }));
          
                    observer.disconnect();
                });
                observer.observe(document.body, { childList: true, subtree: true });
                setTimeout(() => observer.disconnect(), 10000);
            }) as any,
            args: [connectBody],
        });

    }


    function tryNext(index: any) {
        const url = links[index];
        chrome.tabs.create({ url, active: false }, (tab) => {
            const tabId: any = tab.id;
            if (!tabId) return;

            // listener added early to avoid race
            const handler = (msg: any, sender: any, sendResponse: any): boolean | undefined => {
                if (sender.tab.id !== tabId) return;
                if (found) return;

                if (msg.action === ACTION.RECRUITER.RECRUITER_DM_READY) {
                    found = true;
                    chrome.runtime.onMessage.removeListener(handler);

                    chrome.storage.local.get(["shouldRunExtractor", "draftSubject", "draftBody"], (res) => {
                        sendPrefillConnect(tabId, res.draftBody);
                    });
                } else if (msg.action === ACTION.RECRUITER.RECRUITER_NOT_DMABLE && !found) {
                   
                    setTimeout(() => {
                        chrome.tabs.remove(tabId);
                        tryNext(index + 1);
                    }, 10000);
                }
            };

            chrome.runtime.onMessage.addListener(handler);

            // ⏳ wait for THIS tab to finish loading before injecting
            const onLoad = (updatedId: number, info: { status?: string }) => {
                if (updatedId !== tabId || info.status !== "complete") return;
                chrome.tabs.onUpdated.removeListener(onLoad);
                console.log(updatedId);
          
                chrome.scripting.executeScript({
                    target: { tabId },
                    func: () => {
                        const observer = new MutationObserver(() => {
                            // find any Message button
                            const btns = Array.from(
                                document.querySelectorAll('button[aria-label^="Message"], button[aria-label*="Message"]')
                            );

                            // filter for the one that actually has an <svg> inside it
                            const btn = btns.find(b => b.querySelector("svg"));

                            console.log("🕵️ Checking Message buttons:", btns.length);
                            if (!btn) {
                         
                                return;
                            }

                         
                            btn.dispatchEvent(
                                new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
                            );
                            chrome.runtime.sendMessage({ action: "RECRUITER_DM_READY" });
                            observer.disconnect();
                        });



                        observer.observe(document.body, { childList: true, subtree: true });

                        setTimeout(() => {
                            observer.disconnect();
                            chrome.runtime.sendMessage({ action: "RECRUITER_NOT_DMABLE" });
                        }, 10000);
                    }
                });

            };

            chrome.tabs.onUpdated.addListener(onLoad);
        });
    }

    tryNext(0);
}




