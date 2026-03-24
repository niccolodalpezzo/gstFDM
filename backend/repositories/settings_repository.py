from __future__ import annotations

import utils


def get_settings() -> dict:
    return utils.load_settings()


def save_settings(data: dict) -> dict:
    utils.save_settings(data)
    return data
