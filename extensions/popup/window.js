let id = "";

document.getElementById("sendBtn").addEventListener("click", () => {
  const subject = "Following up on my application";
  const body = "hello";
  const to = "jadepiper34@gmail.com";  // Add this input in your HTML

  chrome.runtime.sendMessage({
    action: "send_gmail",
    to,
    subject,
    body
  });
});

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["user_id", "isTracking"], (result) => {
    if (result.user_id) {
      // Already logged in
      id = result.user_id;
      console.log(id);
      console.log(result.isTracking);
      document.getElementById("loginPage").style.display = "none";
      document.getElementById("dashboard").style.display = "block";



      // Make sure isTracking is set even if user_id already exists
      if (!result.isTracking) {
        chrome.storage.local.set({ isTracking: true }, () => {
          console.log("✅ isTracking enabled (existing user)");
        });
      }

      chrome.runtime.sendMessage({ action: "start-tracking" }, () => {
        if (chrome.runtime.lastError) {
          console.warn("🚫 Could not connect to background:", chrome.runtime.lastError.message);
        } else {
          console.log("📩 Message successfully sent to background");
        }
      });
    }
  });
  let file;
    const fileInput = document.getElementById("resumeUpload");
    fileInput.addEventListener("change", (event) => {
        file = event.target.files[0];

      });


  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      chrome.storage.local.get(["user_id"], (result) => {
        if (!result.user_id) {
          id = crypto.randomUUID();
          
          chrome.storage.local.set({ user_id: id, isTracking: true }, () => {
             
            console.log("🆕 User logged in and tracking started");
   
            document.getElementById("dashboard").style.display = "block";
            chrome.runtime.sendMessage({ action: "start-tracking" });
            document.getElementById("loginPage").style.display = "none";

             
            const emailInput = document.getElementById("userEmail");
const userEmail = emailInput ? emailInput.value : "";


const formData = new FormData();
formData.append("useruuid", id);              // your user's uuid
formData.append("userEmail", userEmail);      // their email
formData.append("UserResume", file);          // the resume file

fetch("http://localhost:8000/add_users", {
  method: "POST",
  body: formData, 
})

          });
        }
      });
    });
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("msg is here just not showing?")
    if (msg.action === "email-generated") {
      console.log("📬 Email received from backend:", msg.email);
      document.getElementById("messageArea").innerText = msg.email;
    }
  });
  



});
