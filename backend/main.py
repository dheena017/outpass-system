from fastapi import FastAPI, HTTPException, Depends, status, WebSocket, WebSocketDisconnect, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from datetime import timedelta, datetime
from contextlib import asynccontextmanager
import asyncio
import os
import json
from config import settings
from database import engine, get_db, SessionLocal
from models import Base, User, Student, Warden, UserRole, OutpassRequest, OutpassStatus, PushSubscription
from auth import get_password_hash, create_access_token, verify_password, get_current_user
from schemas import (
    LoginRequest, LoginResponse, UserResponse,
    StudentCreate, StudentResponse,
    WardenCreate, WardenResponse,
    OutpassRequestCreate, OutpassRequestResponse, OutpassRequestUpdate,
    LocationLogCreate, LocationLogResponse, ActiveStudentLocation,
    PasswordResetRequest, PasswordResetConfirm, PushSubscriptionCreate
)
from typing import List
from websocket_manager import manager

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

mail_conf = ConnectionConfig(
    MAIL_USERNAME=settings.mail_username,
    MAIL_PASSWORD=settings.mail_password,
    MAIL_FROM=settings.mail_from,
    MAIL_PORT=settings.mail_port,
    MAIL_SERVER=settings.mail_server,
    MAIL_FROM_NAME=settings.mail_from_name,
    MAIL_STARTTLS=settings.mail_starttls,
    MAIL_SSL_TLS=settings.mail_ssl_tls,
    USE_CREDENTIALS=bool(settings.mail_username),
    VALIDATE_CERTS=True
)

async def send_reset_email(email: str, token: str):
    """Sends the reset email using fastapi-mail, or mocks it via terminal if unconfigured."""
    if not settings.mail_username or not settings.mail_password:
        print(f"\n\n{'='*40}")
        print(f"✉️ MOCK EMAIL SENT (SMTP Not Configured)")
        print(f"To: {email}")
        print(f"Subject: Password Reset Token")
        print(f"Token: {token}")
        print(f"{'='*40}\n\n")
        return

    message = MessageSchema(
        subject="Outpass System: Password Reset",
        recipients=[email],
        body=f"You requested a password reset. Your reset token is:\n\n{token}\n\nPaste this token directly into the app to reset your password. It expires in 15 minutes.",
        subtype=MessageType.plain
    )
    fm = FastMail(mail_conf)
    try:
        await fm.send_message(message)
    except Exception as e:
        print(f"Failed to send email: {e}")

# Create tables
Base.metadata.create_all(bind=engine)


async def auto_expire_outpasses():
    """Background task: every 5 minutes, expire active outpasses past their return time."""
    while True:
        await asyncio.sleep(300)  # run every 5 minutes
        try:
            db = SessionLocal()
            now = datetime.utcnow()
            # Find all ACTIVE outpasses whose expected_return_time has passed
            expired = db.query(OutpassRequest).filter(
                OutpassRequest.status == OutpassStatus.ACTIVE,
                OutpassRequest.expected_return_time < now
            ).all()

            for outpass in expired:
                outpass.status = OutpassStatus.EXPIRED
                outpass.actual_return_time = now  # mark when we auto-closed it
                # Broadcast to wardens so the map removes them immediately
                student = db.query(Student).filter(Student.id == outpass.student_id).first()
                if student:
                    asyncio.create_task(
                        manager.broadcast_status_update(outpass.id, "expired", student.student_id)
                    )

            if expired:
                db.commit()
                print(f"[Scheduler] Auto-expired {len(expired)} outpass(es)")
            db.close()
        except Exception as e:
            print(f"[Scheduler] Error in auto_expire job: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background tasks on startup, cancel on shutdown."""
    expire_task = asyncio.create_task(auto_expire_outpasses())
    yield
    expire_task.cancel()
    try:
        await expire_task
    except asyncio.CancelledError:
        pass

def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Too many attempts. Please wait a moment."},
    )

tags_metadata = [
    {
        "name": "Status",
        "description": "✅ **System Health** & Monitoring endpoints.",
    },
    {
        "name": "Authentication",
        "description": "🔐 **Auth Operations**: Login, Registration, and Password Management.",
    },
    {
        "name": "Students",
        "description": "🎓 **Student Operations**: Profile management and history access.",
    },
    {
        "name": "Wardens",
        "description": "🛡️ **Warden Control**: Administrative actions for approvals and rosters.",
    },
    {
        "name": "Outpasses",
        "description": "📝 **Outpass Workflow**: Request submission, validation, and status updates.",
    },
    {
        "name": "Location Tracking",
        "description": "📍 **Geo-Tracking**: Real-time location logging and active student monitoring.",
    },
    {
        "name": "Analytics",
        "description": "📊 **Insights**: Usage statistics and reporting data.",
    },
    {
        "name": "Notifications",
        "description": "🔔 **Alerts**: Web Push Notification subscription management.",
    },
]

