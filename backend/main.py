# backend/main.py

from fastapi import FastAPI, Body, Request, Form, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import json
from dotenv import load_dotenv
from supabase import create_client
import fitz
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from typing import Optional
import requests

N8N_WEBHOOK_URL = "https://networkingdailydigest.app.n8n.cloud/webhook-test/c6eba799-e1aa-4770-8ef9-441ac1d1e9a2"
load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

openai_key = os.getenv("OPENAI_SK")
llm = ChatOpenAI(model="gpt-4o", temperature=0.7, openai_api_key=openai_key)


class JobPost(BaseModel):
    user_id: str
    job_title: str
    company: str
    url: str
    jd: str
    isSent: bool = False
    emailText: Optional[str] = None
    emailSubject: Optional[str] = None


class User(BaseModel):
    useruuid: str
    userEmail: str


class ConnectionPayload(BaseModel):
    user_id: str
    user_school: str
    user_major: Optional[str] = None
    user_month_goal: Optional[str] = None
    user_companies_goal: Optional[str] = None
    user_email: Optional[str] = None


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://iampfnenlnmjhnhnghldoehemkdkpceh"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def process_job_added(user_id: str, job_title: str, jd: str):
    user = supabase.table("users").select("userResume").eq("useruuid", user_id).single().execute().data
    resume_path = user["userResume"]
    resume_file = supabase.storage.from_("resumes").download(resume_path)

    with open("temp_resume.pdf", "wb") as f:
        f.write(resume_file)

    with fitz.open("temp_resume.pdf") as doc:
        resume_text = "\n".join(page.get_text() for page in doc)

    prompt = ChatPromptTemplate.from_template("""
You are a helpful assistant. Based on the resume and job description, write a personalized follow-up email to a recruiter.

Return your answer in this exact JSON format:

{{{{
  "subject": "...",  
  "body": "..."  
}}}}

Job Title: {job_title}

Job Description:
{jd}

Resume:
{resume_txt}
""")

    chain = prompt | llm
    response = chain.invoke({
        "job_title": job_title,
        "jd": jd,
        "resume_txt": resume_text
    })
    
    try:
        cleaned = response.content.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned.replace("```json", "").strip()
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()

        parsed = json.loads(cleaned)
        subject = parsed["subject"]
        body = parsed["body"]
        return {"subject": subject, "body": body}
    except json.JSONDecodeError:
        return {"subject": "Follow-up", "body": response.content}

# track application should be able to

@app.post("/track_application")
async def track_application(job: JobPost):
    try:
        email_object = await process_job_added(job.user_id, job.job_title, job.jd)
        job_data = job.dict()
        job_data["emailSubject"] = email_object["subject"]
        job_data["emailText"] = email_object["body"]
        supabase.table("job_posts").insert(job_data).execute()
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

    

@app.get("/get_applications")
def get_application(user_id: str = Query(...)):
    res = (
        supabase
        .table("job_posts")
        .select("created_at,job_title,company")
        .eq("user_id", user_id)
        .order("created_at", desc=True)   
        .execute()
    )
    return res.data
#get user_pet, is to check if the user owns a pet or not
#post pet_info, register pet for the user
@app.get("/get_unsent_emails")

async def get_unsent_emails(user_id: str):
    response = (
        supabase.table("job_posts")
        .select("*")
        .eq("user_id", user_id)
        .eq("isSent", False)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data

@app.post("/user_sign_up_for_connections")
async def user_sign_up_for_connections(payload: ConnectionPayload):
    try:
        supabase.table("connections").insert(payload.dict()).execute()

        try:
            requests.post(
                N8N_WEBHOOK_URL,
                json=payload.dict(),
                timeout=5,
            )
        except Exception:
            pass

        return {"ok": True}
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)



@app.post("/adopt")
def adopt (body: dict = Body(...)):
    user_id = body.get("user_id")
    pet_name = body.get("pet_name")  # or look up by pet_name if that's what you send

    supabase.table("petSystem").upsert(
        {"user_uuid": user_id, "pet_name": pet_name},
    
    ).execute()

    return {"ok": True}



@app.get("/get_user_pet_info")

async def get_user_pet_info(user_id: str):
    response = (
        supabase.table("petSystem")
        .select("*")  
        .eq("user_uuid", user_id)
        .execute()
    )
    return response.data

@app.post("/add_users")
async def add_users(
    useruuid: str = Form(...),
    userEmail: str = Form(...),
    UserResume: UploadFile = File(...)
):
    resume_path = f"user_{useruuid}/{UserResume.filename}"
    file_bytes = await UserResume.read()
    supabase.storage.from_("resumes").upload(
        path=resume_path,
        file=file_bytes
    )

    user_data = {
        "useruuid": useruuid,
        "userEmail": userEmail,
        "userResume": f"user_{useruuid}/{UserResume.filename}"
    }

    response = supabase.table("users").insert(user_data).execute()
    return JSONResponse(content={"status": "success", "data": response.data})





def _public_url(bucket: str, path: str) -> str:
    resp = supabase.storage.from_(bucket).get_public_url(path)
    if isinstance(resp, str):
        return resp
    
    return (resp.get("data", {}) or {}).get("publicUrl") or ""

@app.get("/get_pet")
def get_pet_image(user_id: str):
    res = supabase.table("petSystem").select(
        "pet_name"
    ).eq("user_uuid", user_id).execute()
    ans= _public_url("pet", res)
    return ans


@app.get("/")
def root():
    return {"ok": True, "message": "QuickFollowup backend is alive!"}


@app.get("/static_pet")
   
def list_pet_species():
    res = supabase.table("pet_species").select(
        "pet_name, pet_description, pet_image"
    ).execute()
    rows = res.data or []
    
    out = []
    for r in rows:
        key = r["pet_image"]
        if key.startswith("pet/"):  # strip the bucket prefixs
            key = key[len("pet/"):]
        out.append({
            "name": r["pet_name"],
            "description": r["pet_description"],
            "image_url": _public_url("pet", key),  
        })
    return out
