## DisasterShield AI Service (FastAPI)

### Run locally

From `DisasterShield/`:

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r ai_service/requirements.txt
uvicorn ai_service.main:app --reload --host 127.0.0.1 --port 9000
```

### Endpoint

- `POST /predict-all`
- `GET /health`

