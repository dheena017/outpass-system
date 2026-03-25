# Quick Start Guide - Outpass System

Get up and running in 5 minutes!

## 1️⃣ Clone / Navigate to Project

```bash
cd /path/to/outpass-system
```

## 2️⃣ Run Setup Script (Linux/Mac)

```bash
chmod +x setup.sh
./setup.sh
```

This automatically:
- ✓ Creates Python virtual environment
- ✓ Installs Python dependencies
- ✓ Installs Node.js dependencies
- ✓ Creates PostgreSQL database
- ✓ Sets up environment files

## 3️⃣ Configure Database

Edit `backend/.env` with your PostgreSQL credentials:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/outpass_db
SECRET_KEY=your-secret-key-change-this
DEBUG=True
```

## 4️⃣ Start Backend


### Linux/Mac
```bash
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Windows (PowerShell)
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Windows (Command Prompt)
```cmd
cd backend
.\venv\Scripts\activate.bat
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

✓ Backend running at: http://localhost:8001
✓ API docs at: http://localhost:8001/docs

## 5️⃣ Start Frontend (New Terminal)

```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5174
```

✓ Frontend running at: http://localhost:5174

## 6️⃣ Test the System

### Login (Demo)
- **Email**: demo@student.com , warden@example.com
- **Password**: password123 , password123

Register a new account at: http://localhost:5174/register

## 📚 API Documentation

FastAPI auto-generates docs at: **http://localhost:8001/docs**

Try endpoints directly from the interactive docs!

## 🎯 What's Ready to Use

### Student Features
- ✓ Register account
- ✓ Login/Logout
- ✓ Submit outpass request form (Geofencing enabled)
- ✓ View request status & analytics
- ✓ Real-time QR pass generation & Scanning
- ✓ 🛰️ GPS Live Tracking

### Warden Features
- ✓ Register account
- ✓ Login/Logout
- [ ] Mobile app (React Native)

## 🛠️ Common Commands

```bash
# Backend
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8001 --reload  # Run server
pytest                            # Run tests (when added)

# Frontend
cd frontend
npm run dev -- --host 0.0.0.0 --port 5174  # Development server
npm run build                      # Build for production
npm run lint                       # Check code style

# Database
psql -U postgres -d outpass_db   # Connect to DB
psql -U postgres -f database/schema.sql  # Import schema
```

## 🐛 Troubleshooting

### Port 8001 Already in Use?
```bash
lsof -i :8001
kill -9 <PID>
```

### Port 5174 Already in Use?
```bash
lsof -i :5174
kill -9 <PID>
```

### Database Connection Error?
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1;"

# Check credentials in .env
cat backend/.env
```

### Dependencies Not Installing?
```bash
# Backend
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall

# Frontend
rm -rf node_modules package-lock.json
npm install
```

## 📖 Documentation

- [README.md](README.md) - Full project overview
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development roadmap
- [API Documentation](http://localhost:8001/docs) - Interactive API docs

## 🚀 Ready for Next Phase?

Once backend is running, the next step is implementing the remaining API endpoints:

1. **Outpass Management** - Create, approve, reject requests
2. **Location Tracking** - Submit and retrieve GPS coordinates
3. **Real-time Updates** - WebSocket for live map updates

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed roadmap.

---

**Questions?** Check the README.md or DEVELOPMENT.md for detailed documentation.
