from __future__ import annotations

import json
import os
import shutil
import tempfile
import unittest

import database as db
import utils
from backend.services import quote_service, settings_service


class PreventiviEngineTestCase(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="preventivi-test-")

        self.old_db_path = db.DB_PATH
        self.old_settings_file = utils.SETTINGS_FILE
        self.old_required_dirs = utils.REQUIRED_DIRS

        db.DB_PATH = os.path.join(self.temp_dir, "printfarm.sqlite")
        utils.SETTINGS_FILE = os.path.join(self.temp_dir, "settings.json")
        utils.REQUIRED_DIRS = [self.temp_dir]

        utils.setup_environment()
        settings_service.update_settings({
            **utils.DEFAULT_SETTINGS,
            "costo_kwh": 0.5,
            "costo_orario_post_prod": 30.0,
            "costo_orario_manodopera": 30.0,
            "margine_lordo_default_perc": 20.0,
            "costo_orario_progettazione_default": 35.0,
            "criterio_rischio_default": "standard",
            "ore_lavorative_mensili_farm": 100.0,
            "maintenance_interval_hours": 250.0,
        })

    def tearDown(self):
        db.DB_PATH = self.old_db_path
        utils.SETTINGS_FILE = self.old_settings_file
        utils.REQUIRED_DIRS = self.old_required_dirs
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _create_printer(self, *, consumo_w=200.0, risk_perc_base=0.0, ammortamento_quota_oraria=2.0, ammortamento_residuo_euro=100.0):
        printer_id = db.add_stampante(
            marca="Bambu Lab",
            modello="P1S",
            diametro_ugello=0.4,
            consumo_w=consumo_w,
            costo_acquisto=1000.0,
            ammortamento_orario=ammortamento_quota_oraria,
            asset_name="P1S A",
        )
        with db.get_db_connection() as conn:
            conn.execute(
                """UPDATE stampanti SET
                   ammortamento_attivo = 1,
                   ammortamento_quota_oraria = ?,
                   ammortamento_residuo_euro = ?,
                   ammortamento_recuperato_euro = 0,
                   risk_perc_base = ?
                   WHERE id = ?""",
                (ammortamento_quota_oraria, ammortamento_residuo_euro, risk_perc_base, printer_id),
            )
            conn.commit()
        return printer_id

    def _create_material(self, *, marca="BrandX", materiale="PLA", colore="Nero", costo_kg=20.0):
        return db.add_magazzino(
            marca=marca,
            materiale=materiale,
            colore=colore,
            costo_kg=costo_kg,
            grammi_residui=1000.0,
        )

    def _create_cliente(self):
        return db.add_cliente("Mario", "Rossi", azienda="Rossi Lab")

    def _base_payload(self, printer_id: int, material_id: int) -> dict:
        return {
            "data": "2026-03-24",
            "cliente_id": self._create_cliente(),
            "cliente_nome_snapshot": "",
            "progetto_nome": "Supporto tecnico",
            "stampante_id": printer_id,
            "stato": "bozza",
            "quantita": 1,
            "ore_stampa": 1.0,
            "minuti_setup": 0.0,
            "costo_progettazione": 0.0,
            "costo_packing": 0.0,
            "costo_spedizione": 0.0,
            "costo_extra_manual": 0.0,
            "margine_lordo_perc": 20.0,
            "override_rischio_perc": None,
            "note": "",
            "materiali": [
                {
                    "magazzino_id": material_id,
                    "materiale_nome": "",
                    "marca": "",
                    "colore": "",
                    "costo_kg": None,
                    "grammi_modello": 100.0,
                    "scarto_perc": None,
                    "energy_multiplier": None,
                    "risk_perc": None,
                }
            ],
            "post_produzione": [],
            "componenti_extra": [],
        }

    def test_caso_1_preventivo_base_con_un_materiale(self):
        printer_id = self._create_printer(consumo_w=200.0, ammortamento_quota_oraria=0.0, ammortamento_residuo_euro=0.0)
        material_id = self._create_material(costo_kg=20.0)
        quote_service.upsert_material_config({
            "materiale": "PLA",
            "marca": "BrandX",
            "scarto_predefinito_perc": 10.0,
            "energy_multiplier": 1.2,
            "risk_perc_base": 0.0,
            "note": "",
        })

        payload = self._base_payload(printer_id, material_id)
        payload["ore_stampa"] = 5.0
        payload["minuti_setup"] = 30.0

        preview = quote_service.preview_quote(payload)
        self.assertAlmostEqual(preview["materiali"][0]["grammi_totali"], 110.0, places=3)
        self.assertAlmostEqual(preview["materiali"][0]["costo_totale"], 2.2, places=3)
        self.assertAlmostEqual(preview["breakdown"]["costo_energia"], 0.6, places=3)
        self.assertAlmostEqual(preview["breakdown"]["costo_setup"], 15.0, places=3)
        self.assertAlmostEqual(preview["breakdown"]["prezzo_finale"], 22.25, places=2)

    def test_caso_2_preventivo_con_materiali_multipli(self):
        printer_id = self._create_printer(consumo_w=200.0, ammortamento_quota_oraria=0.0, ammortamento_residuo_euro=0.0)
        material_one = self._create_material(marca="BrandA", materiale="PLA", costo_kg=20.0)
        material_two = self._create_material(marca="BrandB", materiale="PETG", costo_kg=40.0, colore="Blu")
        quote_service.upsert_material_config({
            "materiale": "PLA",
            "marca": "BrandA",
            "scarto_predefinito_perc": 0.0,
            "energy_multiplier": 1.0,
            "risk_perc_base": 0.0,
            "note": "",
        })
        quote_service.upsert_material_config({
            "materiale": "PETG",
            "marca": "BrandB",
            "scarto_predefinito_perc": 50.0,
            "energy_multiplier": 2.0,
            "risk_perc_base": 0.0,
            "note": "",
        })

        payload = self._base_payload(printer_id, material_one)
        payload["ore_stampa"] = 5.0
        payload["materiali"] = [
            {**payload["materiali"][0], "magazzino_id": material_one, "grammi_modello": 100.0},
            {**payload["materiali"][0], "magazzino_id": material_two, "grammi_modello": 100.0},
        ]

        preview = quote_service.preview_quote(payload)
        self.assertAlmostEqual(preview["materiali"][0]["costo_totale"], 2.0, places=3)
        self.assertAlmostEqual(preview["materiali"][1]["costo_totale"], 6.0, places=3)
        self.assertAlmostEqual(preview["breakdown"]["energy_multiplier_eff"], 1.6, places=3)
        self.assertAlmostEqual(preview["breakdown"]["costo_materiali"], 8.0, places=3)
        self.assertAlmostEqual(preview["breakdown"]["costo_energia"], 0.8, places=3)

    def test_caso_3_manutenzione_ordinaria(self):
        printer_id = self._create_printer(consumo_w=0.0, ammortamento_quota_oraria=0.0, ammortamento_residuo_euro=0.0)
        material_id = self._create_material()
        db.add_maintenance_template("Lubrificazione", "", 200.0, 0, True, 20.0)

        payload = self._base_payload(printer_id, material_id)
        payload["ore_stampa"] = 5.0

        preview = quote_service.preview_quote(payload)
        self.assertAlmostEqual(preview["breakdown"]["quota_manutenzione_ordinaria_oraria"], 0.1, places=4)
        self.assertAlmostEqual(preview["breakdown"]["costo_manutenzione_ordinaria"], 0.5, places=4)

    def test_caso_4_ammortamento_finito(self):
        printer_id = self._create_printer(consumo_w=0.0, ammortamento_quota_oraria=1.0, ammortamento_residuo_euro=1.0)
        material_id = self._create_material()

        payload = self._base_payload(printer_id, material_id)
        payload["ore_stampa"] = 3.0

        quote = quote_service.create_quote(payload)
        self.assertAlmostEqual(quote["breakdown"]["costo_ammortamento"], 1.0, places=4)

        quote_service.confirm_quote(quote["id"])
        with db.get_db_connection() as conn:
            row = conn.execute("SELECT ammortamento_residuo_euro, ammortamento_attivo FROM stampanti WHERE id = ?", (printer_id,)).fetchone()
        self.assertAlmostEqual(float(row["ammortamento_residuo_euro"] or 0.0), 0.0, places=4)
        self.assertEqual(int(row["ammortamento_attivo"]), 0)

    def test_caso_5_manutenzione_straordinaria_spalmata(self):
        printer_id = self._create_printer(consumo_w=0.0, ammortamento_quota_oraria=0.0, ammortamento_residuo_euro=0.0)
        material_id = self._create_material()
        db.add_extraordinary_maintenance(
            printer_id=printer_id,
            descrizione_problema="Hotend",
            giorni_fermo=1,
            componenti_json="[]",
            note="",
            costo_totale=20.0,
            ore_print_farm_da_spalmare=2.0,
            quota_oraria_ricambi=0.5,
            ore_residue_da_spalmare=2.0,
            spalmatura_attiva=True,
        )

        payload = self._base_payload(printer_id, material_id)
        payload["ore_stampa"] = 3.0

        quote = quote_service.create_quote(payload)
        self.assertAlmostEqual(quote["breakdown"]["costo_manutenzione_straordinaria"], 1.0, places=4)

        with db.get_db_connection() as conn:
            before = conn.execute("SELECT ore_residue_da_spalmare, spalmatura_attiva FROM extraordinary_maintenance WHERE printer_id = ?", (printer_id,)).fetchone()
        self.assertAlmostEqual(float(before["ore_residue_da_spalmare"]), 2.0, places=4)
        self.assertEqual(int(before["spalmatura_attiva"]), 1)

        quote_service.confirm_quote(quote["id"])
        with db.get_db_connection() as conn:
            after = conn.execute("SELECT ore_residue_da_spalmare, spalmatura_attiva FROM extraordinary_maintenance WHERE printer_id = ?", (printer_id,)).fetchone()
        self.assertAlmostEqual(float(after["ore_residue_da_spalmare"]), 0.0, places=4)
        self.assertEqual(int(after["spalmatura_attiva"]), 0)

    def test_caso_6_costi_straordinari_struttura_finiti(self):
        printer_id = self._create_printer(consumo_w=0.0, ammortamento_quota_oraria=0.0, ammortamento_residuo_euro=0.0)
        material_id = self._create_material()
        quote_service.create_structure_cost({
            "descrizione": "Banco tecnico",
            "importo_totale": 5.0,
            "importo_residuo": 1.0,
            "quota_oraria": 0.5,
            "ore_da_spalmare_totali": 10.0,
            "ore_da_spalmare_residue": 10.0,
            "attivo": True,
            "data": "2026-03-24",
            "note": "",
        })

        payload = self._base_payload(printer_id, material_id)
        payload["ore_stampa"] = 3.0

        quote = quote_service.create_quote(payload)
        self.assertAlmostEqual(quote["breakdown"]["costo_straordinari_struttura"], 1.0, places=4)

        quote_service.confirm_quote(quote["id"])
        items = quote_service.list_structure_costs()
        self.assertAlmostEqual(items[0]["importo_residuo"], 0.0, places=4)
        self.assertFalse(items[0]["attivo"])

    def test_caso_7_rischio_stampa(self):
        settings_service.update_settings({
            **settings_service.get_settings(),
            "costo_kwh": 10.0,
            "ore_lavorative_mensili_farm": 100.0,
            "costo_orario_manodopera": 30.0,
        })
        printer_id = self._create_printer(consumo_w=100.0, risk_perc_base=2.0, ammortamento_quota_oraria=0.0, ammortamento_residuo_euro=0.0)
        material_id = self._create_material(costo_kg=20.0)
        db.add_costo_fisso("Affitto", 400.0, True, "2026-03-01", "Monthly")
        quote_service.upsert_material_config({
            "materiale": "PLA",
            "marca": "BrandX",
            "scarto_predefinito_perc": 0.0,
            "energy_multiplier": 1.0,
            "risk_perc_base": 3.0,
            "note": "",
        })

        payload = self._base_payload(printer_id, material_id)
        payload["ore_stampa"] = 1.0
        payload["minuti_setup"] = 6.0
        payload["override_rischio_perc"] = 5.0

        preview = quote_service.preview_quote(payload)
        self.assertAlmostEqual(preview["breakdown"]["rischio_totale_perc"], 10.0, places=4)
        self.assertAlmostEqual(preview["breakdown"]["costo_materiali"], 2.0, places=4)
        self.assertAlmostEqual(preview["breakdown"]["costo_energia"], 1.0, places=4)
        self.assertAlmostEqual(preview["breakdown"]["costo_setup"], 3.0, places=4)
        self.assertAlmostEqual(preview["breakdown"]["costo_costi_fissi"], 4.0, places=4)
        self.assertAlmostEqual(preview["breakdown"]["costo_rischio"], 1.0, places=4)

    def test_caso_8_snapshot_storico(self):
        printer_id = self._create_printer(consumo_w=200.0, ammortamento_quota_oraria=0.0, ammortamento_residuo_euro=0.0)
        material_id = self._create_material(costo_kg=20.0)
        quote_service.upsert_material_config({
            "materiale": "PLA",
            "marca": "BrandX",
            "scarto_predefinito_perc": 10.0,
            "energy_multiplier": 1.0,
            "risk_perc_base": 0.0,
            "note": "",
        })

        payload = self._base_payload(printer_id, material_id)
        payload["ore_stampa"] = 2.0
        quote = quote_service.create_quote(payload)
        confirmed = quote_service.confirm_quote(quote["id"])
        snapshot_before = json.loads(confirmed["snapshot_json"])
        prezzo_before = confirmed["prezzo_finale"]

        settings_service.update_settings({
            **settings_service.get_settings(),
            "costo_kwh": 99.0,
        })
        with db.get_db_connection() as conn:
            conn.execute("UPDATE magazzino SET costo_kg = 999.0 WHERE id = ?", (material_id,))
            conn.commit()

        historical = quote_service.get_quote(quote["id"])
        snapshot_after = json.loads(historical["snapshot_json"])

        self.assertAlmostEqual(historical["prezzo_finale"], prezzo_before, places=4)
        self.assertEqual(snapshot_before["breakdown"], snapshot_after["breakdown"])


if __name__ == "__main__":
    unittest.main()
