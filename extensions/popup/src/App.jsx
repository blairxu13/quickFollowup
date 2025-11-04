import { useEffect, useState, useRef } from "react";
import Form from './features/formTracking';
import Petsystem from './features/petsSystem';
import { getUnsentEmailsList, logUsers } from './background/infra/helper'
import { ClipboardList, PawPrint, Sparkles } from "lucide-react";
import { ACTION } from './shared/types'

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
    chrome.storage.local.get("user_id", (result) => {
      if (!result.user_id) return;

      // define an inner async function
      async function fetchEmails() {
        const res = await getUnsentEmailsList(result.user_id);
        if (res.ok) setEmailList(res.data);
      }

      fetchEmails(); // call it
    });
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


  const handleLogin = () => {
    const useFrEmail = emailInputRef.current?.value || "";
    const file = fileRef.current?.files[0];
    if (!file) {
      return;
    }
    const newId = crypto.randomUUID();
    setUserId(newId);
    setIsTracking(true);

    chrome.storage.local.set({ user_id: newId, isTracking: true }, () => {
      chrome.runtime.sendMessage({ action: ACTION.CONNECTION.START_TRACKING });

      const formData = new FormData();
      formData.append("useruuid", newId);
      formData.append("userEmail",useFrEmail);
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
        <div id="loginPage">
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" />
          <input ref={emailInputRef} type="email" placeholder="Enter your email" />
          <button type="button" onClick={handleLogin}>Log In</button>
        </div>
      ) : (
        <div id="dashboard" className="flex h-full w-full min-w-0">
          {/* Left Sidebar — Gmail-like */}
          <div className="w-1/4 h-full border-r border-gray-300 overflow-hidden flex flex-col">
            {/* top icon row (click → opens a TAB on the right) */}
            <div className="flex items-center gap-4 p-2 text-gray-700">
              <button
                type="button"
                title="Tracking Form"
                onClick={() => openToolTab('tracking', 'Tracking Form', <Form />)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <ClipboardList size={28} />
              </button>
              <button
                type="button"
                title="Pet System"
                onClick={() => openToolTab('pet', 'Pet System', <Petsystem />)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <PawPrint size={28} />
              </button>
              <button>
              <Sparkles size={28} className="ml-auto opacity-60" />
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
