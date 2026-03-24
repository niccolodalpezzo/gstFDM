from __future__ import annotations

from backend.repositories.base import dataframe_to_records
import database as db


def list_clients() -> list[dict]:
    return dataframe_to_records(db.get_clienti())


def create_client(data) -> dict:
    new_id = db.add_cliente(
        nome=data.nome,
        cognome=data.cognome,
        azienda=data.azienda,
        email=data.email,
        p_iva=data.p_iva,
        sdi=data.sdi,
        cf=data.cf,
        indirizzo=data.indirizzo,
        note=data.note,
    )
    return {**data.dict(), "id": new_id, "data_aggiunta": None}


def update_client(client_id: int, data) -> dict:
    db.update_cliente(
        client_id,
        nome=data.nome,
        cognome=data.cognome,
        azienda=data.azienda,
        email=data.email,
        p_iva=data.p_iva,
        sdi=data.sdi,
        cf=data.cf,
        indirizzo=data.indirizzo,
        note=data.note,
    )
    return {**data.dict(), "id": client_id, "data_aggiunta": None}


def delete_client(client_id: int) -> None:
    db.delete_cliente(client_id)


def list_suppliers() -> list[dict]:
    return dataframe_to_records(db.get_fornitori())


def create_supplier(data) -> dict:
    new_id = db.add_fornitore(
        ragione_sociale=data.ragione_sociale,
        p_iva=data.p_iva,
        sdi=data.sdi,
        referente=data.referente,
        email=data.email,
        telefono=data.telefono,
        indirizzo=data.indirizzo,
        citta=data.citta,
        cap=data.cap,
        provincia=data.provincia,
        categoria=data.categoria,
        note=data.note,
    )
    return {**data.dict(), "id": new_id, "data_aggiunta": None}


def update_supplier(supplier_id: int, data) -> dict:
    db.update_fornitore(
        supplier_id,
        ragione_sociale=data.ragione_sociale,
        p_iva=data.p_iva,
        sdi=data.sdi,
        referente=data.referente,
        email=data.email,
        telefono=data.telefono,
        indirizzo=data.indirizzo,
        citta=data.citta,
        cap=data.cap,
        provincia=data.provincia,
        categoria=data.categoria,
        note=data.note,
    )
    return {**data.dict(), "id": supplier_id, "data_aggiunta": None}


def delete_supplier(supplier_id: int) -> None:
    db.delete_fornitore(supplier_id)
