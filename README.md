# Outpass System - Student Outpass Tracking Platform

A comprehensive system for managing student outpass requests with real-time location tracking, warden approval workflows, and live map visualization.

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL
- **Maps:** Leaflet.js (open source) / Google Maps (optional)
- **Real-time Updates:** WebSocket (future enhancement)

## Project Structure

```
outpass-system/
├── backend/               # FastAPI backend
│   ├── main.py           # Entry point
│   ├── models.py         # SQLAlchemy ORM models
│   ├── schemas.py        # Pydantic schemas
│   ├── database.py       # Database configuration
│   ├── config.py         # Settings management
│   ├── auth.py           # Authentication utilities
│   ├── requirements.txt  # Python dependencies
│   └── .env.example      # Environment template
├── frontend/             # React + Vite frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   │   ├── student/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── RequestForm.jsx
│   │   │   │   └── RequestStatus.jsx
│   │   │   └── warden/
│   │   │       ├── Dashboard.jsx
│   │   │       ├── ApprovalQueue.jsx
│   │   │       ├── ActiveRoster.jsx
│   │   │       └── Map.jsx
│   │   ├── components/  # Reusable components
│   │   ├── api/        # API calls
│   │   ├── store/      # Zustand state management
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
└── database/            # Database schema & migrations
    └── schema.sql
```

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 16+
- PostgreSQL 12+

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

5. Create the database:
```bash
psql -U postgres -c "CREATE DATABASE outpass_db;"
```

6. Run the migrations (schema is auto-created on startup):
```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

7. Start the server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Backend will be available at `http://localhost:8001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev -- --host 0.0.0.0 --port 5174
```

Frontend will be available at `http://localhost:5174`

## Database Schema

### Users Table
- `id`: Primary key
- `email`: Unique email address
- `username`: Unique username
- `password_hash`: Hashed password
- `first_name`, `last_name`: User's full name
- `role`: 'student', 'warden', or 'admin'
- `is_active`: Account status

### Students Table
- Extends User with student-specific fields
- `student_id`: Unique student identifier
- `phone_number`, `gender`: Personal info
- `dorm_name`, `room_number`: Hostel details

### Wardens Table
- Extends User with warden-specific fields
- `warden_id`: Unique warden identifier
- `assigned_dorms`: Array of dorm names they oversee

### Outpass Requests Table
- `id`: Primary key
- `student_id`: Foreign key to Student
- `destination`, `reason`: Request details
- `departure_time`, `expected_return_time`: Schedule
- `status`: pending, approved, rejected, active, closed, expired
- `approved_by`: Foreign key to Warden (who approved)

### Location Logs Table
- `id`: Primary key
- `outpass_request_id`: Links to the outpass request
- `latitude`, `longitude`: GPS coordinates
- `accuracy`: GPS accuracy in meters
- `battery_level`: Device battery percentage

## API Endpoints

### Authentication
- `POST /auth/login` - Login
- `POST /auth/register-student` - Register student
- `POST /auth/register-warden` - Register warden (admin only)
- `GET /auth/me` - Get current user

### Outpass Management
- `POST /outpass/requests` - Submit new request
- `GET /outpass/students/{id}/requests` - Get student's requests
- `GET /outpass/requests/{id}` - Get specific request
- `GET /outpass/requests/status/pending` - Get pending requests
- `PUT /outpass/requests/{id}/approve` - Approve request
- `PUT /outpass/requests/{id}/reject` - Reject request
- `GET /outpass/active-students` - Get active students

### Location Tracking
- `POST /location/{request_id}` - Submit location
- `GET /location/{request_id}/logs` - Get location history

## Development Phases

### Phase 1: Database Schema ✓
- PostgreSQL schema created
- Relationships established
- Indexes added for performance

### Phase 2: Backend API ⏳
- Core FastAPI setup ✓
- Authentication endpoints ✓
- Database models ✓
- Next: Outpass management endpoints
- Next: Location tracking endpoints

### Phase 3: Frontend UI ⏳
- Project setup ✓
- Login & Registration ✓
- Student Dashboard stub ✓
- Warden Dashboard stub ✓
- Next: Complete API integration
- Next: Real-time updates

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/outpass_db
SECRET_KEY=your-super-secret-key
DEBUG=True
CORS_ORIGINS=http://localhost:5174,http://localhost:3000
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8001
```

## Running the Full Stack

Terminal 1 (Backend):
```bash
cd backend
.\venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5174
```

Both services will be running and configured to communicate via the API proxy.

## Next Steps

1. **Complete Outpass Endpoints** - Implement approval, rejection, and status update endpoints
2. **Location Tracking** - Add GPS location submission and retrieval endpoints
3. **WebSocket Integration** - Real-time updates for map and approval queue
4. **Mobile App** - React Native app for location tracking
5. **Testing** - Unit tests for both backend and frontend
6. **Deployment** - Docker containerization and cloud deployment

## Security Considerations

- ✓ Password hashing with bcrypt
- ✓ JWT token-based authentication
- ✓ CORS configured
- ✓ Input validation (via Pydantic schemas)
- ✓ Database query sanitization (handled by SQLAlchemy ORM)
- ✓ Rate limiting (implemented using slowapi)
- ✓ HTTPS enforcement (enabled in production mode via HTTPSRedirectMiddleware)
## Common Issues

### Port Already in Use
If port 8001 or 5174 is in use:
```bash
# Find what's using port 8001
lsof -i :8001
# Kill the process
kill -9 <PID>
```

### Database Connection Error
Ensure PostgreSQL is running and credentials in `.env` are correct:
```bash
psql -U postgres -d outpass_db -c "SELECT 1;"
```

### CORS Errors
Check that `CORS_ORIGINS` in backend `.env` matches your frontend URL.

## Contributing

1. Create a new branch for features
2. Follow PEP 8 (Python) and ESLint rules (JavaScript)
3. Write tests for new functionality
4. Submit pull requests with clear descriptions

## License

[Add your license here]
