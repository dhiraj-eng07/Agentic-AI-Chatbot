from fastapi import FastAPI
from agents import agent_manager

app = FastAPI(title="AI Service", version="1.0.0")

@app.get("/")
async def root():
    return {"message": "AI Service is running"}

@app.post("/process")
async def process_message(message: str):
    response = await agent_manager.process_message(message)
    return {"response": response}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)