# Configure root path for Vercel deployment
root_path = "/api" if os.environ.get("VERCEL") else ""

# Initialize FastAPI app
api_description = """
# 🎓 Outpass Tracking System API

The **Outpass System API** provides a secure and efficient backend for managing student leave requests, approvals, and real-time location monitoring.

## 🚀 Key Features

| Feature | Description |
| :--- | :--- |
| **🔐 Role-Based Access** | Secure JWT authentication for **Students** and **Wardens**. |
| **📝 Outpass Workflow** | End-to-end management: Request → Approve → Active → Closed. |
| **📍 Live Tracking** | Real-time GPS location updates for active outpasses. |
| **🛡️ Geo-Fencing** | Alerts when students deviate from approved destinations (Planned). |
| **📊 Analytics** | Insightful dashboards for wardens to monitor trends. |

## 👥 User Roles & Permissions

* **Student** (`UserRole.STUDENT`)
    * Request new outpasses.
    * View personal history.
    * Log real-time location during active trips.
* **Warden** (`UserRole.WARDEN`)
    * Approve/Reject pending requests.
    * View active student map.
    * Access analytics and reports.

## ⚠️ Response Codes

| Code | Meaning |
| :--- | :--- |
| **200** | Success |
| **400** | Bad Request (Validation failure) |
| **401** | Unauthorized (Login required) |
| **403** | Forbidden (Role mismatch) |
| **404** | Resource Not Found |
| **422** | Unprocessable Entity (Schema mismatch) |

## 🛠️ Tech Stack
* **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
* **Database**: PostgreSQL + SQLAlchemy
* **Validation**: Pydantic V2
"""

app = FastAPI(
    title="Outpass System API",
    description=api_description,
    version=settings.api_version,
    summary="Student Safety & Outpass Management Platform",
    terms_of_service="http://example.com/terms/",
    contact={
        "name": "System Admin",
        "url": "http://localhost:5173/contact",
        "email": "admin@outpass.system",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    root_path=root_path,
    debug=settings.debug,
    lifespan=lifespan,
    openapi_tags=tags_metadata,
)

# Initialize Limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

if not settings.debug:
    app.add_middleware(HTTPSRedirectMiddleware)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= Root Redirect =============
@app.get("/", include_in_schema=False)
async def root():
    """Redirect root to API documentation."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")


# ============= Health Check =============
@app.get("/health", tags=["Status"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "api": settings.api_title}


# ============= Authentication Endpoints =============
@app.post("/auth/token", tags=["Authentication"], summary="Swagger Authorization", include_in_schema=False)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Endpoint for Swagger UI "Authorize" button.
    Accepts form data (username/password) instead of JSON.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.post(
    "/auth/login",
    response_model=LoginResponse,
    tags=["Authentication"],
    summary="User Login",
    responses={
        401: {"description": "Incorrect email or password"},
        403: {"description": "Account is disabled or inactive"}
    }
)
@limiter.limit("5/minute")
async def login(request: Request, credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    **All Users**: Authenticate to receive an access token.
    
    - **email**: Registered email address
    - **password**: Account password
    """
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
    }


