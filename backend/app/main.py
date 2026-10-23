from fastapi import FastAPI

app = FastAPI(
    title="Learnova API",
    description="Backend API for the Learnova learning platform",
    version="0.1.0",
)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "learnova-api"}
