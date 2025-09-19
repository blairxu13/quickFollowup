# 🚀 QuickFollowUp

QuickFollowUp is a smart browser extension + backend system that helps job seekers and professionals **automatically generate personalized follow-up emails** after job applications, recruiter outreach, or professional networking.  

It detects job applications, fetches recruiter info, and crafts compliant, AI-powered follow-ups — so you never miss an opportunity again.

---

## ✨ Features

- 🔍 **Job Detection** – Automatically detects when you’ve applied for a job (Workday, Greenhouse, Lever, etc.).
- 📬 **AI-Generated Follow-Ups** – Generates professional, customizable follow-up messages in seconds.
- 🤝 **Recruiter Discovery** – Finds recruiter contact info (via LinkedIn/Hunter.io APIs).
- ⚡ **Fast & Lightweight** – Built with React (frontend) + FastAPI (backend).
- 🔒 **Compliance First** – Includes consent + disclosure handling for safe outreach.

---

## 🛠️ Tech Stack

- **Frontend:** React.js + Tailwind CSS + Chrome Extension (Manifest v3)
- **Backend:** Python + FastAPI
- **Database:** Supabase (PostgreSQL)
- **AI Layer:** LangChain + LangGraph + OpenAI/Gemini APIs
- **Other Tools:** Docker, GitHub Actions (CI/CD)

---

## 📦 Installation

### 1. Clone the repo
```bash
git clone https://github.com/your-username/quickfollowup.git
cd quickfollowup

cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

cd extension
npm install
npm run build
