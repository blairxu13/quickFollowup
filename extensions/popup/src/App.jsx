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
    <div className="h-screen w-screen overflow-hidden font-sans text-[#37352F] bg-white selection:bg-blue-100">
      {!userId ? (
        <div id="loginPage" className="h-screen relative bg-[#F7F7F5]">
          <div className="flex flex-col items-center justify-center h-screen gap-6 z-10 relative" style={{ transform: 'translateY(-80px)' }}>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-sm text-2xl mb-2">
                💼
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Networking Tool</h1>
              <p className="text-sm text-gray-500">Your all-in-one outreach assistant</p>
            </div>
            
            <div className="w-full max-w-xs space-y-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</label>
                <input 
                  ref={emailInputRef} 
                  type="email" 
                  placeholder="name@example.com" 
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Resume</label>
                <input 
                  ref={fileRef} 
                  type="file" 
                  accept=".pdf,.doc,.docx" 
                  onClick={() => setIsSelectingFile(true)}
                  onChange={() => setIsSelectingFile(false)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <button 
                type="button" 
                onClick={handleLogin}
                className="w-full py-2 bg-[#2F2F2F] hover:bg-black text-white rounded-md transition-colors text-sm font-medium shadow-sm mt-2"
              >
                Start Networking
              </button>
            </div>
          </div>
          <img 
            src={isSelectingFile ? catCloseEyes : catOpenEyes} 
            alt="cat" 
            className="absolute bottom-0 left-0 w-56 h-56 object-contain z-0"
          />
        </div>
      ) : (
        <div id="dashboard" className="flex h-full w-full min-w-0">
          {/* Left Sidebar — Notion-like Side Panel */}
          <div className="w-1/4 min-w-[200px] h-full bg-[#F7F7F5] border-r border-[#E9E9E9] flex flex-col">
            
            {/* Top Tools Area */}
            <div className="p-3">
              <div className="text-xs font-semibold text-gray-400 px-2 mb-2 uppercase tracking-wider">Tools</div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  title="Tracking Form"
                  onClick={() => openToolTab('tracking', 'Tracking Form', <Form />)}
                  className="aspect-square flex items-center justify-center rounded-md bg-[#FFE2DD] text-[#D44C47] hover:opacity-80 transition-opacity"
                >
                  <ClipboardList size={20} />
                </button>
                {/* <button
                  type="button"
                  title="Pet System"
                  onClick={() => openToolTab('pet', 'Pet System', <Petsystem />)}
                  className="aspect-square flex items-center justify-center rounded-md bg-[#D3F5F7] text-[#2B9DAD] hover:opacity-80 transition-opacity"
                >
                  <PawPrint size={20} />
                </button> */}
                <button
                  type="button"
                  className="aspect-square flex items-center justify-center rounded-md bg-[#E8DEEE] text-[#9065B0] hover:opacity-80 transition-opacity"
                >
                  <Sparkles size={20} />
                </button>
                <button
                  type="button"
                  title="Connection"
                  onClick={() => openToolTab('connect', 'Connection', <Connection />)}
                  className="aspect-square flex items-center justify-center rounded-md bg-[#FDECC8] text-[#CB912F] hover:opacity-80 transition-opacity"
                >
                  <UsersRound size={20} />
                </button>
              </div>
            </div>

            {/* Navigation */}
            <div className="px-2 mt-2">
              <div className="text-xs font-semibold text-gray-400 px-2 mb-1 uppercase tracking-wider">Mailbox</div>
              <nav className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => setActiveBox('new')}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    activeBox === 'new' 
                      ? 'bg-[#E3E2E0] text-[#37352F] font-medium' 
                      : 'text-gray-600 hover:bg-[#EFEFEF]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${activeBox === 'new' ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                  New FollowUps
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBox('sent')}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    activeBox === 'sent' 
                      ? 'bg-[#E3E2E0] text-[#37352F] font-medium' 
                      : 'text-gray-600 hover:bg-[#EFEFEF]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${activeBox === 'sent' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  Sent FollowUps
                </button>
              </nav>
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-auto px-2 mt-4 pb-2" id="messageList">
              {emailList
                .filter(email => (activeBox === 'new' ? !email.isSent : email.isSent))
                .map(email => (
                  <div
                    key={email.id}
                    onClick={() => openEmailTab(email)}
                    className="group p-3 mb-1 rounded-md hover:bg-[#EFEFEF] cursor-pointer border border-transparent hover:border-[#E0E0E0] transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1">
                       <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">Email</span>
                       <div className="text-xs text-gray-500 truncate">
                        {email.company ?? "Unknown"}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-[#37352F] mb-0.5 truncate">{email.emailSubject}</div>
                    <div className="text-xs text-gray-400 truncate font-normal opacity-80">{email.emailText}</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Right Panel — White paper look */}
          <div className="flex-1 min-w-0 h-full bg-white flex flex-col">
            
            {/* Tab Strip */}
            {tabs.length > 0 && (
              <div className="flex items-end gap-1 px-2 h-10 bg-[#F7F7F5] border-b border-[#E9E9E9] overflow-x-auto no-scrollbar">
                {tabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTabId(t.id);
                      setSelectedEmail(t.kind === 'email' ? t.email : null);
                    }}
                    className={`
                      group relative flex items-center gap-2 px-3 h-8 rounded-t-md text-sm border-t border-l border-r transition-all
                      ${activeTabId === t.id 
                        ? 'bg-white border-[#E9E9E9] border-b-white text-[#37352F] font-medium -mb-[1px] z-10' 
                        : 'bg-[#F1F0EF] border-transparent text-gray-500 hover:bg-[#EBEAE9]'}
                    `}
                    title={t.title}
                  >
                    <span className="truncate max-w-[150px]">{t.title}</span>
                    <span
                      onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                      className={`ml-1 w-4 h-4 flex items-center justify-center rounded-sm hover:bg-black/10 ${activeTabId === t.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      aria-label="Close tab"
                    >
                      ×
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-8">
              {activeTabId
                ? (() => {
                  const t = tabs.find(x => x.id === activeTabId);
                  if (!t) return <p className="text-gray-400 text-center mt-20">Tab not found</p>;
                  if (t.kind === 'tool') return (
                    <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
                      {t.node}
                    </div>
                  );
                  const e = t.email;
                  return (
                    <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
                      <div className="mb-6 pb-4 border-b border-[#E9E9E9]">
                        <h2 className="text-2xl font-bold text-[#37352F] mb-2">{e.emailSubject}</h2>
                        <div className="flex gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-50 text-orange-700">
                            {e.company ?? "No Company"}
                          </span>
                        </div>
                      </div>
                      <div className="prose prose-sm max-w-none text-[#37352F] whitespace-pre-wrap font-sans leading-relaxed">
                        {e.emailText}
                      </div>
                      
                      <div className="mt-8 flex gap-3 pt-4 border-t border-[#E9E9E9]">
                        {/* <button
                          onClick={handleSendEmail}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition-colors"
                        >
                          Send Email
                        </button> */}
                        <button
                          onClick={handlePaste}
                          className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#37352F] rounded shadow-sm hover:bg-gray-50 text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <ClipboardList size={16} />
                          Copy & Paste
                        </button>
                      </div>
                    </div>
                  );
                })()
                : (
                  // No tabs open view
                  <div className="h-full flex flex-col">
                    {selectedEmail ? (
                      <div className="max-w-2xl mx-auto w-full animate-in fade-in duration-300">
                        <div className="mb-6 pb-4 border-b border-[#E9E9E9]">
                          <h2 className="text-2xl font-bold text-[#37352F] mb-2">{selectedEmail.emailSubject}</h2>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-50 text-orange-700">
                            {selectedEmail.company ?? "No Company"}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-[#37352F] leading-relaxed text-sm">{selectedEmail.emailText}</p>
                        
                        <div className="mt-8 flex gap-3 pt-4 border-t border-[#E9E9E9]">
                           <button
                            onClick={handleSendEmail} // Note: this function was commented out in your original code, assuming it exists in scope or you will uncomment it
                             className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm"
                          >
                            Send Email
                          </button>
                          <button
                            onClick={handlePaste}
                            className="px-4 py-2 bg-white border border-[#E0E0E0] text-[#37352F] rounded shadow-sm hover:bg-gray-50 text-sm font-medium transition-colors flex items-center gap-2"
                          >
                            <ClipboardList size={16} />
                            Copy & Paste
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-4">
                        <Sparkles size={48} strokeWidth={1} />
                        <p className="text-sm font-medium text-gray-400">Select an email or open a tool</p>
                      </div>
                    )}
                  </div>
                )
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}