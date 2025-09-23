import { useEffect, useState, useRef } from "react";
import Form from './features/formTracking';
import Petsystem from './features/petsSystem'

export default function App() {
  const [userId, setUserId] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [emailList, setEmailList] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const emailInputRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    console.log("first render?")
    chrome.storage.local.get("user_id", (result) => {
      if (!result.user_id) return;

      fetch(`http://localhost:8000/get_unsent_emails?user_id=${result.user_id}`)
        .then(res => res.json())
        .then(data => {
          setEmailList(data);
        });
    });
    console.log("should be render first", emailList)
  }, []);

  useEffect(() => {
    chrome.storage.local.get(["user_id", "isTracking"], (result) => {
      if (result.user_id) {
        setUserId(result.user_id);
        setIsTracking(result.isTracking || false);
        console.log(result.user_id, result.isTracking);

        if (!result.isTracking) {
          chrome.storage.local.set({ isTracking: true }, () => {
            console.log("isTracking enabled (existing user)");
          });
        }

        chrome.runtime.sendMessage({ action: "start-tracking" }, () => {
          if (chrome.runtime.lastError) {
            console.warn("?Background error:", chrome.runtime.lastError.message);
          } else {
            console.log("?Tracking started");
          }
        });
      }
    });


    
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === "email-generated") {
        console.log(" Email received:", msg.email);
      }
      if (msg.action === "emails-fetched") {
        setEmailList(msg.emails);
      }
    });
  }, []);



  const handleLogin = () => {
    const userEmail = emailInputRef.current?.value || "";
    const file = fileRef.current?.files[0];

    if (!file) {
      console.error("No file selected!");
      return;
    }

    // Now that we know `file` is valid, generate the new user ID and update state:
    const newId = crypto.randomUUID();
    setUserId(newId);
    setIsTracking(true);

    chrome.storage.local.set({ user_id: newId, isTracking: true }, () => {
      console.log("User logged in and tracking started");
      chrome.runtime.sendMessage({ action: "start-tracking" });

      const formData = new FormData();
      formData.append("useruuid", newId);
      formData.append("userEmail", userEmail);
      formData.append("UserResume", file);
      console.log("here is the formdata from log in", formData);

      fetch("http://localhost:8000/add_users", {
        method: "POST",
        body: formData,
      });
    });
  };

  const handleSendEmail = () => {
    if (!selectedEmail) return;

    chrome.runtime.sendMessage({
      action: "send_gmail",
      to: "jadepiper34@gmail.com", // Replace with actual recipient if dynamic
      subject: selectedEmail.emailSubject,
      body: selectedEmail.emailText,
    });
  };
  const handlePaste = () => {

    chrome.runtime.sendMessage({
      action: "startpasting",
      company: selectedEmail.company,
      subject: selectedEmail.emailSubject,
      body: selectedEmail.emailText

    });
    console.log("send to background to check goolge links for this company!")
  };

  return (
    <div className="h-screen w-screen overflow-hidden font-sans">
      {!userId ? (
        <div id="loginPage">
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" />
          <input ref={emailInputRef} type="email" placeholder="Enter your email" />
          <button type="button" onClick={handleLogin}>Log In</button>
        </div>
      ) : (
        <div id="dashboard" className="flex h-full w-full">
          {/* Left Sidebar */}
          <div className="w-1/4 h-full border-r border-gray-300 overflow-y-auto flex flex-col divide-y divide-gray-200">
            <div className="flex-1 overflow-auto bg-red-100 p-2" id="newMsgSection">
              <p className="font-bold mb-2">Unsent FollowUps</p>
              {emailList
                .filter(email => !email.isSent)
                .map(email => (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className="p-2 mb-2 bg-white rounded shadow cursor-pointer hover:bg-gray-100"
                  >
                    <h3 className="font-semibold text-sm">{email.emailSubject}</h3>
                    <p className="text-xs text-gray-500 truncate">{email.emailText}</p>
                  </div>
                ))}
            </div>

            <div className="flex-1 overflow-auto bg-blue-100 p-2" id="sentMsgSection">
              <p className="font-bold mb-2">Sent FollowUps</p>
              {emailList
                .filter(email => email.isSent)
                .map(email => (
                  <div
                    onClick={() => setSelectedEmail(email)}
                    className="p-2 mb-2 bg-white rounded shadow cursor-pointer hover:bg-gray-100"
                  >
                    <h3 className="font-semibold text-sm">{email.emailSubject}</h3>
                    <p className="text-xs text-gray-500 truncate">{email.emailText}</p>
                  </div>
                ))}
            </div>
          </div>
          <Form />
          <Petsystem />
          {/* Right Panel */}
          <div className="flex-1 h-full overflow-auto p-4 bg-white">
            {selectedEmail ? (
              <div>
                <h2 className="text-xl font-bold mb-2">{selectedEmail.emailSubject}</h2>
                <p className="whitespace-pre-wrap">{selectedEmail.emailText}</p>
                <button
                  onClick={handleSendEmail}
                  className="mt-4 px-4 py-2 bg-blue-500 text-black rounded"
                >
                  Send Email
                </button>
                <button
                  onClick={handlePaste}
                  className="mt-4 px-4 py-2 bg-blue-500 text-black rounded"
                >
                  PASTE
                </button>
              </div>
            ) : (
              <p className="text-gray-500">Select an email to view</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
