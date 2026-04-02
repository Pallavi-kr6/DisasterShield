## DisasterShield AI — How to run (local)

### Services & ports
- **AI service (FastAPI, Python)**: `http://127.0.0.1:9000`
- **Backend (Node/Express)**: `http://127.0.0.1:8000`
- **Frontend (React/Vite)**: `http://127.0.0.1:5173`

---

### 1) Start the AI service (Python)
Open a terminal in `DisasterShield/`:

```bash
pip install -r ai_service/requirements.txt
uvicorn ai_service.main:app --reload --host 127.0.0.1 --port 9000
```

Quick check:
- Open `http://127.0.0.1:9000/health` → should return `{"ok": true}`

---

### 2) Start the Node backend (Express)
Open a **second** terminal in `DisasterShield/`:

```bash
cd server
npm install
set AI_URL=http://127.0.0.1:9000
npm run dev
```

Quick check:
- Open `http://127.0.0.1:8000/health` → should return `{"ok": true}`

---

### 3) Start the Frontend (React + Tailwind)
Open a **third** terminal in `DisasterShield/`:

```bash
cd web
npm install
set VITE_API_URL=http://127.0.0.1:8000
npm run dev
```

Open:
- `http://127.0.0.1:5173`

---

### Common issues
#### “AI service error”
- Make sure FastAPI is running on `:9000` and `AI_URL` is set to `http://127.0.0.1:9000` before starting Node.

#### Frontend calling the wrong backend
- Ensure `VITE_API_URL=http://127.0.0.1:8000`
- Restart `npm run dev` after changing env vars.

