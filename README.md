# 🪄 QuickFollowup  
> 🚀 Automating recruiter follow-ups with AI — because great candidates deserve to be remembered.

---

## 💡 Overview  
**QuickFollowup** is an AI-powered Chrome extension that helps job seekers automatically generate personalized follow-up emails, track every application, and find message-able recruiters on LinkedIn — all in one flow.

The system detects job submission events, extracts key details (company, position, and description), and uses **LangGraph + OpenAI API** to craft custom follow-ups.  
It also leverages a **Chrome background service worker** to locate recruiters and determine if they’re DM-able.

---

## 🎯 Problem & Motivation  
Like many job seekers, I noticed that cold applications often disappear into a void.  
Manually following up — switching between ChatGPT, LinkedIn, and spreadsheets — was exhausting and chaotic.

I built QuickFollowup to make this process automatic, human, and even fun:
- Auto-generate tailored emails instead of copying from ChatGPT.  
- Auto-open recruiter profiles that can actually receive messages.  
- Auto-track each application’s status — all while earning coins to care for your virtual **Tamagotchi-style pet**.

The goal is to make job follow-ups **consistent, personalized, and stress-free**.

---

## 🧱 System Architecture  
QuickFollowup consists of four main components:

1. **Frontend (Chrome Extension – React + TypeScript)**  
   - Detects job application submissions and scrapes job details from LinkedIn, Workday, etc.  
   - Sends structured data to the backend for email generation.

2. **Backend (FastAPI – Python)**  
   - Handles API logic, context-aware email generation (LangGraph + OpenAI), and rate limiting.  
   - Caches responses and stores drafts for review.

3. **Database (Supabase)**  
   - Stores user data, email drafts, and application history.  
   - Uses SQL triggers to auto-update leaderboard points on each successful follow-up.

4. **Electron App (Pet System)**  
   - Gamifies progress: users adopt a digital pet that thrives only when they apply and follow up consistently.

---

## ⚙️ Key Features  
- ✅ Real-time job detection & tracking  
- 🧠 AI-generated personalized follow-ups  
- 💬 Recruiter discovery via background service worker  
- 🧩 Integrated leaderboard & gamified pet system  
- 🗃️ Persistent data with Supabase + automatic point tracking  
- 🧍 Fully functional local environment (frontend ↔ backend ↔ database)

---

## 🧩 Technical Challenges Solved  
- Implemented async message passing between background, content, and popup scripts via the Chrome runtime API.  
- Solved delayed DOM rendering using a custom `waitFor()` utility for Workday pages.  
- Integrated LangGraph to maintain contextual tone and company-specific personalization.  
- Designed Supabase SQL triggers to automatically sync leaderboard points.

---

## 🪜 Next Steps  
- Deploy backend via **Render / Vercel** and host data with **Supabase**.  
- Add **JWT-based user authentication**.  
- Implement **caching + retry logic** for API stability.  
- Refine **AI personalization logic** for company-specific tone.  
- Add **tarot-reading side feature** for user engagement (“fuzzies”).  
- Publish Chrome extension for public testing.

---

## 🧠 Learnings  
Building QuickFollowup taught me how to:
- Structure cross-script communication across Chrome’s MV3 architecture.  
- Manage async workflows between frontend, backend, and external APIs.  
- Combine AI generation with real user workflows instead of toy demos.  
- Ship MVPs fast and iterate calmly — even under complex, multi-system setups.

---

## 👋 About Me  
I’m **Blair**, a CS graduate passionate about building tools that blend **AI + workflow automation** to make people’s work easier and more fun.

Feel free to connect:
- 📧 **Email:** [Jadepiper34@gmail.com](mailto:Jadepiper34@gmail.com)  
