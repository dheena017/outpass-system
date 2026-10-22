import os
import sys
import subprocess
from pathlib import Path

def main():
    root_dir = Path(__file__).resolve().parent
    backend_dir = root_dir / "backend"
    
    # Check for virtual environment python
    venv_win = root_dir / ".venv" / "Scripts" / "python.exe"
    venv_unix = root_dir / ".venv" / "bin" / "python"
    
    if venv_win.exists():
        py_exe = str(venv_win)
    elif venv_unix.exists():
        py_exe = str(venv_unix)
    else:
        py_exe = sys.executable
        
    cmd = [
        py_exe,
        "-m", "uvicorn", "main:app",
        "--host", "0.0.0.0",
        "--port", "8001",
        "--reload"
    ]
    
    print(f"Starting Backend with: {py_exe} in {backend_dir}...")
    sys.exit(subprocess.call(cmd, cwd=str(backend_dir)))

if __name__ == "__main__":
    main()
