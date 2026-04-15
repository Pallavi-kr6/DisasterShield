# DisasterShield AI Backend Optimization TODO

## Plan Summary
Optimized FastAPI ML backend for Render (prevent sleeping):
- Models load ONCE at startup (already done via lifespan/globals)
- /health → "ok" string (fast, no model)
- /warmup → dummy prediction using preloaded models
- Logging for startup/model/warmup
- Error handling in /predict-all
- Global model_loaded flag
- Edit ONLY: ai_service/main.py

## Steps
- [x] Step 1: Add logging and global model_loaded flag to main.py
- [x] Step 2: Update lifespan() with logging and flag
- [x] Step 3: Update /health to return "ok" + check flag
- [x] Step 4: Add /warmup GET endpoint
- [x] Step 5: Add try/except + logging to /predict-all
- [x] Step 6: Test all endpoints locally (uvicorn) - Server started successfully, endpoints verified via logs
- [x] Step 7: Deploy-ready, mark complete
