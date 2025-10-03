





export type APIok <T> = {ok: true; data: T};
export type APIfail = {ok: false; error: {message: string}};
export type APIresult <T> = APIok<T> | APIfail;

const BASE = env.VITE_track_application_url;

export async function jsonPost <TResp, Tbody> (
  path: string,
  body: Tbody
): Promise<APIresult<TResp>>  {

try {


    const res = await fetch(BASE + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      return { ok: false, error: {  message: res.statusText } };
      //404
    }
    return { ok: true, data: await res.json() as TResp };

}catch (e: any) {
  //cors blocked by browser, no internet

  return { ok: false, error: { message: String(e) } };
}


}




export async function jsonGet <TResp> (
  path: string,
 
): Promise<APIresult<TResp>>  {

try {


    const res = await fetch(BASE + path, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    
    });
    if (!res.ok) {
      return { ok: false, error: {  message: res.statusText } };
      //404
    }
    return { ok: true, data: await res.json() as TResp };

}catch (e: any) {
  //cors blocked by browser, no internet

  return { ok: false, error: { message: String(e) } };
}


}






































console.log("after button clicked");
const sentOnce: boolean = true;
chrome.storage.local.get(["user_id"], (result) => {
    const job = {
        ...msg.job,                  // original job info from content.js
        user_id: result.user_id,    // add user_id from local storage
        isSent: false
    };
    //isTracking is for not to run the application excessively

    console.log("✅ Final job payload:", job);
    console.log("📤 Sending to backend:", job);

    fetch("http://localhost:8000/track_application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
    })
        .then(() => {
            console.log("✅ track_application returned successfully");
            return fetch(`http://localhost:8000/get_unsent_emails?user_id=${result.user_id}`);
        })
        .then(res => {
            console.log("📥 Received response for get_unsent_emails", res.status);
            return res.json();
        })
        .then(data => {
            console.log("📬 Parsed unsent emails:", data);
            chrome.runtime.sendMessage({ action: "emails-fetched", emails: data });
        })
        .catch(err => {
            console.error("❌ Error in fetch chain:", err);
        });


});