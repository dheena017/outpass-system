from fastapi import FastAPI, HTTPException, Depends, status, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from datetime import timedelta
from config import settings
from database import engine, get_db
from models import Base, User, Student, Warden, UserRole, OutpassRequest, OutpassStatus
from auth import get_password_hash, create_access_token, verify_password, get_current_user
from schemas import (
    LoginRequest, LoginResponse, UserResponse,
    StudentCreate, StudentResponse,
    WardenCreate, WardenResponse,
    OutpassRequestCreate, OutpassRequestResponse, OutpassRequestUpdate,
    LocationLogCreate, LocationLogResponse, ActiveStudentLocation
)
from typing import List
from websocket_manager import manager

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

# Create tables
Base.metadata.create_all(bind=engine)

def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Too many attempts. Please wait a moment."},
    )

# Initialize FastAPI app
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    debug=settings.debug,
)

# Initialize Limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

if not settings.debug:
    app.add_middleware(HTTPSRedirectMiddleware)

# Add CORS middleware
origins = [
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.68.109:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
)




# ============= Health Check =============
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "api": settings.api_title}


# ============= Authentication Endpoints =============
@app.post("/auth/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(request: Request, credentials: LoginRequest, db: Session = Depends(get_db)):
    """Login endpoint for students and wardens."""
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


@app.post("/auth/register-student", response_model=StudentResponse)
@limiter.limit("3/minute")
async def register_student(request: Request, student_data: StudentCreate, db: Session = Depends(get_db)):
    """Register a new student."""
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


@app.post("/auth/register-warden", response_model=WardenResponse)
async def register_warden(
    warden_data: WardenCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register a new warden (admin only)."""
    # Check if current user is admin
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can register wardens",
        )
    
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


@app.get("/auth/me", response_model=UserResponse)
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


# ============= Outpass Endpoints =============
@app.post("/outpasses/request", response_model=OutpassRequestResponse)
async def create_outpass_request(
    request_data: OutpassRequestCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new outpass request (students only)."""
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


@app.get("/outpasses/my-requests", response_model=List[OutpassRequestResponse])
async def get_my_outpass_requests(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all outpass requests for the currently logged-in student."""
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


@app.get("/outpasses/pending", response_model=List[OutpassRequestResponse])
async def get_pending_requests(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all pending outpass requests (Wardens only)."""
    if current_user["role"] not in [UserRole.WARDEN, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view pending requests",
        )
        
    requests = db.query(OutpassRequest).filter(OutpassRequest.status == OutpassStatus.PENDING).order_by(OutpassRequest.created_at.asc()).all()
    return requests


@app.patch("/outpasses/{outpass_id}/status", response_model=OutpassRequestResponse)
async def update_outpass_status(
    outpass_id: int,
    update_data: OutpassRequestUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve or reject an outpass request (Wardens only)."""
    if current_user["role"] not in [UserRole.WARDEN, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update outpass status",
        )
        
    outpass = db.query(OutpassRequest).filter(OutpassRequest.id == outpass_id).first()
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass request not found")
        
    # Validate the target status
    try:
        new_status = OutpassStatus(update_data.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {update_data.status}")
        
    outpass.status = new_status
    
    if new_status == OutpassStatus.APPROVED:
        from datetime import datetime
        outpass.approval_time = datetime.utcnow()
        warden = db.query(Warden).filter(Warden.user_id == current_user["user_id"]).first()
        if warden:
            outpass.approved_by = warden.id
    elif new_status == OutpassStatus.REJECTED:
        outpass.rejection_reason = update_data.rejection_reason
    elif new_status == OutpassStatus.CLOSED:
        from datetime import datetime
        outpass.actual_return_time = datetime.utcnow()
        
    db.commit()
    db.refresh(outpass)
    return outpass


@app.get("/outpasses/{outpass_id}", response_model=OutpassRequestResponse)
async def get_outpass_request(
    outpass_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific outpass request."""
    outpass = db.query(OutpassRequest).filter(OutpassRequest.id == outpass_id).first()
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass request not found")
        
    # Check permissions (student can only see their own, wardens/admins can see any)
    if current_user["role"] == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == current_user["user_id"]).first()
        if not student or outpass.student_id != student.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this request")
            
    return outpass


@app.get("/outpasses/active", response_model=List[OutpassRequestResponse])
async def get_active_outpasses(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all currently active outpasses (Wardens only)."""
    if current_user["role"] not in [UserRole.WARDEN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    requests = db.query(OutpassRequest).filter(OutpassRequest.status == OutpassStatus.ACTIVE).order_by(OutpassRequest.departure_time.desc()).all()
    return requests


# ============= Location Tracking Endpoints =============
from models import LocationLog

@app.post("/location/{request_id}", response_model=LocationLogResponse)
async def submit_location(
    request_id: int,
    location_data: LocationLogCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a location log for an active outpass request."""
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
        "student_id": student.id,
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


@app.get("/location/{request_id}/logs", response_model=List[LocationLogResponse])
async def get_location_logs(
    request_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all location logs for a specific outpass request."""
    outpass = db.query(OutpassRequest).filter(OutpassRequest.id == request_id).first()
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass request not found")
        
    # Check permissions
    if current_user["role"] == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == current_user["user_id"]).first()
        if not student or outpass.student_id != student.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user["role"] not in [UserRole.WARDEN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    logs = db.query(LocationLog).filter(LocationLog.outpass_request_id == request_id).order_by(LocationLog.timestamp.desc()).all()
    return logs


@app.get("/location/student/{student_id}", response_model=LocationLogResponse)
async def get_latest_student_location(
    student_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the latest location log for a specific student."""
    if current_user["role"] not in [UserRole.WARDEN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    log = db.query(LocationLog).filter(LocationLog.student_id == student_id).order_by(LocationLog.timestamp.desc()).first()
    if not log:
        raise HTTPException(status_code=404, detail="No location logs found for this student")
        
    return log


@app.get("/location/active-students", response_model=List[ActiveStudentLocation])
async def get_active_students_locations(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the latest known location for all currently active outpasses."""
    if current_user["role"] not in [UserRole.WARDEN, UserRole.ADMIN]:
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
            student_id=student.id,
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


# ============= WebSocket Endpoints =============
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
        user_id = user_data.get("sub")
        role = user_data.get("role")
    except Exception as e:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Only wardens and admins can connect
    if role not in [UserRole.WARDEN, UserRole.ADMIN]:
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
                "student_id": student.id,
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
                import json
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
