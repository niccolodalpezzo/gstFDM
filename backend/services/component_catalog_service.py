from __future__ import annotations


PART_TYPES = [
    {"value": "Nozzle", "label": "Nozzle", "compatibility_mode": "printer_models"},
    {"value": "Piatto", "label": "Piatto", "compatibility_mode": "bed_area"},
    {"value": "Modulo multicolore", "label": "Modulo multicolore", "compatibility_mode": "multicolor"},
    {"value": "Hotend", "label": "Hotend", "compatibility_mode": "printer_models"},
    {"value": "Estrusore", "label": "Estrusore", "compatibility_mode": "printer_models"},
    {"value": "Altro", "label": "Altro", "compatibility_mode": "none"},
]


PRINTER_CATALOG = [
    {
        "brand": "Bambu Lab",
        "series": [
            {"name": "A1 Series", "models": ["A1", "A1 mini"]},
            {"name": "P1 Series", "models": ["P1P", "P1S"]},
            {"name": "X1 Series", "models": ["X1-Carbon", "X1E"]},
        ],
    },
    {
        "brand": "Anycubic",
        "series": [
            {"name": "Kobra 3 Series", "models": ["Kobra 3", "Kobra 3 Combo", "Kobra 3 Max"]},
            {"name": "Kobra S1 Series", "models": ["Kobra S1", "Kobra S1 Combo", "Kobra S1 Max"]},
            {"name": "Other", "models": ["Kobra X"]},
        ],
    },
    {
        "brand": "Prusa Research",
        "series": [
            {"name": "MK Series", "models": ["MK3S+", "MK4", "MK4S"]},
            {"name": "XL Series", "models": ["Prusa XL"]},
            {"name": "MINI Series", "models": ["MINI+"]},
        ],
    },
    {
        "brand": "Creality",
        "series": [
            {"name": "K Series", "models": ["K1", "K1C", "K1 Max"]},
            {"name": "Ender Series", "models": ["Ender-3 V3", "Ender-3 S1", "Ender-5 S1"]},
        ],
    },
    {
        "brand": "Klipper / Open",
        "series": [
            {"name": "Voron", "models": ["Voron 2.4", "Voron Trident"]},
            {"name": "Open Frame", "models": ["RatRig V-Core", "Annex K3"]},
            {"name": "Generic", "models": ["Custom Klipper Printer"]},
        ],
    },
]


MULTICOLOR_PROFILES = [
    {
        "brand": "Bambu Lab",
        "family": "AMS",
        "compatible_models": ["P1P", "P1S", "X1-Carbon", "X1E"],
        "official": True,
        "notes": "Ecosistema AMS per serie P1 e X1.",
    },
    {
        "brand": "Bambu Lab",
        "family": "AMS Lite",
        "compatible_models": ["A1", "A1 mini"],
        "official": True,
        "notes": "Modulo ufficiale per A1 e A1 mini.",
    },
    {
        "brand": "Bambu Lab",
        "family": "AMS 2 Pro",
        "compatible_models": ["P1P", "P1S", "X1-Carbon", "X1E"],
        "official": True,
        "notes": "Variante evoluta dell'ecosistema AMS.",
    },
    {
        "brand": "Bambu Lab",
        "family": "BMCU",
        "compatible_models": ["A1", "A1 mini"],
        "official": False,
        "notes": "Soluzione community/non ufficiale per ecosistema Bambu.",
    },
    {
        "brand": "Anycubic",
        "family": "ACE Pro",
        "compatible_models": ["Kobra 3", "Kobra 3 Combo"],
        "official": True,
        "notes": "Modulo ufficiale Anycubic serie Kobra 3.",
    },
    {
        "brand": "Anycubic",
        "family": "ACE 2 Pro",
        "compatible_models": ["Kobra 3", "Kobra 3 Max", "Kobra S1", "Kobra S1 Combo", "Kobra S1 Max", "Kobra X"],
        "official": True,
        "notes": "Seconda generazione ACE per linee Kobra recenti.",
    },
    {
        "brand": "Prusa Research",
        "family": "MMU3",
        "compatible_models": ["MK3S+", "MK4", "MK4S", "Prusa XL"],
        "official": True,
        "notes": "Sistema multicolore ufficiale Prusa.",
    },
    {
        "brand": "Klipper / Open",
        "family": "Co Print KCM Set",
        "compatible_models": ["Custom Klipper Printer", "Voron 2.4", "Voron Trident", "RatRig V-Core"],
        "official": False,
        "notes": "Sistema open/aftermarket per stampanti Klipper.",
    },
    {
        "brand": "Klipper / Open",
        "family": "BoxTurtle",
        "compatible_models": ["Voron 2.4", "Voron Trident", "RatRig V-Core", "Custom Klipper Printer"],
        "official": False,
        "notes": "Soluzione community per sistemi basati su Klipper.",
    },
    {
        "brand": "Klipper / Open",
        "family": "TradRack",
        "compatible_models": ["Voron 2.4", "Voron Trident", "Custom Klipper Printer"],
        "official": False,
        "notes": "Rack multicolore community per configurazioni Klipper.",
    },
]


def get_component_catalog_metadata() -> dict:
    return {
        "part_types": PART_TYPES,
        "printer_catalog": PRINTER_CATALOG,
        "multicolor_profiles": MULTICOLOR_PROFILES,
        "bed_tolerance_pct": 5.0,
    }
