import os
import sys
import signal
import subprocess
import threading
from pathlib import Path

# Force UTF-8 on Windows stdout/stderr
if sys.platform.startswith("win"):
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

def stream_output(pipe, prefix):
    try:
        for line in iter(pipe.readline, ''):
            if not line:
                break
            print(f"{prefix} {line}", end="", flush=True)
    except Exception:
        pass
    finally:
        pipe.close()

def main():
    root = Path(__file__).resolve().parent
    frontend_dir = root / "frontend"
    
    print("=" * 60)
    print(">>> Starting Outpass System (Backend + Frontend)")
    print("=" * 60)
    
    # Start Backend
    backend_proc = subprocess.Popen(
        [sys.executable, str(root / "run_backend.py")],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        encoding="utf-8",
        errors="replace"
    )
    
    # Start Frontend
    is_win = sys.platform.startswith("win")
    frontend_cmd = "npm run dev" if is_win else ["npm", "run", "dev"]
    frontend_proc = subprocess.Popen(
        frontend_cmd,
        cwd=str(frontend_dir),
        shell=is_win,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        encoding="utf-8",
        errors="replace"
    )
    
    # Live log streaming
    t1 = threading.Thread(target=stream_output, args=(backend_proc.stdout, "[BACKEND]"), daemon=True)
    t2 = threading.Thread(target=stream_output, args=(frontend_proc.stdout, "[FRONTEND]"), daemon=True)
    
    t1.start()
    t2.start()
    
    def cleanup(signum=None, frame=None):
        print("\n>>> Shutting down backend and frontend...")
        try:
            backend_proc.terminate()
            if is_win:
                subprocess.call(["taskkill", "/F", "/T", "/PID", str(frontend_proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                frontend_proc.terminate()
        except Exception:
            pass
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    
    while True:
        if backend_proc.poll() is not None:
            print(">>> Backend process finished.")
            cleanup()
            break
        if frontend_proc.poll() is not None:
            print(">>> Frontend process finished.")
            cleanup()
            break
        try:
            threading.Event().wait(1)
        except KeyboardInterrupt:
            cleanup()
            break

if __name__ == "__main__":
    main()
