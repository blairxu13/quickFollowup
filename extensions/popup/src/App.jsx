import { useEffect, useState, useRef } from "react";
import Form from './features/formTracking';
import Petsystem from './features/petsSystem';
import Connection from './features/connection';
import { getUnsentEmailsList, logUsers } from './background/infra/helper'
import { ClipboardList, PawPrint, Sparkles, UsersRound } from "lucide-react";
import { ACTION } from './shared/types'
import catOpenEyes from './ui/cat_open_eyes.png';
import catCloseEyes from './ui/cat_close_eyes.png';

export default function App() {
  const [userId, setUserId] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [emailList, setEmailList] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [activeBox, setActiveBox] = useState('new'); // 'new' | 'sent'

  // right-pane tabs only: { id, title, kind: 'email' | 'tool', email?, node? }
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);

  const emailInputRef = useRef(null);
  const fileRef = useRef(null);
  const [isSelectingFile, setIsSelectingFile] = useState(false);


  function openEmailTab(email) {
    const id = `email:${String(email.id ?? email.emailSubject ?? Math.random())}`;
    setTabs(prev => (prev.some(t => t.id === id) ? prev : [...prev, {
      id, title: email.emailSubject, kind: 'email', email
    }]));
    setActiveTabId(id);
    setSelectedEmail(email);
  }

  function openToolTab(id, title, node) {
    const tabId = `tool:${id}`;
    setTabs(prev => (prev.some(t => t.id === tabId) ? prev : [...prev, {
      id: tabId, title, kind: 'tool', node
    }]));
    setActiveTabId(tabId);
    setSelectedEmail(null);
  }

  function closeTab(id) {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === id);
      if (idx === -1) return prev;
      const next = prev.filter(t => t.id !== id);
      if (activeTabId === id) {
        const neighbor = next[idx - 1] || next[idx] || null;
        setActiveTabId(neighbor?.id ?? null);
        setSelectedEmail(neighbor?.kind === 'email' ? neighbor.email : null);
      }
      return next;
    });
  }
  //need to add how to deal with the list here?

  useEffect(() => {
    let currentUserId = null;

    function fetchEmails(userId) {
      getUnsentEmailsList(userId).then((res) => {
        if (res.ok) setEmailList(res.data);
      });
    }

    chrome.storage.local.get(["user_id"], (result) => {
      if (!result.user_id) return;
      currentUserId = result.user_id;
      fetchEmails(result.user_id);
    });

    function handleVisibility() {
      if (document.visibilityState === "visible" && currentUserId) {
        fetchEmails(currentUserId);
      }
    }

    function handleStorage(changes, area) {
      if (area !== "local") return;
      if (changes.emailList) {
        const updated = changes.emailList.newValue ?? [];
        setEmailList(updated);
      }
      if (changes.user_id) {
        currentUserId = changes.user_id.newValue ?? null;
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    chrome.storage.onChanged.addListener(handleStorage);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      chrome.storage.onChanged.removeListener(handleStorage);
    };
  }, []);

  useEffect(() => {
    chrome.storage.local.get(["user_id", "isTracking"], (result) => {
      if (!result.user_id) return;
      setUserId(result.user_id);
      setIsTracking(result.isTracking || false);
      if (!result.isTracking) {
        chrome.storage.local.set({ isTracking: true }, () => { });
      }
      chrome.runtime.sendMessage({ action: ACTION.CONNECTION.START_TRACKING });
    });

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === ACTION.RENDER.EMAIL_GENERATED) {
        // Email generated
      }
      if (msg.action === ACTION.RENDER.EMAIL_FETCHED) {
        const list = msg.list || []; // default to empty
        setEmailList(list);
      }
    });
  }, []);

  // Handle window focus to detect when file dialog closes (user cancels)
  useEffect(() => {
    if (!userId && isSelectingFile) {
      const handleFocus = () => {
        // Small delay to ensure onChange fires first if file was selected
        setTimeout(() => {
          if (isSelectingFile && !fileRef.current?.files?.[0]) {
            setIsSelectingFile(false);
          }
        }, 100);
      };

      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [userId, isSelectingFile]);


  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = () => {
    const useFrEmail = emailInputRef.current?.value || "";
    const file = fileRef.current?.files[0];
    
    if (!useFrEmail || !validateEmail(useFrEmail)) {
      alert("Please enter a valid email address");
      return;
    }
    
    if (!file) {
      alert("Please choose a file");
      return;
    }
    
    const newId = crypto.randomUUID();
    setUserId(newId);
    setIsTracking(true);

    chrome.storage.local.set({ user_id: newId, isTracking: true }, () => {
      chrome.runtime.sendMessage({ action: ACTION.CONNECTION.START_TRACKING });

      const formData = new FormData();
      formData.append("useruuid", newId);
      formData.append("userEmail", useFrEmail);
      formData.append("UserResume", file);

      logUsers(formData);

    });
  };

  // const handleSendEmail = () => {
  //   if (!selectedEmail) return;
  //   chrome.runtime.sendMessage({
  //     action: "send_gmail",
  //     to: "jadepiper34@gmail.com",
  //     subject: selectedEmail.emailSubject,
  //     body: selectedEmail.emailText,
  //   });
  // };

  const handlePaste = () => {
    if (!selectedEmail) return;
    chrome.runtime.sendMessage({
      action: ACTION.RECRUITER.START_PASTING,
      company: selectedEmail.company,
      subject: selectedEmail.emailSubject,
      body: selectedEmail.emailText
    });
  };

  return (
    <div className="h-screen w-screen overflow-hidden font-sans">
      {!userId ? (
        <div id="loginPage" className="h-screen relative">
          <div className="flex flex-col items-center justify-center h-screen gap-4" style={{ transform: 'translateY(-80px)' }}>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Your OneStop Networking tool</h1>
            <div className="flex flex-col items-center gap-2">
              <label className="text-sm text-gray-700">Email:</label>
              <input 
                ref={emailInputRef} 
                type="email" 
                placeholder="Enter your email" 
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <label className="text-sm text-gray-700">Your Resume:</label>
              <input 
                ref={fileRef} 
                type="file" 
                accept=".pdf,.doc,.docx" 
                onClick={() => setIsSelectingFile(true)}
                onChange={() => setIsSelectingFile(false)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button 
              type="button" 
              onClick={handleLogin}
              className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-sm hover:bg-gray-200 focus:outline-none transition-colors text-sm font-normal border border-transparent hover:border-gray-300"
            >
              Log In
            </button>
          </div>
          <img 
            src={isSelectingFile ? catCloseEyes : catOpenEyes} 
            alt="cat" 
            className="absolute bottom-0 left-0 w-56 h-56 object-contain"
          />
        </div>
      ) : (
        <div id="dashboard" className="flex h-full w-full min-w-0">
          {/* Left Sidebar — Gmail-like */}
          <div className="w-1/4 h-full border-r border-gray-300 overflow-hidden flex flex-col">
            {/* top icon row (click → opens a TAB on the right) */}
            <div className="flex items-center gap-4 p-2 pr-3 text-gray-700">
              <button
                type="button"
                title="Tracking Form"
                onClick={() => openToolTab('tracking', 'Tracking Form', <Form />)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <ClipboardList size={28} />
              </button>
              {/* <button
                type="button"
                title="Pet System"
                onClick={() => openToolTab('pet', 'Pet System', <Petsystem />)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <PawPrint size={28} className="opacity-60" />
              </button> */}
              <button
                type="button"
                className="p-1 rounded hover:bg-gray-100"
              >
                <Sparkles size={28} className="opacity-60" />
              </button>
              <button
                type="button"
                className="p-1 rounded hover:bg-gray-100"
                 title="Connection"
                 onClick={() => openToolTab('connect', 'Connection', <Connection />)}
              >
                <UsersRound size={28} className="opacity-60" />
              </button>
            </div>

            {/* mailbox links */}
            <nav className="px-2 pb-2">
              <button
                type="button"
                onClick={() => setActiveBox('new')}
                className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${activeBox === 'new' ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}
              >
                New FollowUps
              </button>
              <button
                type="button"
                onClick={() => setActiveBox('sent')}
                className={`mt-1 w-full text-left px-2 py-1.5 rounded-md text-sm ${activeBox === 'sent' ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}
              >
                Sent FollowUps
              </button>
            </nav>

            {/* message list for active mailbox */}
            <div className="flex-1 overflow-auto px-2 pb-2" id="messageList">
              {emailList
                .filter(email => (activeBox === 'new' ? !email.isSent : email.isSent))
                .map(email => (
                  <div
                    key={email.id}
                    onClick={() => openEmailTab(email)}
                    className="p-2 mb-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="text-sm font-medium">{email.emailSubject}</div>
                    <div className="text-xs text-gray-500 truncate">
                      company: {email.company ?? email.emailSubject}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{email.emailText}</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Right Panel with tabs (top of pane) */}
          <div className="flex-1 min-w-0 h-full bg-white flex flex-col">
            {/* per-pane tab strip */}
            {tabs.length > 0 && (
              <div className="flex items-center gap-1 border-b px-2 h-9 sticky top-0 bg-white overflow-x-auto">
                {tabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTabId(t.id);
                      setSelectedEmail(t.kind === 'email' ? t.email : null);
                    }}
                    className={`flex items-center gap-2 px-3 h-7 rounded-t-md text-sm border whitespace-nowrap
                      ${activeTabId === t.id ? 'bg-white border-gray-300' : 'bg-gray-100 border-transparent hover:bg-gray-200'}`}
                    title={t.title}
                  >
                    <span className="truncate max-w-[180px]">{t.title}</span>
                    <span
                      onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                      className="ml-1 text-gray-500 hover:text-gray-800"
                      aria-label="Close tab"
                    >
                      ×
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* panel content */}
            <div className="flex-1 overflow-auto p-4">
              {activeTabId
                ? (() => {
                  const t = tabs.find(x => x.id === activeTabId);
                  if (!t) return <p className="text-gray-500">No tab</p>;
                  if (t.kind === 'tool') return t.node;
                  const e = t.email;
                  return (
                    <div>
                      <h2 className="text-xl font-bold mb-2">{e.emailSubject}</h2>
                      <p className="whitespace-pre-wrap">{e.emailText}</p>
                      {/* <button
                        onClick={handleSendEmail}
                        className="mt-4 px-4 py-2 bg-blue-500 text-black rounded"
                      >
                        Send Email
                      </button> */}
                      <button
                        onClick={handlePaste}
                        className="mt-4 ml-2 px-4 py-2 bg-grey-500 text-black rounded"
                      >
                        PASTE
                      </button>
                    </div>
                  );
                })()
                : (
                  // no tabs open → original fallback
                  <>
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
                          className="mt-4 ml-2 px-4 py-2 bg-blue-500 text-black rounded"
                        >
                          PASTE
                        </button>
                      </div>
                    ) : (
                      <p className="text-gray-500">Select an email to view</p>
                    )}
                  </>
                )
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
