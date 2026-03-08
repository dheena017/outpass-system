from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


# ==========================================
# 🔐 Authentication Schemas
# ==========================================

class UserBase(BaseModel):
    email: EmailStr = Field(..., description="User's email address", examples=["student@example.com"])
    username: str = Field(..., min_length=3, max_length=50, description="Unique username", examples=["john_doe"])
    first_name: str = Field(..., min_length=1, max_length=50, description="First name", examples=["John"])
    last_name: str = Field(..., min_length=1, max_length=50, description="Last name", examples=["Doe"])


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128, description="Strong password", examples=["Password123!"])


class UserResponse(UserBase):
    id: int = Field(..., description="Unique user ID")
    role: str = Field(..., description="User role (student or warden)")
    is_active: bool = Field(..., description="Account status")
    created_at: datetime = Field(..., description="Account creation timestamp")

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: str = Field(..., description="Registered email")
    password: str = Field(..., description="Account password")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "student@example.com",
                "password": "password123"
            }
        }
    )


class LoginResponse(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field("bearer", description="Token type")
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None


class PasswordResetRequest(BaseModel):
    email: EmailStr = Field(..., description="Email to send reset link to")


class PasswordResetConfirm(BaseModel):
    token: str = Field(..., description="Reset token received via email")
    new_password: str = Field(..., min_length=8, max_length=128, description="New strong password")


# ==========================================
# 🎓 Student Schemas
# ==========================================

class StudentCreate(UserCreate):
    student_id: str = Field(..., description="University Student ID / Roll Number", examples=["RA2111003010001"])
    phone_number: Optional[str] = Field(None, description="Contact number", examples=["+919876543210"])
    gender: Optional[str] = Field(None, description="Gender (Male/Female/Other)", examples=["Male"])
    dorm_name: Optional[str] = Field(None, description="Dormitory/Hostel Name", examples=["Green Block"])
    room_number: Optional[str] = Field(None, description="Room Number", examples=["101-A"])
    parent_contact: Optional[str] = Field(None, description="Parent/Guardian Contact", examples=["+919876543211"])
    enrollment_year: Optional[int] = Field(None, description="Year of enrollment", examples=[2023])


class StudentResponse(BaseModel):
    id: int
    user_id: int
    student_id: str
    phone_number: Optional[str]
    gender: Optional[str]
    dorm_name: Optional[str]
    room_number: Optional[str]
    parent_contact: Optional[str]
    enrollment_year: Optional[int]
    is_suspended: bool
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 🛡️ Warden Schemas
# ==========================================

class WardenCreate(UserCreate):
    warden_id: str = Field(..., description="Warden Employee ID", examples=["W101"])
    phone_number: Optional[str] = Field(None, description="Warden's contact number")
    department: Optional[str] = Field(None, description="Department handling", examples=["Student Affairs"])
    assigned_dorms: Optional[List[str]] = Field(None, description="List of dorms managed by this warden")


class WardenResponse(BaseModel):
    id: int
    user_id: int
    warden_id: str
    phone_number: Optional[str]
    department: Optional[str]
    assigned_dorms: Optional[List[str]]
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 📝 Outpass Schemas
# ==========================================

class OutpassRequestCreate(BaseModel):
    destination: str = Field(..., min_length=3, max_length=255, description="Intended destination")
    destination_latitude: Optional[float] = Field(None, description="Latitude of destination")
    destination_longitude: Optional[float] = Field(None, description="Longitude of destination")
    reason: str = Field(..., min_length=5, description="Reason for outpass")
    departure_time: datetime = Field(..., description="Planned departure time")
    expected_return_time: datetime = Field(..., description="Expected return time")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "destination": "City Center Mall",
                "destination_latitude": 12.9716,
                "destination_longitude": 77.5946,
                "reason": "Shopping and meeting friends",
                "departure_time": "2024-03-10T14:00:00",
                "expected_return_time": "2024-03-10T18:00:00",
            }
        }
    )


class OutpassRequestUpdate(BaseModel):
    status: str = Field(..., description="New status (approved, rejected, active, closed)")
    rejection_reason: Optional[str] = Field(None, description="Reason for rejection (if rejected)")
    warden_notes: Optional[str] = Field(None, description="Internal notes by warden")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "approved",
                "warden_notes": "Call parents before leaving.",
                "rejection_reason": None
            }
        }
    )


class OutpassRequestResponse(BaseModel):
    id: int
    student_id: int
    destination: str
    destination_latitude: Optional[float] = None
    destination_longitude: Optional[float] = None
    reason: str
    departure_time: datetime
    expected_return_time: datetime
    status: str
    approval_time: Optional[datetime]
    rejection_reason: Optional[str]
    warden_notes: Optional[str] = None
    actual_return_time: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 📍 Location Tracking Schemas
# ==========================================

class LocationLogCreate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Current Latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Current Longitude")
    accuracy: Optional[float] = Field(None, description="GPS Accuracy in meters")
    battery_level: Optional[int] = Field(None, ge=0, le=100, description="Device battery percentage")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "latitude": 12.9716,
                "longitude": 77.5946,
                "accuracy": 15.2,
                "battery_level": 85,
            }
        }
    )


class LocationLogResponse(BaseModel):
    id: int
    outpass_request_id: int
    student_id: int
    latitude: float
    longitude: float
    accuracy: Optional[float]
    battery_level: Optional[int]
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class ActiveStudentLocation(BaseModel):
    outpass_request_id: int = Field(..., description="ID of the active outpass")
    student_db_id: int = Field(..., description="Database ID of the student")
    student_id: str = Field(..., description="Student Roll Number/ID")
    student_name: str = Field(..., description="Full Name of the student")
    destination: str = Field(..., description="Target destination")
    latitude: float
    longitude: float
    accuracy: Optional[float]
    battery_level: Optional[int]
    timestamp: datetime
    departure_time: datetime
    expected_return_time: datetime

class PushSubscriptionKeys(BaseModel):
    p256dh: str = Field(..., description="User agent public key")
    auth: str = Field(..., description="Authentication secret")

class PushSubscriptionCreate(BaseModel):
    endpoint: str = Field(..., description="Push service endpoint URL")
    keys: PushSubscriptionKeys

    model_config = ConfigDict(from_attributes=True)
