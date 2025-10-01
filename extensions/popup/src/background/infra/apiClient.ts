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