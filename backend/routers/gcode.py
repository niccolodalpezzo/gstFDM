import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.schemas import GcodeParseResult
import gcode_parser

router = APIRouter()


@router.post("/parse", response_model=GcodeParseResult)
async def parse_gcode(file: UploadFile = File(...)):
    if not file.filename.endswith(".gcode"):
        raise HTTPException(status_code=400, detail="Solo file .gcode accettati")

    # Salva temporaneamente in gcode_vault/
    safe_name = f"{uuid.uuid4().hex}_{file.filename}"
    filepath = os.path.join("gcode_vault", safe_name)

    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    result = gcode_parser.parse_gcode_file(filepath)

    return GcodeParseResult(
        time_min=result.get("time_min", 0.0),
        grams=result.get("grams", 0.0)
    )
