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

## 📊 Database Schema

The system uses a relational database structure designed for strict role separation and efficient tracking.

### 👤 Users Table
Core table for authentication and basic profile info.
| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary Key |
| `email` | String | Unique email address |
| `username` | String | Unique login handle |
| `first_name` | String | User's first name |
| `last_name` | String | User's last name |
| `password_hash` | String | Bcrypt hashed password |
| `role` | Enum | `student` or `warden` |
| `is_active` | Boolean | Account status (default: true) |

### 🎓 Students Table
Extends the `User` table with academic details.
| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary Key |
| `user_id` | Integer | Foreign Key to `users.id` |
| `student_id` | String | University Roll Number (Unique) |
| `phone_number` | String | Contact number |
| `gender` | Enum | `Male`, `Female`, `Other` |
| `dorm_name` | String | Hostel/Block Name |
| `room_number` | String | Room ID |
| `enrollment_year` | Integer | Year of joining |

### 🛡️ Wardens Table
Extends the `User` table with administrative details.
| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary Key |
| `user_id` | Integer | Foreign Key to `users.id` |
| `warden_id` | String | Employee ID (Unique) |
| `department` | String | Department/Faculty |
| `assigned_dorms` | JSON | List of dorms managed by this warden |

### 📝 Outpass Requests Table
Central table for managing leave workflows.
| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary Key |
| `student_id` | Integer | Foreign Key to `students.id` |
| `destination` | String | Intended location |
| `reason` | Text | Purpose of leave |
| `departure_time` | DateTime | Planned exit time |
| `expected_return` | DateTime | Planned return time |
| `actual_return` | DateTime | Timestamp when closed |
| `status` | Enum | `pending`, `approved`, `rejected`, `active`, `closed`, `expired` |
| `approved_by` | Integer | Foreign Key to `wardens.id` |
| `warden_notes` | Text | Optional comments by warden |

### 📍 Location Logs Table
Stores real-time tracking data for active outpasses.
| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary Key |
| `outpass_id` | Integer | FK to `outpass_requests.id` |
| `latitude` | Float | GPS Latitude |
| `longitude` | Float | GPS Longitude |
| `accuracy` | Float | GPS Accuracy (meters) |
| `battery_level` | Integer | Device battery % |
| `timestamp` | DateTime | Log creation time |

## 🚀 API Endpoints

### 🔐 Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/login` | Authenticate user & get JWT token | No |
| `POST` | `/auth/register-student` | Register a new student account | No |
| `POST` | `/auth/register-warden` | Register a new warden account | No |
| `POST` | `/auth/request-password-reset`| Request password reset email | No |
| `POST` | `/auth/reset-password` | Reset password using token | No |
| `GET` | `/auth/me` | Get current user profile | Yes |

### 📝 Outpass Management
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `POST` | `/outpasses/request` | Submit new outpass request | Student |
| `GET` | `/outpasses/my-requests` | Get all requests for logged-in student | Student |
| `GET` | `/outpasses/{id}` | Get specific request details | Both |
| `GET` | `/outpasses/pending` | Get all pending requests | Warden |
| `GET` | `/outpasses/active` | Get all currently active outpasses | Warden |
| `PATCH` | `/outpasses/{id}/status` | Approve/Reject/Close request | Warden/Student |
| `POST` | `/outpasses/bulk-action` | Bulk approve/reject requests | Warden |
| `GET` | `/outpasses/validate/{id}` | Public QR code validation | Public |
| `GET` | `/outpasses/export-csv` | Download records as CSV | Warden |

### 📍 Location Tracking
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `POST` | `/location/{request_id}` | Submit GPS location log | Student |
| `GET` | `/location/{request_id}/logs` | Get location history for a trip | Both |
| `GET` | `/location/active-students` | Get latest location of ALL active students | Warden |
| `GET` | `/location/student/{id}` | Get latest location of specific student | Warden |
| `WS` | `/ws/location/{token}` | WebSocket for live map updates | Warden |

### 🔔 Notifications & Analytics
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/analytics/warden` | Get dashboard statistics | Warden |
| `POST` | `/notifications/subscribe` | Subscribe to push notifications | Both |

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
