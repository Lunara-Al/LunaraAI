import os
from datetime import datetime
import ssl
import smtplib
from email.message import EmailMessage

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base, Session

# ==============================
# DATABASE SETUP (SQLite)
# ==============================

DATABASE_URL = "sqlite:///./contact_messages.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


def create_db_and_tables():
    # "Migration": creates the table if it doesn't exist
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==============================
# REQUEST SCHEMA
# ==============================

class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    message: str


# ==============================
# GMAIL EMAIL SENDER
# ==============================

def send_contact_email(data: ContactRequest):
    """
    Sends an email to you when someone submits the contact form.
    Uses Gmail SMTP with an app password.
    """

    gmail_user = os.environ.get("GMAIL_USER")
    gmail_app_password = os.environ.get("GMAIL_APP_PASSWORD")
    to_email = os.environ.get("TO_EMAIL", gmail_user)

    if not gmail_user or not gmail_app_password or not to_email:
        print("⚠️ Email not sent: missing GMAIL_USER / GMAIL_APP_PASSWORD / TO_EMAIL env vars")
        return

    msg = EmailMessage()
    msg["Subject"] = "New contact message from Lunara AI"
    msg["From"] = gmail_user
    msg["To"] = to_email

    body = (
        f"New contact message from Lunara AI\n\n"
        f"Name: {data.name}\n"
        f"Email: {data.email}\n\n"
        f"Message:\n{data.message}\n"
    )
    msg.set_content(body)

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
        server.login(gmail_user, gmail_app_password)
        server.send_message(msg)

    print("✅ Contact email sent successfully")


# ==============================
# FASTAPI APP
# ==============================

app = FastAPI(
    title="Lunara AI Backend",
    description="Backend API for contact form and automation",
    version="1.0.0",
)

# CORS – allow your frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # you can lock this down later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    print("✅ Database ready")


@app.post("/api/contact")
def submit_contact(
    payload: ContactRequest,
    db: Session = Depends(get_db),
):
    """
    Receives contact form data, saves to DB, sends you an email.
    """

    # Save to database
    contact = ContactMessage(
        name=payload.name,
        email=payload.email,
        message=payload.message,
    )

    db.add(contact)
    db.commit()
    db.refresh(contact)

    # Try to send email (don’t crash the app if email fails)
    try:
        send_contact_email(payload)
    except Exception as e:
        print(f"⚠️ Error sending email: {e}")

    return {
        "success": True,
        "id": contact.id,
        "message": "Contact message saved and email sent (if email is configured).",
    }


# Root endpoint (optional, just to see it's working)
@app.get("/")
def read_root():
    return {"status": "ok", "message": "Lunara AI backend is running"}


# For running on Replit / locally
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)