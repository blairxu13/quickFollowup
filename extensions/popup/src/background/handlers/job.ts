
console.log("after button clicked");
sentOnce = true;
chrome.storage.local.get(["user_id", "isTracking"], (result) => { 
  const job = {
    ...msg.job,                  // original job info from content.js
    user_id: result.user_id,    // add user_id from local storage
    isSent: false
  };