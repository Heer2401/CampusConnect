from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="CampusConnect AI Service")

class SuggestionRequest(BaseModel):
    image_url: str

@app.get("/")
def read_root():
    return {"status": "AI Service is running"}

@app.post("/api/suggestions")
def get_suggestions(request: SuggestionRequest):
    # Mock AI response (FR-3.5)
    return {
        "category": "Textbooks",
        "condition": "Good",
        "estimated_price": 25.0,
        "title": "Generated Title from Image"
    }