@app.post("/auth/request-password-reset", tags=["Authentication"], summary="Forgot Password")
@limiter.limit("3/minute")
async def request_password_reset(request: Request, body: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Request a password reset token via email.
    
    - **email**: The email associated with your account
    """
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        return {"message": "If an account exists, a reset link was generated."}
    
    reset_token = create_access_token(
        data={"sub": str(user.id), "type": "password_reset"}, 
        expires_delta=timedelta(minutes=15)
    )
    
    # Send the email!
    await send_reset_email(user.email, reset_token)
    
    return {
        "message": "If an account exists, a reset link was generated.", 
        # Optional: Hide this in production, but useful if they don't have SMTP yet!
        "reset_token": reset_token if not settings.mail_username else None
    }


@app.post("/auth/reset-password", tags=["Authentication"], summary="Confirm Reset")
@limiter.limit("5/minute")
async def reset_password(request: Request, body: PasswordResetConfirm, db: Session = Depends(get_db)):
    """
    Reset your password using the token received in email.
    
    - **token**: The secure processing token
    - **new_password**: Your new password
    """
    try:
        from auth import decode_token
        payload = decode_token(body.token)
        if payload.get("type") != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid token type")
        
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=400, detail="Invalid token subject")
            
        user_id = int(sub)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = get_password_hash(body.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@app.post("/auth/register-student", response_model=StudentResponse, tags=["Authentication"], summary="Register New Student")
@limiter.limit("3/minute")
async def register_student(request: Request, student_data: StudentCreate, db: Session = Depends(get_db)):
    """
    Create a new student account.
    
    - **username**: Unique campus ID
    - **email**: Institutional email
    - **password**: Secure password
    """
    # Check if user already exists
    if db.query(User).filter(User.email == student_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    if db.query(User).filter(User.username == student_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )
    
    # Create user
    user = User(
        email=student_data.email,
        username=student_data.username,
        first_name=student_data.first_name,
        last_name=student_data.last_name,
        password_hash=get_password_hash(student_data.password),
        role=UserRole.STUDENT,
    )
    db.add(user)
    db.flush()  # Flush to get user.id without committing
    
    # Create student record
    student = Student(
        user_id=user.id,
        student_id=student_data.student_id,
        phone_number=student_data.phone_number,
        gender=student_data.gender,
        dorm_name=student_data.dorm_name,
        room_number=student_data.room_number,
        parent_contact=student_data.parent_contact,
        enrollment_year=student_data.enrollment_year,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    
    return StudentResponse.model_validate(student)


@app.post("/auth/register-warden", response_model=WardenResponse, tags=["Authentication"], summary="Register New Warden")
async def register_warden(
    warden_data: WardenCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new warden account.
    
    - **department**: Faculty department
    - **assigned_dorms**: List of blocks managed
    """
    # Check if user already exists
    if db.query(User).filter(User.email == warden_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create user
    user = User(
        email=warden_data.email,
        username=warden_data.username,
        first_name=warden_data.first_name,
        last_name=warden_data.last_name,
        password_hash=get_password_hash(warden_data.password),
        role=UserRole.WARDEN,
    )
    db.add(user)
    db.flush()
    
    # Create warden record
    warden = Warden(
        user_id=user.id,
        warden_id=warden_data.warden_id,
        phone_number=warden_data.phone_number,
        department=warden_data.department,
        assigned_dorms=warden_data.assigned_dorms,
    )
    db.add(warden)
    db.commit()
    db.refresh(warden)
    
    return WardenResponse.model_validate(warden)


@app.get("/auth/me", response_model=UserResponse, tags=["Authentication"])
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current authenticated user information."""
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return UserResponse.model_validate(user)


# ============= Analytics Endpoint =============
@app.get("/analytics/warden", tags=["Analytics"], summary="Warden Dashboard Stats")
async def get_warden_analytics(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aggregate analytics for the warden dashboard."""
    if current_user["role"] != UserRole.WARDEN:
        raise HTTPException(status_code=403, detail="Not authorized")

    all_requests = db.query(OutpassRequest).all()

    total = len(all_requests)
    approved = sum(1 for r in all_requests if r.status in [OutpassStatus.APPROVED, OutpassStatus.ACTIVE, OutpassStatus.CLOSED])
    rejected = sum(1 for r in all_requests if r.status == OutpassStatus.REJECTED)
    expired  = sum(1 for r in all_requests if r.status == OutpassStatus.EXPIRED)
    active   = sum(1 for r in all_requests if r.status == OutpassStatus.ACTIVE)
    pending  = sum(1 for r in all_requests if r.status == OutpassStatus.PENDING)

    approval_rate = round((approved / total * 100), 1) if total else 0

    # Average time outside (closed outpasses with actual_return_time)
    closed_with_times = [
        r for r in all_requests
        if r.status == OutpassStatus.CLOSED
        and r.actual_return_time and r.departure_time
    ]
    if closed_with_times:
        durations = [
            max(0, (r.actual_return_time - r.departure_time).total_seconds() / 3600)
            for r in closed_with_times
        ]
        avg_duration_hours = round(sum(durations) / len(durations), 1)
    else:
        avg_duration_hours = 0

    # Top 5 destinations
    dest_counts = {}
    for r in all_requests:
        dest = r.destination or "Unknown"
        dest_counts[dest] = dest_counts.get(dest, 0) + 1
    top_destinations = sorted(dest_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    # Requests per day — last 14 days
    from datetime import timezone
    now = datetime.utcnow()
    daily_counts = {}
    for i in range(13, -1, -1):
        day = (now - timedelta(days=i)).strftime("%b %d")
        daily_counts[day] = 0
    for r in all_requests:
        if r.created_at:
            day = r.created_at.strftime("%b %d")
            if day in daily_counts:
                daily_counts[day] += 1
    requests_by_day = [{"day": d, "count": c} for d, c in daily_counts.items()]

    # Peak departure hours (0–23)
    hour_counts = [0] * 24
    for r in all_requests:
        if r.departure_time:
            hour_counts[r.departure_time.hour] += 1

    return {
        "summary": {
            "total": total,
            "pending": pending,
            "active": active,
            "approved": approved,
            "rejected": rejected,
            "expired": expired,
            "approval_rate": approval_rate,
            "avg_duration_hours": avg_duration_hours,
        },
        "top_destinations": [{"name": d, "count": c} for d, c in top_destinations],
        "requests_by_day": requests_by_day,
        "peak_hours": [{"hour": h, "count": hour_counts[h]} for h in range(24)],
    }


# ============= CSV Export =============
from typing import Optional

@app.get("/outpasses/export-csv", tags=["Wardens"], summary="Generate Reports")
async def export_outpasses_csv(
    status_filter: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    **Warden Only**: Download spreadsheet of outpass records.
    
    Supports filtering by status and date range.
    """
    if current_user["role"] != UserRole.WARDEN:
        raise HTTPException(status_code=403, detail="Not authorized")

    import csv, io

    query = (
        db.query(OutpassRequest, Student, User)
        .join(Student, OutpassRequest.student_id == Student.id)
        .join(User, Student.user_id == User.id)
    )

    if status_filter:
        query = query.filter(OutpassRequest.status == status_filter)

    if start_date:
        try:
            # Assumes YYYY-MM-DD
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(OutpassRequest.created_at >= start_dt)
        except ValueError:
            pass

    if end_date:
        try:
            # Assumes YYYY-MM-DD, add 1 day to include the whole end_date
            end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(OutpassRequest.created_at < end_dt)
        except ValueError:
            pass

    outpasses = query.order_by(OutpassRequest.created_at.desc()).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "ID", "Student Name", "Student ID", "Destination",
        "Status", "Departure Time", "Expected Return", "Actual Return",
        "Reason", "Rejection Reason", "Warden Notes", "Created At"
    ])
    for outpass, student, user in outpasses:
        writer.writerow([
            outpass.id,
            f"{user.first_name} {user.last_name}",
            student.student_id,
            outpass.destination,
            outpass.status.value if outpass.status else "",
            str(outpass.departure_time or ""),
            str(outpass.expected_return_time or ""),
            str(outpass.actual_return_time or ""),
            outpass.reason or "",
            outpass.rejection_reason or "",
            outpass.warden_notes or "",
            str(outpass.created_at or ""),
        ])

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=outpass_report.csv"}
    )


# ============= Outpass Endpoints =============
@app.get("/outpasses/validate/{request_id}", tags=["Outpasses"], summary="Public QR Validator")
async def validate_outpass(request_id: int, db: Session = Depends(get_db)):
    """
    **Public**: Verify if an outpass is valid.
    
    Used by QR Code scanners on the mobile app.
    """
    outpass = db.query(OutpassRequest).filter(OutpassRequest.id == request_id).first()
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass not found")
        
    student = db.query(Student).filter(Student.id == outpass.student_id).first()
    user = db.query(User).filter(User.id == student.user_id).first()
    
    return {
        "id": outpass.id,
        "valid": outpass.status in [OutpassStatus.APPROVED, OutpassStatus.ACTIVE],
        "status": outpass.status,
        "student_name": f"{user.first_name} {user.last_name}",
        "student_id": student.student_id,
        "destination": outpass.destination,
        "departure_time": outpass.departure_time,
        "expected_return_time": outpass.expected_return_time
    }

@app.post(
    "/outpasses/request",
    response_model=OutpassRequestResponse,
    tags=["Outpasses"],
    summary="Submit Leave Request",
    responses={
        400: {"description": "Return time is before departure."},
        403: {"description": "Only students are authorized."},
        404: {"description": "Student profile not found."}
    }
)
async def create_outpass_request(
    request_data: OutpassRequestCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    **Student Only**: Submit a new outpass application.
    
    - **destination**: Where you are going
    - **reason**: Purpose of visit
    - **dates**: Departure and expected return
    """
    # Check if user is a student
    if current_user["role"] != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can request outpasses",
        )
    
    # Get the student record for the current user
    student = db.query(Student).filter(Student.user_id == current_user["user_id"]).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found",
        )
    
    if request_data.expected_return_time <= request_data.departure_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expected return time must be after departure time",
        )
    
    # Create the outpass request
    outpass = OutpassRequest(
        student_id=student.id,
        destination=request_data.destination,
        reason=request_data.reason,
        departure_time=request_data.departure_time,
        expected_return_time=request_data.expected_return_time,
        status=OutpassStatus.PENDING,
    )
    
    db.add(outpass)
    db.commit()
    db.refresh(outpass)
    
    return OutpassRequestResponse.model_validate(outpass)


@app.get("/outpasses/my-requests", response_model=List[OutpassRequestResponse], tags=["Students"], summary="Get My History")
async def get_my_outpass_requests(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """**Student Only**: Retrieve full history of your outpass requests."""
    if current_user["role"] != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can view their requests",
        )
        
    student = db.query(Student).filter(Student.user_id == current_user["user_id"]).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    requests = db.query(OutpassRequest).filter(OutpassRequest.student_id == student.id).order_by(OutpassRequest.created_at.desc()).all()
    return requests


@app.get("/outpasses/pending", response_model=List[OutpassRequestResponse], tags=["Wardens"], summary="Pending Approvals")
async def get_pending_requests(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """**Warden Only**: List all requests awaiting approval."""
    if current_user["role"] != UserRole.WARDEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view pending requests",
        )
        
    requests = db.query(OutpassRequest).filter(OutpassRequest.status == OutpassStatus.PENDING).order_by(OutpassRequest.created_at.asc()).all()
    return requests


@app.post("/outpasses/expire-overdue", tags=["Wardens"])
async def expire_overdue_outpasses(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Immediately expire all active outpasses past their expected return time. Warden only."""
    if current_user["role"] != UserRole.WARDEN:
        raise HTTPException(status_code=403, detail="Not authorized")

    now = datetime.utcnow()
    expired = db.query(OutpassRequest).filter(
        OutpassRequest.status == OutpassStatus.ACTIVE,
        OutpassRequest.expected_return_time < now
    ).all()

    count = len(expired)
    for outpass in expired:
        outpass.status = OutpassStatus.EXPIRED
        outpass.actual_return_time = now
        student = db.query(Student).filter(Student.id == outpass.student_id).first()
        if student:
            asyncio.create_task(
                manager.broadcast_status_update(outpass.id, "expired", student.student_id)
            )

    if count:
        db.commit()

    return {"message": f"Expired {count} overdue outpass(es)"}


@app.post("/outpasses/bulk-action", tags=["Wardens"], summary="Bulk Approve/Reject")
async def bulk_outpass_action(
    action_data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    **Warden Only**: Process multiple approvals/rejections at once.
    
    - **ids**: List of Outpass Request IDs
    - **action**: 'approved' or 'rejected'
    """
    if current_user["role"] != UserRole.WARDEN:
        raise HTTPException(status_code=403, detail="Not authorized")

    ids = action_data.get("ids", [])
    action = action_data.get("action")  # "approved" or "rejected"
    rejection_reason = action_data.get("rejection_reason", "Bulk rejected by warden")

    if not ids:
        raise HTTPException(status_code=400, detail="No request IDs provided")
    if action not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Action must be 'approved' or 'rejected'")

    warden = db.query(Warden).filter(Warden.user_id == current_user["user_id"]).first()
    now = datetime.utcnow()
    success_ids = []
    failed_ids = []

    for outpass_id in ids:
        outpass = db.query(OutpassRequest).filter(
            OutpassRequest.id == outpass_id,
            OutpassRequest.status == OutpassStatus.PENDING
        ).first()
        if not outpass:
            failed_ids.append(outpass_id)
            continue
        if action == "approved":
            outpass.status = OutpassStatus.APPROVED
            outpass.approval_time = now
            if warden:
                outpass.approved_by = warden.id
        else:
            outpass.status = OutpassStatus.REJECTED
            outpass.rejection_reason = rejection_reason
        # Save warden notes for both approve and reject
        notes = action_data.get("warden_notes", "")
        if notes:
            outpass.warden_notes = notes
        success_ids.append(outpass_id)

    db.commit()
    return {
        "message": f"Processed {len(success_ids)} request(s)",
        "success": success_ids,
        "failed": failed_ids,
    }


@app.patch(
    "/outpasses/{outpass_id}/status",
    response_model=OutpassRequestResponse,
    tags=["Outpasses"],
    summary="Update Status",
    responses={
        400: {"description": "Invalid status transition."},
        403: {"description": "Unauthorized for this action."},
        404: {"description": "Outpass request not found."}
    }
)
async def update_outpass_status(
    outpass_id: int,
    update_data: OutpassRequestUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    **Warden & Student**: Change the status of an outpass.
    
    - **Wardens**: Can Approve or Reject.
    - **Students**: Can change from Approved -> Active (Departure) and Active -> Closed (Return).
    """
    outpass = db.query(OutpassRequest).filter(OutpassRequest.id == outpass_id).first()
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass request not found")

    # Determine allowed transitions based on role
    allowed = False
    new_status_str = update_data.status
    if current_user["role"] == UserRole.WARDEN:
        allowed = True
    elif current_user["role"] == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == current_user["user_id"]).first()
        if student and outpass.student_id == student.id:
            # Student can only transition APPROVED -> ACTIVE and ACTIVE -> CLOSED
            if outpass.status == OutpassStatus.APPROVED and new_status_str == "active":
                allowed = True
            elif outpass.status == OutpassStatus.ACTIVE and new_status_str == "closed":
                allowed = True

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform this status update",
        )
        
    # Validate the target status
    try:
        new_status = OutpassStatus(update_data.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {update_data.status}")
        
    from datetime import datetime
    now_utc = datetime.utcnow()
    # Handle timezone awareness for comparison
    comparing_time = now_utc
    if outpass.departure_time and outpass.departure_time.tzinfo is not None:
        from datetime import timezone
        comparing_time = now_utc.replace(tzinfo=timezone.utc)
        
    if new_status == OutpassStatus.ACTIVE and current_user["role"] == UserRole.STUDENT:
        if outpass.departure_time and comparing_time < outpass.departure_time:
            raise HTTPException(status_code=400, detail="Cannot start outpass before departure time")
            
    if new_status == OutpassStatus.CLOSED and current_user["role"] == UserRole.STUDENT:
        if outpass.departure_time and comparing_time < outpass.departure_time:
            raise HTTPException(status_code=400, detail="Cannot return before departure time")

    outpass.status = new_status
    
    if new_status == OutpassStatus.APPROVED:
        from datetime import datetime
        outpass.approval_time = datetime.utcnow()
        warden = db.query(Warden).filter(Warden.user_id == current_user["user_id"]).first()
        if warden:
            outpass.approved_by = warden.id
        if update_data.warden_notes:
            outpass.warden_notes = update_data.warden_notes
    elif new_status == OutpassStatus.REJECTED:
        outpass.rejection_reason = update_data.rejection_reason
        if update_data.warden_notes:
            outpass.warden_notes = update_data.warden_notes
    elif new_status == OutpassStatus.CLOSED:
        outpass.actual_return_time = now_utc
        
    db.commit()
    db.refresh(outpass)
    
    # Broadcast status update if appropriate
    student = db.query(Student).filter(Student.id == outpass.student_id).first()
    if student:
        import asyncio
        asyncio.create_task(manager.broadcast_status_update(outpass.id, new_status_str, student.student_id))
        
        # Send Push Notification if action is terminal
        if new_status in [OutpassStatus.APPROVED, OutpassStatus.REJECTED]:
            message = f"Your outpass to {outpass.destination} was {new_status_str}."
            send_web_push(db, student.user_id, {
                "title": f"Outpass {new_status_str.title()}",
                "body": message,
                "url": "/student",
                "icon": "/pwa-192x192.png"
            })

    return outpass


@app.get("/outpasses/{outpass_id}", response_model=OutpassRequestResponse, tags=["Outpasses"])
async def get_outpass_request(
    outpass_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific outpass request."""
    outpass = db.query(OutpassRequest).filter(OutpassRequest.id == outpass_id).first()
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass request not found")
        
    # Check permissions (student can only see their own, wardens can see any)
    if current_user["role"] == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == current_user["user_id"]).first()
        if not student or outpass.student_id != student.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this request")
            
    return outpass


@app.get("/outpasses/active", response_model=List[OutpassRequestResponse], tags=["Wardens"], summary="Active Roster")
async def get_active_outpasses(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    **Warden Only**: Get all students currently outside campus (Active status).
    """
    if current_user["role"] != UserRole.WARDEN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    requests = db.query(OutpassRequest).filter(OutpassRequest.status == OutpassStatus.ACTIVE).order_by(OutpassRequest.departure_time.desc()).all()
    return requests


# ============= Location Tracking Endpoints =============
from models import LocationLog

@app.post(
    "/location/{request_id}",
    response_model=LocationLogResponse,
    tags=["Location Tracking"],
    summary="Log GPS Location",
    responses={
        200: {"description": "Location saved successfully."},
        400: {"description": "Outpass is not active (cannot log)."},
        403: {"description": "Only the assigned student can log details."},
        404: {"description": "Request ID not found."}
    }
)
async def submit_location(
    request_id: int,
    location_data: LocationLogCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    **Student Only**: Background geolocation ping.
    
    Used by the frontend to update location every 30-60 seconds.
    - **latitude/longitude**: Decimal GPS coordinates.
    - **accuracy**: GPS precision radius in meters.
    - **battery_level**: Critical for knowing if tracking might stop soon.
    """
    if current_user["role"] != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can submit locations")
        
    student = db.query(Student).filter(Student.user_id == current_user["user_id"]).first()
    outpass = db.query(OutpassRequest).filter(OutpassRequest.id == request_id).first()
    
    if not outpass or outpass.student_id != student.id:
        raise HTTPException(status_code=404, detail="Outpass request not found or unauthorized")
        
    if outpass.status != OutpassStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Can only log location for ACTIVE outpasses")
        
    log = LocationLog(
        outpass_request_id=outpass.id,
        student_id=student.id,
        latitude=location_data.latitude,
        longitude=location_data.longitude,
        accuracy=location_data.accuracy,
        battery_level=location_data.battery_level
    )
    
    db.add(log)
    db.commit()
    db.refresh(log)

    # Broadcast location update to all connected wardens
    user = db.query(User).filter(User.id == student.user_id).first()
    location_update = {
        "outpass_request_id": outpass.id,
        "student_db_id": student.id,
        "student_id": student.student_id,
        "student_name": f"{user.first_name} {user.last_name}",
        "destination": outpass.destination,
        "latitude": float(location_data.latitude),
        "longitude": float(location_data.longitude),
        "accuracy": float(location_data.accuracy) if location_data.accuracy else None,
        "battery_level": location_data.battery_level,
        "timestamp": log.timestamp.isoformat(),
        "departure_time": outpass.departure_time.isoformat(),
        "expected_return_time": outpass.expected_return_time.isoformat(),
    }
    
    import asyncio
    asyncio.create_task(manager.broadcast_location_update(location_update))

    return log


@app.get(
    "/location/{request_id}/logs",
    response_model=List[LocationLogResponse],
    tags=["Location Tracking"],
    summary="Trip History",
    responses={
        403: {"description": "Access restricted to owner/warden."},
        404: {"description": "Request not found."}
    }
)
async def get_location_logs(
    request_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    **Warden & Student**: Get GPS path for a specific trip.
    
    Used to render historical route on map with dotted paths.
    - Sorted by **newest first** (default).
    - Can contain thousands of points for long trips.
    """
    outpass = db.query(OutpassRequest).filter(OutpassRequest.id == request_id).first()
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass request not found")
        
    # Check permissions
    if current_user["role"] == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == current_user["user_id"]).first()
        if not student or outpass.student_id != student.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user["role"] != UserRole.WARDEN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    logs = db.query(LocationLog).filter(LocationLog.outpass_request_id == request_id).order_by(LocationLog.timestamp.desc()).all()
    return logs


@app.get("/location/student/{student_id}", response_model=LocationLogResponse, tags=["Location Tracking"])
async def get_latest_student_location(
    student_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the latest location log for a specific student."""
    if current_user["role"] != UserRole.WARDEN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    log = db.query(LocationLog).filter(LocationLog.student_id == student_id).order_by(LocationLog.timestamp.desc()).first()
    if not log:
        raise HTTPException(status_code=404, detail="No location logs found for this student")
        
    return log


@app.get(
    "/location/active-students",
    response_model=List[ActiveStudentLocation],
    tags=["Location Tracking"],
    summary="Live Map Data",
    responses={
        403: {"description": "Access restricted to Wardens only."},
        200: {"description": "Array of student locations with metadata."}
    }
)
async def get_active_students_locations(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    **Warden Only**: Get latest coordinates for all active students.
    
    Used to plot markers on the live dashboard.
    - Includes **student_name**, **student_id**, and trip **destination**.
    - Returns **empty list** if no students are currently out.
    """
    if current_user["role"] != UserRole.WARDEN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Get all active outpasses with student and user data joined to avoid N+1
    active_outpasses = db.query(OutpassRequest).filter(
        OutpassRequest.status == OutpassStatus.ACTIVE
    ).options(
        joinedload(OutpassRequest.student).joinedload(Student.user)
    ).all()

    if not active_outpasses:
        return []

    # Get the latest location log for all active outpasses in one bulk query
    outpass_ids = [o.id for o in active_outpasses]

    # Subquery to get the latest log ID for each outpass request
    latest_log_ids_subquery = db.query(
        func.max(LocationLog.id).label('max_id')
    ).filter(
        LocationLog.outpass_request_id.in_(outpass_ids)
    ).group_by(
        LocationLog.outpass_request_id
    ).subquery()

    latest_logs = db.query(LocationLog).filter(
        LocationLog.id.in_(latest_log_ids_subquery)
    ).all()

    # Map outpass_id to its latest log
    logs_map = {log.outpass_request_id: log for log in latest_logs}
    
    result = []
    for outpass in active_outpasses:
        latest_log = logs_map.get(outpass.id)
        student = outpass.student
        user = student.user
        
        student_name = f"{user.first_name} {user.last_name}"
        
        result.append(ActiveStudentLocation(
            outpass_request_id=outpass.id,
            student_db_id=student.id,
            student_id=student.student_id,
            student_name=student_name,
            destination=outpass.destination,
            latitude=latest_log.latitude if latest_log else 0.0,
            longitude=latest_log.longitude if latest_log else 0.0,
            accuracy=latest_log.accuracy if latest_log else None,
            battery_level=latest_log.battery_level if latest_log else None,
            timestamp=latest_log.timestamp if latest_log else outpass.departure_time,
            departure_time=outpass.departure_time,
            expected_return_time=outpass.expected_return_time
        ))
        
    return result



# ============= WebSocket =============
@app.websocket("/ws/location/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str, db: Session = Depends(get_db)):
    """
    WebSocket endpoint for real-time location tracking.
    Wardens connect here to receive live location updates from active students.
    """
    # Verify the token and extract user info
    try:
        from auth import decode_token
        user_data = decode_token(token)
        user_id_str = user_data.get("sub")
        role = user_data.get("role")
        
        if not user_id_str:
             raise ValueError("Missing user ID")
             
        user_id = int(user_id_str)
    except Exception as e:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Only wardens can connect
    if role != UserRole.WARDEN:
        await websocket.close(code=4003, reason="Unauthorized")
        return

    # Connect the warden
    await manager.connect(websocket, user_id)

    try:
        # Send initial active students list with student and user data joined
        active_outpasses = db.query(OutpassRequest).filter(
            OutpassRequest.status == OutpassStatus.ACTIVE
        ).options(
            joinedload(OutpassRequest.student).joinedload(Student.user)
        ).all()

        if active_outpasses:
            outpass_ids = [o.id for o in active_outpasses]
            # Bulk fetch latest location logs
            latest_log_ids_subquery = db.query(
                func.max(LocationLog.id).label('max_id')
            ).filter(
                LocationLog.outpass_request_id.in_(outpass_ids)
            ).group_by(
                LocationLog.outpass_request_id
            ).subquery()

            latest_logs = db.query(LocationLog).filter(
                LocationLog.id.in_(latest_log_ids_subquery)
            ).all()
            logs_map = {log.outpass_request_id: log for log in latest_logs}
        else:
            logs_map = {}

        active_students_list = []
        for outpass in active_outpasses:
            latest_log = logs_map.get(outpass.id)
            student = outpass.student
            user = student.user

            active_students_list.append({
                "outpass_request_id": outpass.id,
                "student_db_id": student.id,
                "student_id": student.student_id,
                "student_name": f"{user.first_name} {user.last_name}",
                "destination": outpass.destination,
                "latitude": float(latest_log.latitude) if latest_log else 0.0,
                "longitude": float(latest_log.longitude) if latest_log else 0.0,
                "accuracy": float(latest_log.accuracy) if latest_log and latest_log.accuracy else None,
                "battery_level": latest_log.battery_level if latest_log else None,
                "timestamp": latest_log.timestamp.isoformat() if latest_log else outpass.departure_time.isoformat(),
                "departure_time": outpass.departure_time.isoformat(),
                "expected_return_time": outpass.expected_return_time.isoformat(),
            })

        await manager.send_active_students(user_id, active_students_list)

        # Keep connection alive and listen for any client messages
        while True:
            data = await websocket.receive_text()
            # Handle any incoming messages (e.g., ping/pong for keepalive)
            try:
                parsed = json.loads(data)
                if isinstance(parsed, dict) and parsed.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                if data == "ping":
                    await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        print(f"WebSocket error for user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        manager.disconnect(user_id)


# ============= Web Push Notifications =============
from pywebpush import webpush, WebPushException

def send_web_push(db: Session, user_id: int, payload: dict):
    """Utility to send web push notifications to a user's registered devices."""
    if not settings.vapid_private_key or not settings.vapid_public_key:
        print("Web Push disabled. VAPID keys not configured in backend.")
        return

    subscriptions = db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth": sub.auth
                    }
                },
                data=json.dumps(payload),
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": settings.vapid_claims_email or "mailto:system@outpass.com"}
            )
        except WebPushException as ex:
            if ex.response and ex.response.status_code in [404, 410]:
                # Subscription expired or is invalid
                db.delete(sub)
                db.commit()
            else:
                print(f"Web Push Error: {repr(ex)}")

@app.get("/notifications/public-key", tags=["Notifications"])
async def get_public_key():
    """Return the VAPID Public Key to the frontend so it can subscribe."""
    return {"public_key": settings.vapid_public_key}

@app.post("/notifications/subscribe", tags=["Notifications"])
async def subscribe_push_notifications(
    sub_data: PushSubscriptionCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save the web push subscription generated by the frontend."""
    # Check if already exists
    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == sub_data.endpoint).first()
    if existing:
        if existing.user_id != current_user["user_id"]:
            existing.user_id = current_user["user_id"]
            db.commit()
        return {"message": "Subscription updated."}

    sub = PushSubscription(
        user_id=current_user["user_id"],
        endpoint=sub_data.endpoint,
        p256dh=sub_data.keys.p256dh,
        auth=sub_data.keys.auth
    )
    db.add(sub)
    db.commit()
    return {"message": "Subscribed successfully."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
