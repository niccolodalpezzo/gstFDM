PROJECT_STATUSES = (
    "Progettazione",
    "Prototipazione",
    "Produzione",
    "Terminato",
)

_PROJECT_STATUS_ALIASES = {
    "Design": "Progettazione",
    "Prototyping": "Prototipazione",
    "Production": "Produzione",
    "Completed": "Terminato",
}


def normalize_project_status(value):
    """Restituisce lo stato progetto canonico in italiano."""
    if value is None:
        return PROJECT_STATUSES[0]

    normalized = str(value).strip()
    if not normalized:
        return PROJECT_STATUSES[0]

    return _PROJECT_STATUS_ALIASES.get(normalized, normalized)


def is_completed_project_status(value):
    return normalize_project_status(value) == "Terminato"
