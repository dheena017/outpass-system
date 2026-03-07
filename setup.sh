#!/bin/bash

# Outpass System Development Setup Script
# This script sets up the complete development environment

set -e

echo "🚀 Setting up Outpass System..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}Python 3 is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Python 3 found${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js found${NC}"
    
    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}PostgreSQL is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ PostgreSQL found${NC}"
}

# Setup Backend
setup_backend() {
    echo -e "\n${BLUE}Setting up Backend...${NC}"
    cd backend
    
    # Create virtual environment
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        echo -e "${GREEN}✓ Virtual environment created${NC}"
    fi
    
    # Install dependencies using venv python
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    
    # Copy .env if not exists
    if [ ! -f ".env" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ .env created (update with your credentials)${NC}"
    fi
    
    cd ..
}

# Setup Frontend
setup_frontend() {
    echo -e "\n${BLUE}Setting up Frontend...${NC}"
    cd frontend
    
    # Install dependencies
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    
    # Create .env if not exists
    if [ ! -f ".env" ]; then
        echo "VITE_API_URL=http://localhost:8001" > .env
        echo -e "${GREEN}✓ .env created${NC}"
    fi
    
    cd ..
}

# Setup Database
setup_database() {
    echo -e "\n${BLUE}Setting up Database...${NC}"

    # Read DB settings from backend/.env (fallback to sensible local defaults)
    local db_user="postgres"
    local db_password=""
    local db_host="localhost"
    local db_port="5432"
    local db_name="outpass_db"

    if [ -f "backend/.env" ]; then
        local db_url
        db_url=$(grep -E '^DATABASE_URL=' backend/.env | cut -d '=' -f2- | tr -d '\r')

        if [[ "$db_url" =~ ^postgresql:// ]]; then
            read -r db_user db_password db_host db_port db_name <<< "$(python3 - "$db_url" <<'PY'
import sys
from urllib.parse import urlparse

u = urlparse(sys.argv[1])
user = u.username or "postgres"
password = u.password or ""
host = u.hostname or "localhost"
port = str(u.port or 5432)
dbname = (u.path or "/outpass_db").lstrip("/") or "outpass_db"
print(user, password, host, port, dbname)
PY
)"
        fi
    fi

    # Check if target database exists using TCP auth (avoids peer-auth socket failures)
    local db_exists
    db_exists=$(PGPASSWORD="$db_password" psql \
        -h "$db_host" \
        -p "$db_port" \
        -U "$db_user" \
        -d postgres \
        -tAc "SELECT 1 FROM pg_database WHERE datname='${db_name}';" 2>/dev/null || true)

    if [ "$db_exists" = "1" ]; then
        echo -e "${GREEN}✓ Database '${db_name}' already exists${NC}"
    else
        if PGPASSWORD="$db_password" psql \
            -h "$db_host" \
            -p "$db_port" \
            -U "$db_user" \
            -d postgres \
            -c "CREATE DATABASE ${db_name};"; then
            echo -e "${GREEN}✓ Database '${db_name}' created${NC}"
        else
            echo -e "${RED}Could not connect to PostgreSQL with current backend/.env credentials.${NC}"
            echo -e "${RED}Please verify DATABASE_URL in backend/.env and rerun setup.sh.${NC}"
            exit 1
        fi
    fi
}

# Main execution
main() {
    check_prerequisites
    setup_backend
    setup_frontend
    setup_database
    
    echo -e "\n${GREEN}✅ Setup complete!${NC}"
    echo -e "\n${BLUE}Next steps:${NC}"
    echo "1. Update backend/.env with your database credentials"
    echo "2. Run 'cd backend && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8001 --reload' to start backend"
    echo "3. Run 'cd frontend && npm run dev -- --host 0.0.0.0 --port 5174' to start frontend"
    echo -e "\nBackend will be at ${BLUE}http://localhost:8001${NC}"
    echo -e "Frontend will be at ${BLUE}http://localhost:5174${NC}"
}

main
