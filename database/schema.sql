-- Outpass System Database Schema
-- PostgreSQL

-- Create enum types
CREATE TYPE user_role AS ENUM ('student', 'warden', 'admin');
CREATE TYPE outpass_status AS ENUM ('pending', 'approved', 'rejected', 'active', 'closed', 'expired');
CREATE TYPE gender AS ENUM ('male', 'female', 'other');

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Students table
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    phone_number VARCHAR(15),
    gender gender,
    dorm_name VARCHAR(100),
    room_number VARCHAR(20),
    parent_contact VARCHAR(15),
    enrollment_year INTEGER,
    is_suspended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wardens table
CREATE TABLE wardens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    warden_id VARCHAR(50) UNIQUE NOT NULL,
    phone_number VARCHAR(15),
    department VARCHAR(100),
    assigned_dorms TEXT[], -- Array of dorm names this warden oversees
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Outpass requests table
CREATE TABLE outpass_requests (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    destination VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    departure_time TIMESTAMP NOT NULL,
    expected_return_time TIMESTAMP NOT NULL,
    status outpass_status DEFAULT 'pending',
    approved_by INTEGER REFERENCES wardens(id),
    approval_time TIMESTAMP,
    rejection_reason TEXT,
    actual_return_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (expected_return_time > departure_time)
);

-- Location tracking table
CREATE TABLE location_logs (
    id SERIAL PRIMARY KEY,
    outpass_request_id INTEGER NOT NULL REFERENCES outpass_requests(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(6, 2), -- GPS accuracy in meters
    battery_level SMALLINT, -- 0-100 percentage
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_wardens_user_id ON wardens(user_id);
CREATE INDEX idx_outpass_student_id ON outpass_requests(student_id);
CREATE INDEX idx_outpass_status ON outpass_requests(status);
CREATE INDEX idx_outpass_created_at ON outpass_requests(created_at);
CREATE INDEX idx_location_outpass_id ON location_logs(outpass_request_id);
CREATE INDEX idx_location_timestamp ON location_logs(timestamp);
CREATE INDEX idx_location_student_id ON location_logs(student_id);

-- Create function to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wardens_updated_at BEFORE UPDATE ON wardens
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outpass_requests_updated_at BEFORE UPDATE ON outpass_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
