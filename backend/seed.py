
from database import SessionLocal
from models import User, Student, Warden, UserRole, Gender
from auth import get_password_hash
from datetime import datetime

def seed():
    db = SessionLocal()
    try:
        # Check if demo user exists
        demo_email = "demo@student.com"
        existing_user = db.query(User).filter(User.email == demo_email).first()
        if existing_user:
            print("Demo user already exists.")
        else:
            # Create demo user
            user = User(
                email=demo_email,
                username="demostudent",
                first_name="Demo",
                last_name="Student",
                password_hash=get_password_hash("password123"),
                role=UserRole.STUDENT,
            )
        db.add(user)
        db.flush()

        # Create student profile
        student = Student(
            user_id=user.id,
            student_id="STU12345",
            phone_number="1234567890",
            gender=Gender.MALE,
            dorm_name="Block A",
            room_number="101",
            enrollment_year=2023
        )
        db.add(student)
        db.commit()
        print("Demo user created successfully!")
    except Exception as e:
        print(f"Error seeding student: {e}")
        db.rollback()

    try:
        # Check if warden user exists
        warden_email = "warden@college.edu"
        existing_warden = db.query(User).filter(User.email == warden_email).first()
        if existing_warden:
            print("Warden user already exists.")
            return

        # Create warden user
        warden_user = User(
            email=warden_email,
            username="demowarden",
            first_name="Chief",
            last_name="Warden",
            password_hash=get_password_hash("warden12345"),
            role=UserRole.WARDEN,
        )
        db.add(warden_user)
        db.flush()

        # Create warden profile
        warden = Warden(
            user_id=warden_user.id,
            warden_id="W101",
            phone_number="9876543210",
            department="Computer Science",
            assigned_dorms=["Block A", "Block B"]
        )
        db.add(warden)
        db.commit()
        print("Warden user created successfully!")
    except Exception as e:
        print(f"Error seeding warden: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
