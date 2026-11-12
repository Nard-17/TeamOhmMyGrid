/**
 * useSmartPlug.js - React Native Hook for KuryenTipid
 * Connects to the raw Smart Plug hardware feed (/ws) and runs the Meralco Tariff & Budget engine locally.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { evaluateBudget, isPeakHour, calculateWhatIfSavings } from './meralcoEngine';

export const DEFAULT_SERVER_HOST = '10.0.2.2:8000';

export function useSmartPlug(host = DEFAULT_SERVER_HOST, options = {}) {
  const [rawTelemetry, setRawTelemetry] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState(options.budgetLimit || 3500);
  const [simulatedDay, setSimulatedDay] = useState(options.simulatedDay || 12);
  const [whatIfResult, setWhatIfResult] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const httpUrl = host.startsWith('http') ? host : `http://${host}`;
  const wsUrl = host.startsWith('ws') ? host : `ws://${host.replace(/^https?:\/\//, '')}/ws`;

  // Connect to raw hardware WebSocket
  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          setRawTelemetry(packet);
        } catch (err) {
          console.warn('[SmartPlug Hook] JSON parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('[SmartPlug Hook] WebSocket error:', err.message);
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2500);
      };
    } catch (e) {
      console.warn('[SmartPlug Hook] Connection error:', e);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
    }
  }, [wsUrl]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connectWebSocket]);

  // Compute Meralco analytics locally on mobile whenever telemetry updates
  const meralcoAnalysis = useMemo(() => {
    const totalKwh = rawTelemetry?.energy?.accumulated_kwh || 115.4;
    const activeWatts = rawTelemetry?.electrical?.power_active_w || 0;

    const budget = evaluateBudget({
      totalKwh,
      activeWatts,
      budgetLimit,
      simulatedDay,
    });

    const isPeak = isPeakHour();

    return {
      budget,
      grid: {
        isPeakHour: isPeak,
        gridStrain: isPeak ? 'HIGH (Peak Demand)' : 'NORMAL (Off-Peak)',
      },
    };
  }, [rawTelemetry, budgetLimit, simulatedDay]);

  // Toggle smart plug relay switch
  const toggleRelay = useCallback(async (desiredState) => {
    try {
      const currentState = rawTelemetry?.relay_state || 'ON';
      const nextState = desiredState || (currentState === 'ON' ? 'OFF' : 'ON');

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ relay: nextState }));
      } else {
        await fetch(`${httpUrl}/api/hardware/relay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relay: nextState }),
        });
      }
    } catch (err) {
      console.error('[SmartPlug Hook] toggleRelay error:', err);
    }
  }, [rawTelemetry, httpUrl]);

  // Change load plugged into socket
  const setLoad = useCallback(async (appliance, options = {}) => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          load: appliance,
          target_temp: options.target_temp || 22,
        }));
      } else {
        await fetch(`${httpUrl}/api/hardware/load`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appliance,
            target_temp: options.target_temp || 22,
            speed: options.speed || 2,
          }),
        });
      }
    } catch (err) {
      console.error('[SmartPlug Hook] setLoad error:', err);
    }
  }, [httpUrl]);

  // Run mobile "What-If" Watt Calculator
  const runWhatIf = useCallback((scenarioType, details) => {
    const result = calculateWhatIfSavings(scenarioType, details);
    setWhatIfResult(result);
    return result;
  }, []);

  return {
    rawTelemetry,
    electrical: rawTelemetry?.electrical,
    energy: rawTelemetry?.energy,
    relayState: rawTelemetry?.relay_state,
    connectedLoad: rawTelemetry?.connected_load,
    diagnostic: rawTelemetry?.hardware_diagnostic,
    budget: meralcoAnalysis.budget,
    grid: meralcoAnalysis.grid,
    isConnected,
    toggleRelay,
    setLoad,
    runWhatIf,
    whatIfResult,
    setBudgetLimit,
    setSimulatedDay,
  };
}
