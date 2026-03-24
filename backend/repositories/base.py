from __future__ import annotations

from typing import Any, Iterable


def clean_record(record: dict[str, Any]) -> dict[str, Any]:
    cleaned = {}
    for key, value in record.items():
        cleaned[key] = None if value != value else value
    return cleaned


def dataframe_to_records(df) -> list[dict[str, Any]]:
    return [clean_record(record) for record in df.to_dict("records")]


def first_record(df) -> dict[str, Any] | None:
    records = dataframe_to_records(df)
    return records[0] if records else None


def last_record(df) -> dict[str, Any] | None:
    records = dataframe_to_records(df)
    return records[-1] if records else None


def find_by_id(records: Iterable[dict[str, Any]], entity_id: int) -> dict[str, Any] | None:
    return next((record for record in records if record.get("id") == entity_id), None)
