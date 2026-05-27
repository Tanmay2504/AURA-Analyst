"use client";

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * WebSocket Message Types
 */
export interface WebSocketMessage {
  type: 'connection' | 'analysis_progress' | 'analysis_complete' | 'data_update' | 'error' | 'heartbeat' | 'pong' | 'subscribed' | 'unsubscribed';
  timestamp: string;
  [key: string]: any;
}

/**
 * WebSocket Hook Configuration
 */
interface UseWebSocketConfig {
  url: string;
  token: string;
  channel?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

/**
 * WebSocket Hook Return Type
 */
interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  disconnect: () => void;
  reconnect: () => void;
}

/**
 * Custom Hook for WebSocket Connection
 */
export function useWebSocket({
  url,
  token,
  channel,
  autoReconnect = true,
  reconnectInterval = 5000,
  onMessage,
  onConnect,
  onDisconnect,
  onError
}: UseWebSocketConfig): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(autoReconnect);

  const connect = useCallback(() => {
    try {
      // Build WebSocket URL with token and optional channel
      const wsUrl = new URL(url);
      wsUrl.searchParams.set('token', token);
      if (channel) {
        wsUrl.searchParams.set('channel', channel);
      }

      const ws = new WebSocket(wsUrl.toString());

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        if (onConnect) onConnect();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          if (onMessage) onMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) onError(error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        if (onDisconnect) onDisconnect();

        // Auto-reconnect if enabled
        if (shouldReconnectRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [url, token, channel, reconnectInterval, onConnect, onMessage, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    shouldReconnectRef.current = true;
    connect();
  }, [connect, disconnect]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  const subscribe = useCallback((newChannel: string) => {
    sendMessage({ type: 'subscribe', channel: newChannel });
  }, [sendMessage]);

  const unsubscribe = useCallback((oldChannel: string) => {
    sendMessage({ type: 'unsubscribe', channel: oldChannel });
  }, [sendMessage]);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      shouldReconnectRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    subscribe,
    unsubscribe,
    disconnect,
    reconnect
  };
}

/**
 * SSE (Server-Sent Events) Hook Configuration
 */
interface UseSSEConfig {
  url: string;
  token: string;
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
}

/**
 * SSE Hook Return Type
 */
interface UseSSEReturn {
  isConnected: boolean;
  lastEvent: MessageEvent | null;
  disconnect: () => void;
}

/**
 * Custom Hook for Server-Sent Events
 */
export function useSSE({
  url,
  token,
  onMessage,
  onError
}: UseSSEConfig): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<MessageEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Build URL with token
    const sseUrl = new URL(url);
    // For SSE, token is typically sent as Authorization header or query param
    // Since EventSource doesn't support custom headers, we use query param
    sseUrl.searchParams.set('token', token);

    const eventSource = new EventSource(sseUrl.toString());

    eventSource.onopen = () => {
      console.log('SSE connected');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      setLastEvent(event);
      if (onMessage) onMessage(event);
    };

    // Listen to custom event types
    ['connected', 'progress', 'complete', 'error', 'heartbeat', 'update', 'analysis', 'metrics'].forEach(eventType => {
      eventSource.addEventListener(eventType, (event) => {
        setLastEvent(event as MessageEvent);
        if (onMessage) onMessage(event as MessageEvent);
      });
    });

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setIsConnected(false);
      if (onError) onError(error);
    };

    eventSourceRef.current = eventSource;

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [url, token, onMessage, onError]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  return {
    isConnected,
    lastEvent,
    disconnect
  };
}

/**
 * Real-time Analysis Progress Component
 */
interface RealtimeAnalysisProgressProps {
  analysisId: string;
  token: string;
  wsUrl?: string;
  onComplete?: (results: any) => void;
}

export function RealtimeAnalysisProgress({
  analysisId,
  token,
  wsUrl = 'ws://localhost:8000/api/v1/realtime/ws',
  onComplete
}: RealtimeAnalysisProgressProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Connecting...');

  const { isConnected, lastMessage } = useWebSocket({
    url: wsUrl,
    token,
    channel: `analysis_${analysisId}`,
    onMessage: (message) => {
      if (message.type === 'analysis_progress') {
        setProgress(message.progress);
        setStatus(message.message);
      } else if (message.type === 'analysis_complete') {
        setProgress(100);
        setStatus('Complete');
        if (onComplete) onComplete(message.results);
      } else if (message.type === 'error') {
        setStatus(`Error: ${message.message}`);
      }
    }
  });

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-gray-800 rounded-lg shadow-lg">
      <div className="mb-2 flex justify-between items-center">
        <span className="text-sm font-medium text-gray-300">Analysis Progress</span>
        <span className={`text-xs px-2 py-1 rounded ${isConnected ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      <div className="mb-2">
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      
      <div className="text-sm text-gray-400">
        {status} ({progress}%)
      </div>
    </div>
  );
}

/**
 * Real-time Data Monitor Component
 */
interface RealtimeDataMonitorProps {
  dataId: string;
  token: string;
  sseUrl?: string;
}

export function RealtimeDataMonitor({
  dataId,
  token,
  sseUrl = 'http://localhost:8000/api/v1/realtime/stream/data'
}: RealtimeDataMonitorProps) {
  const [updates, setUpdates] = useState<any[]>([]);

  const { isConnected } = useSSE({
    url: `${sseUrl}/${dataId}`,
    token,
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        setUpdates(prev => [data, ...prev].slice(0, 10)); // Keep last 10 updates
      } catch (error) {
        console.error('Failed to parse SSE data:', error);
      }
    }
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-4 bg-gray-800 rounded-lg shadow-lg">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Real-time Data Monitor</h3>
        <span className={`text-xs px-2 py-1 rounded ${isConnected ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {updates.length === 0 ? (
          <p className="text-gray-400 text-sm">Waiting for updates...</p>
        ) : (
          updates.map((update, index) => (
            <div key={index} className="p-3 bg-gray-700 rounded text-sm">
              <div className="text-gray-300">
                <span className="font-medium">{update.timestamp}</span>
              </div>
              <pre className="text-gray-400 mt-1 text-xs overflow-x-auto">
                {JSON.stringify(update, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
