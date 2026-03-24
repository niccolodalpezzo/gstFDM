from typing import List

from fastapi import APIRouter, HTTPException

from backend.repositories import finance
from backend.schemas import SpesaUnaTantumCreate, SpesaUnaTantumOut

router = APIRouter()


@router.get("", response_model=List[SpesaUnaTantumOut])
def list_spese():
    return finance.list_one_off_expenses()


@router.post("", response_model=SpesaUnaTantumOut, status_code=201)
def create_spesa(body: SpesaUnaTantumCreate):
    expense = finance.create_one_off_expense(body)
    if expense is None:
        raise HTTPException(status_code=500, detail="Creazione spesa fallita")
    return expense


@router.delete("/{spesa_id}", status_code=204)
def delete_spesa(spesa_id: int):
    finance.delete_one_off_expense(spesa_id)
