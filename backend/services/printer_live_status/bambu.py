"""Provider Bambu Lab — probe via MQTTS locale (porta 8883).

Protocollo:
- MQTT over TLS, porta 8883
- username: bblp
- password: LAN access code (8 cifre dalla schermata LAN del display)
- topic subscribe: device/{serial}/report
- La stampante invia un messaggio di status entro pochi secondi dalla connessione.

Senza serial/access_code non è possibile autenticarsi → stato auth_required.
"""
from __future__ import annotations

import socket
import json
import ssl
import threading
import uuid
from datetime import datetime, timezone

_BAMBU_MQTTS_PORT = 8883
_TCP_TIMEOUT = 3      # timeout per la sola probe TCP
_MQTT_TIMEOUT = 8     # timeout totale per ricevere il messaggio MQTT
_INITIAL_REPORT_TIMEOUT = 3


def _tcp_reachable(host: str, port: int = _BAMBU_MQTTS_PORT, timeout: float = _TCP_TIMEOUT) -> bool:
    """Verifica se l'host risponde sulla porta MQTTS di Bambu."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except OSError:
        return False


def _parse_bambu_report(payload: dict) -> dict:
    """Normalizza il messaggio 'print' di Bambu nel modello live status."""
    print_section = payload.get("print", {})

    gcode_state = (print_section.get("gcode_state") or "").upper()
    STATE_MAP = {
        "IDLE": "idle",
        "PREPARE": "printing",
        "RUNNING": "printing",
        "PAUSE": "paused",
        "FINISH": "completed",
        "FAILED": "error",
        "SLICING": "printing",
    }
    live_print_state = STATE_MAP.get(gcode_state, "unknown")
    live_busy = live_print_state in {"printing", "paused"}

    mc_percent = print_section.get("mc_percent")
    live_progress = float(mc_percent) if mc_percent is not None else None

    mc_remaining = print_section.get("mc_remaining_time")
    remaining_sec = int(mc_remaining) * 60 if mc_remaining is not None else None

    subtask_name = print_section.get("subtask_name") or print_section.get("gcode_file") or None
    layer_num = print_section.get("layer_num")
    total_layers = print_section.get("total_layer_num")
    message = None
    if layer_num is not None and total_layers:
        message = f"Layer {layer_num}/{total_layers}"

    return {
        "detected_connection_type": "bambu",
        "live_connection_state": "online",
        "live_print_state": live_print_state,
        "live_busy": live_busy,
        "live_progress_percent": live_progress,
        "live_job_name": subtask_name,
        "live_remaining_time_sec": remaining_sec,
        "live_status_message": message,
        "live_last_seen_at": datetime.now(timezone.utc).isoformat(),
    }


def _mqtt_status(host: str, serial: str, access_code: str) -> dict:
    """
    Connette via MQTTS a Bambu, si sottoscrive al topic di report e attende
    il primo messaggio di stato.
    Ritorna lo stato normalizzato o lancia un'eccezione.
    """
    try:
        import paho.mqtt.client as mqtt  # type: ignore
    except ImportError:
        return {
            "detected_connection_type": "bambu",
            "live_connection_state": "online",
            "live_print_state": "unknown",
            "live_busy": False,
            "live_progress_percent": None,
            "live_job_name": None,
            "live_remaining_time_sec": None,
            "live_status_message": "paho-mqtt non installato: stato non disponibile",
            "live_last_seen_at": datetime.now(timezone.utc).isoformat(),
        }

    result: dict = {}
    received = threading.Event()
    report_topic = f"device/{serial}/report"
    request_topic = f"device/{serial}/request"

    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            client.subscribe("device/+/report")
        else:
            received.set()  # connessione fallita, interrompi attesa

    def on_message(client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode())
            if "print" in payload:
                result.update(_parse_bambu_report(payload))
                received.set()
        except Exception:
            return

    def on_disconnect(client, userdata, rc):
        received.set()

    client = mqtt.Client(client_id=f"printfarm_probe_{uuid.uuid4().hex[:8]}", protocol=mqtt.MQTTv311)
    client.username_pw_set("bblp", access_code)
    client.tls_set(cert_reqs=ssl.CERT_NONE)
    client.tls_insecure_set(True)
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    try:
        client.connect(host, _BAMBU_MQTTS_PORT, keepalive=10)
        client.loop_start()
        received.wait(timeout=_INITIAL_REPORT_TIMEOUT)
        if not result:
            client.subscribe(report_topic)
            client.publish(
                request_topic,
                json.dumps({
                    "pushing": {
                        "sequence_id": "0",
                        "command": "pushall",
                        "version": 1,
                        "push_target": 1,
                    }
                }),
                qos=0,
            )
            received.wait(timeout=max(1, _MQTT_TIMEOUT - _INITIAL_REPORT_TIMEOUT))
        client.loop_stop()
        client.disconnect()
    except Exception as exc:
        return {
            "detected_connection_type": "bambu",
            "live_connection_state": "error",
            "live_print_state": "unknown",
            "live_busy": False,
            "live_progress_percent": None,
            "live_job_name": None,
            "live_remaining_time_sec": None,
            "live_status_message": str(exc),
            "live_last_seen_at": datetime.now(timezone.utc).isoformat(),
        }

    if result:
        return result

    # Nessun messaggio ricevuto entro il timeout, ma la connessione era ok
    return {
        "detected_connection_type": "bambu",
        "live_connection_state": "online",
        "live_print_state": "unknown",
        "live_busy": False,
        "live_progress_percent": None,
        "live_job_name": None,
        "live_remaining_time_sec": None,
        "live_status_message": "Nessun messaggio ricevuto entro il timeout",
        "live_last_seen_at": datetime.now(timezone.utc).isoformat(),
    }


def probe(host: str, port: int | None, serial: str | None, access_code: str | None) -> dict:
    """
    Probe Bambu Lab:
    1. TCP reachability su porta 8883
    2. Se raggiungibile e mancano credenziali → auth_required
    3. Se raggiungibile e credenziali presenti → MQTT status
    """
    effective_port = port or _BAMBU_MQTTS_PORT

    if not _tcp_reachable(host, effective_port):
        return {
            "detected_connection_type": "bambu",
            "live_connection_state": "offline",
            "live_print_state": "unknown",
            "live_busy": False,
            "live_progress_percent": None,
            "live_job_name": None,
            "live_remaining_time_sec": None,
            "live_status_message": "Host non raggiungibile",
            "live_last_seen_at": None,
        }

    if not serial or not access_code:
        return {
            "detected_connection_type": "bambu",
            "live_connection_state": "auth_required",
            "live_print_state": "unknown",
            "live_busy": False,
            "live_progress_percent": None,
            "live_job_name": None,
            "live_remaining_time_sec": None,
            "live_status_message": "Seriale e/o LAN access code mancanti. Configurali nella scheda stampante.",
            "live_last_seen_at": None,
        }

    return _mqtt_status(host, serial, access_code)
