from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Enum, Text, 
    ForeignKey, DECIMAL, Numeric, SMALLINT, ARRAY, CheckConstraint, func, JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum as PyEnum
from database import Base


class UserRole(str, PyEnum):
    STUDENT = "student"
    WARDEN = "warden"
    ADMIN = "admin"


class OutpassStatus(str, PyEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ACTIVE = "active"
    CLOSED = "closed"
    EXPIRED = "expired"


class Gender(str, PyEnum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    student = relationship("Student", back_populates="user", uselist=False)
    warden = relationship("Warden", back_populates="user", uselist=False)


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    student_id = Column(String(50), unique=True, nullable=False, index=True)
    phone_number = Column(String(15))
    gender = Column(Enum(Gender))
    dorm_name = Column(String(100))
    room_number = Column(String(20))
    parent_contact = Column(String(15))
    enrollment_year = Column(Integer)
    is_suspended = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="student")
    outpass_requests = relationship("OutpassRequest", back_populates="student")
    location_logs = relationship("LocationLog", back_populates="student")


class Warden(Base):
    __tablename__ = "wardens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    warden_id = Column(String(50), unique=True, nullable=False, index=True)
    phone_number = Column(String(15))
    department = Column(String(100))
    assigned_dorms = Column(JSON, nullable=True)  # Using JSON for cross-DB compatibility (SQLite/Postgres)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="warden")
    approved_requests = relationship("OutpassRequest", back_populates="approved_by_warden", foreign_keys="OutpassRequest.approved_by")


class OutpassRequest(Base):
    __tablename__ = "outpass_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    destination = Column(String(255), nullable=False)
    destination_latitude = Column(Numeric(10, 8), nullable=True)  # Optional destination coordinates
    destination_longitude = Column(Numeric(11, 8), nullable=True)
    reason = Column(Text, nullable=False)
    departure_time = Column(DateTime(timezone=True), nullable=False)
    expected_return_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(OutpassStatus), default=OutpassStatus.PENDING, nullable=False, index=True)
    approved_by = Column(Integer, ForeignKey("wardens.id"), nullable=True)
    approval_time = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    warden_notes = Column(Text, nullable=True)  # Private note by warden on approve/reject
    actual_return_time = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Constraints
    __table_args__ = (
        CheckConstraint('expected_return_time > departure_time', name='check_return_after_departure'),
    )

    # Relationships
    student = relationship("Student", back_populates="outpass_requests")
    approved_by_warden = relationship("Warden", back_populates="approved_requests", foreign_keys=[approved_by])
    location_logs = relationship("LocationLog", back_populates="outpass_request")


class LocationLog(Base):
    __tablename__ = "location_logs"

    id = Column(Integer, primary_key=True, index=True)
    outpass_request_id = Column(Integer, ForeignKey("outpass_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    latitude = Column(DECIMAL(10, 8), nullable=False)
    longitude = Column(DECIMAL(11, 8), nullable=False)
    accuracy = Column(DECIMAL(6, 2), nullable=True)  # GPS accuracy in meters
    battery_level = Column(SMALLINT, nullable=True)  # 0-100 percentage
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    outpass_request = relationship("OutpassRequest", back_populates="location_logs")
    student = relationship("Student", back_populates="location_logs")
