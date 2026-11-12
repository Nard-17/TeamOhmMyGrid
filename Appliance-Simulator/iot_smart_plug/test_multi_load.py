"""Regression checks for independently configured loads on one circuit."""
import unittest
from unittest.mock import patch

from .engine.hardware import SmartPlugHardware


class MultipleLoadTests(unittest.TestCase):
    def setUp(self):
        self.plug = SmartPlugHardware()
        self.plug.configure_load('air_conditioner', False)

    def test_sum_and_independent_configuration(self):
        self.plug.configure_load('fan', speed=1)
        self.plug.configure_load('rice_cooker', mode='warm')
        fan = self.plug.loads['fan']
        started = fan.start_timestamp
        self.plug.configure_load('fan', speed=3)
        self.assertIs(self.plug.loads['fan'], fan)
        self.assertEqual(fan.start_timestamp, started)
        self.assertEqual(self.plug.loads['rice_cooker'].mode, 'warm')
        snapshot = self.plug.read_sensors()
        self.assertAlmostEqual(sum(a['active_power_w'] for a in snapshot['appliances']),
                               snapshot['electrical']['active_power_w'], places=2)
        self.plug.configure_load('fan', enabled=False)
        snapshot = self.plug.read_sensors()
        self.assertEqual(snapshot['appliances'][0]['active_power_w'], 0)
        self.assertGreater(snapshot['appliances'][1]['active_power_w'], 0)

    def test_empty_and_master_off(self):
        self.assertEqual(self.plug.read_sensors()['electrical']['active_power_w'], 0)
        self.plug.configure_load('fan')
        self.plug.set_relay('OFF')
        snapshot = self.plug.read_sensors()
        self.assertEqual(snapshot['electrical']['active_power_w'], 0)
        self.assertEqual(snapshot['appliances'][0]['active_power_w'], 0)
        self.plug.configure_load('fan', False)
        self.assertEqual(self.plug.read_sensors()['appliances'], [])

    def test_scenario_effects_and_selection_state(self):
        self.plug.configure_load('air_conditioner')
        with patch.object(self.plug.loads['air_conditioner'], 'step', return_value=(1000, 1, True)):
            for scenario, watts in [('normal', 1000), ('peak_hours', 1000),
                                    ('hot_day', 1200), ('energy_saving', 800)]:
                self.plug.scenario = scenario
                snapshot = self.plug.read_sensors()
                self.assertEqual(snapshot['electrical']['active_power_w'], watts)
                self.assertEqual(snapshot['status']['scenario'], scenario)
                self.assertEqual(snapshot['status']['grid_demand'], 'high' if scenario == 'peak_hours' else 'normal')
        self.plug.inject_grid_disturbance('surge')
        self.plug.inject_appliance_fault('bearing_wear')
        snapshot = self.plug.read_sensors()
        self.assertEqual(snapshot['status']['grid_disturbance'], 'surge')
        self.assertEqual(snapshot['status']['selected_fault'], 'bearing_wear')
        self.assertEqual(snapshot['status']['fault_affected_appliances'], [])
        self.plug.configure_load('fan')
        self.assertEqual(self.plug.read_sensors()['status']['fault_affected_appliances'], ['fan'])
        self.plug.inject_appliance_fault(None)
        self.plug.inject_grid_disturbance(None)
        snapshot = self.plug.read_sensors()
        self.assertIsNone(snapshot['status']['selected_fault'])
        self.assertIsNone(snapshot['status']['grid_disturbance'])

    def test_quantities_and_group_totals(self):
        self.plug.configure_load('fan', quantity=3, speed=1)
        with patch.object(self.plug.loads['fan'], 'step', return_value=(50, 1, True)):
            snapshot = self.plug.read_sensors()
        row = snapshot['appliances'][0]
        self.assertEqual(row['unit_power_w'], 50)
        self.assertEqual(row['active_power_w'], 150)
        self.assertEqual(snapshot['electrical']['active_power_w'], 150)
        self.plug.configure_load('fan', quantity_delta=1)
        self.plug.configure_load('fan', quantity_delta=1)
        self.assertEqual(self.plug.load_configuration('fan')['quantity'], 5)
        self.assertEqual(self.plug.loads['fan'].speed, 1)
        self.plug.configure_load('fan', quantity=1)
        self.plug.configure_load('fan', quantity_delta=-1)
        self.assertNotIn('fan', self.plug.loads)
        with self.assertRaises(ValueError):
            self.plug.configure_load('fan', quantity=100)

    def test_combined_overload(self):
        self.plug.protection_enabled = True
        self.plug.configure_load('fan')
        self.plug.configure_load('rice_cooker')
        with patch.object(self.plug.loads['fan'], 'step', return_value=(2000, 1, True)), \
             patch.object(self.plug.loads['rice_cooker'], 'step', return_value=(2000, 1, True)):
            self.plug.last_sample_time -= 0.5
            snapshot = self.plug.read_sensors()
        self.assertEqual(snapshot['status']['relay'], 'TRIPPED')
        self.assertEqual(snapshot['electrical']['active_power_w'], 0)
        self.assertTrue(all(a['active_power_w'] == 0 for a in snapshot['appliances']))

    def test_monitoring_continues_above_safety_limits(self):
        self.plug.configure_load('fan')
        self.plug.pcb_temp_c = 90
        with patch.object(self.plug.loads['fan'], 'step', return_value=(5000, 1, True)):
            self.plug.last_sample_time -= 1
            snapshot = self.plug.read_sensors()
        self.assertFalse(snapshot['status']['protection_enabled'])
        self.assertEqual(snapshot['status']['relay'], 'CLOSED')
        self.assertEqual(snapshot['electrical']['active_power_w'], 5000)

    def test_all_models_and_invalid_settings(self):
        from .engine.appliances import APPLIANCE_CATALOG
        for key in APPLIANCE_CATALOG:
            self.plug.configure_load(key, load_pct=75)
        self.assertEqual(len(self.plug.read_sensors()['appliances']), 8)
        with self.assertRaises(ValueError):
            self.plug.configure_load('fan', mode='cook')
        self.assertFalse(hasattr(self.plug.loads['fan'], 'mode'))


if __name__ == '__main__':
    unittest.main()
