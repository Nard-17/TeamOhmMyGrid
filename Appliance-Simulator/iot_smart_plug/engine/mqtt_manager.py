"""
mqtt_manager.py - Real IoT MQTT Telemetry & Command Handler
Publishes live smart plug telemetry using industry-standard MQTT topics:
- meralco/smartplug/{device_id}/state       (Telemetry JSON)
- meralco/smartplug/{device_id}/availability(online / offline)
- meralco/smartplug/{device_id}/set         (Bidirectional Relay Control)
Maintains an internal circular buffer of MQTT packets for live UI inspection.
"""

import json
import time
from collections import deque
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Callable

try:
    import paho.mqtt.client as mqtt
    from paho.mqtt.enums import CallbackAPIVersion
    PAHO_AVAILABLE = True
except ImportError:
    PAHO_AVAILABLE = False


class SmartPlugMQTTManager:
    def __init__(self, device_id: str, broker_host: str = "localhost", broker_port: int = 1883):
        self.device_id = device_id
        self.broker_host = broker_host
        self.broker_port = broker_port
        
        self.topic_state = f"meralco/smartplug/{device_id}/state"
        self.topic_avail = f"meralco/smartplug/{device_id}/availability"
        self.topic_set = f"meralco/smartplug/{device_id}/set"
        
        # Circular packet buffer for live workbench inspector (stores last 30 packets)
        self.packet_log = deque(maxlen=30)
        self.is_broker_connected = False
        self.client = None
        self.command_callback: Optional[Callable[[Dict[str, Any]], None]] = None

        if PAHO_AVAILABLE:
            self._init_paho()

    def _init_paho(self):
        try:
            self.client = mqtt.Client(
                callback_api_version=CallbackAPIVersion.VERSION2,
                client_id=f"plug_{self.device_id}"
            )
            self.client.on_connect = self._on_connect
            self.client.on_message = self._on_message
            self.client.will_set(self.topic_avail, payload="offline", qos=1, retain=True)
        except Exception as e:
            print(f"[MQTT Init Warning] {e}")

    def connect(self):
        """Attempts connection to external MQTT broker in background."""
        if not self.client:
            return
        try:
            self.client.connect_async(self.broker_host, self.broker_port, keepalive=60)
            self.client.loop_start()
        except Exception as e:
            print(f"[MQTT Connect Note] No local broker found on {self.broker_host}:{self.broker_port} (running internal telemetry queue).")

    def _on_connect(self, client, userdata, flags, reason_code, properties=None):
        if reason_code == 0:
            self.is_broker_connected = True
            client.publish(self.topic_avail, payload="online", qos=1, retain=True)
            client.subscribe(self.topic_set, qos=1)
            print(f"[MQTT] Connected to broker and subscribed to {self.topic_set}")

    def _on_message(self, client, userdata, message):
        try:
            payload_str = message.payload.decode("utf-8")
            data = json.loads(payload_str)
            if self.command_callback:
                self.command_callback(data)
        except Exception as e:
            print(f"[MQTT Message Error] {e}")

    def publish_telemetry(self, telemetry_dict: Dict[str, Any]):
        """Publishes telemetry payload to MQTT and appends to packet log."""
        payload_json = json.dumps(telemetry_dict)
        now_iso = datetime.now(timezone.utc).isoformat()

        # Log packet internally for web inspector
        packet_record = {
            "timestamp": now_iso,
            "topic": self.topic_state,
            "qos": 0,
            "payload_preview": telemetry_dict["electrical"],
            "raw_json": payload_json
        }
        self.packet_log.appendleft(packet_record)

        # Publish to real broker if connected
        if self.client and self.is_broker_connected:
            try:
                self.client.publish(self.topic_state, payload_json, qos=0)
            except Exception as e:
                print(f"[MQTT Publish Error] {e}")

    def get_recent_packets(self) -> list:
        return list(self.packet_log)
