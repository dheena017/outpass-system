from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# Authentication Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    first_name: str
    last_name: str


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)


class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=8, max_length=128)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None


# Student Schemas
class StudentCreate(UserCreate):
    student_id: str
    phone_number: Optional[str] = None
    gender: Optional[str] = None
    dorm_name: Optional[str] = None
    room_number: Optional[str] = None
    parent_contact: Optional[str] = None
    enrollment_year: Optional[int] = None


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

    class Config:
        from_attributes = True


# Warden Schemas
class WardenCreate(UserCreate):
    warden_id: str
    phone_number: Optional[str] = None
    department: Optional[str] = None
    assigned_dorms: Optional[List[str]] = None


class WardenResponse(BaseModel):
    id: int
    user_id: int
    warden_id: str
    phone_number: Optional[str]
    department: Optional[str]
    assigned_dorms: Optional[List[str]]
    user: UserResponse

    class Config:
        from_attributes = True


# Outpass Schemas
class OutpassRequestCreate(BaseModel):
    destination: str = Field(..., min_length=1, max_length=255)
    destination_latitude: Optional[float] = None
    destination_longitude: Optional[float] = None
    reason: str = Field(..., min_length=10)
    departure_time: datetime
    expected_return_time: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "destination": "City Center Mall",
                "destination_latitude": 12.9716,
                "destination_longitude": 77.5946,
                "reason": "Shopping and meeting friends",
                "departure_time": "2024-01-15T14:00:00",
                "expected_return_time": "2024-01-15T18:00:00",
            }
        }


class OutpassRequestUpdate(BaseModel):
    status: str
    rejection_reason: Optional[str] = None
    warden_notes: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "status": "approved",
                "rejection_reason": None,
            }
        }


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

    class Config:
        from_attributes = True


# Location Tracking Schemas
class LocationLogCreate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy: Optional[float] = None
    battery_level: Optional[int] = Field(None, ge=0, le=100)

    class Config:
        json_schema_extra = {
            "example": {
                "latitude": 40.7128,
                "longitude": -74.0060,
                "accuracy": 10.5,
                "battery_level": 85,
            }
        }


class LocationLogResponse(BaseModel):
    id: int
    outpass_request_id: int
    student_id: int
    latitude: float
    longitude: float
    accuracy: Optional[float]
    battery_level: Optional[int]
    timestamp: datetime

    class Config:
        from_attributes = True


class ActiveStudentLocation(BaseModel):
    outpass_request_id: int
    student_db_id: int
    student_id: str
    student_name: str
    destination: str
    latitude: float
    longitude: float
    accuracy: Optional[float]
    battery_level: Optional[int]
    timestamp: datetime
    departure_time: datetime
    expected_return_time: datetime

    class Config:
        from_attributes = True
