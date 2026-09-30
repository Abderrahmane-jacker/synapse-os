function getWsUrl(): string {
  if (typeof window !== 'undefined') {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL.replace(/^http/, 'ws') + '/api/chat/stream';
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname}:8000/api/chat/stream`;
  }
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/^http/, 'ws') + '/api/chat/stream';
}

type MessageHandler = (data: any) => void;

export class WSClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private handlers: Set<MessageHandler> = new Set();
  private pendingQueue: any[] = [];
  
  constructor(private url?: string) {}
  
  connect() {
    if (typeof window === 'undefined') return;
    if (this.ws?.readyState === WebSocket.OPEN) return;
    
    try {
      const targetUrl = this.url || getWsUrl();
      this.ws = new WebSocket(targetUrl);
      
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        console.log('WS connected');
        while (this.pendingQueue.length > 0) {
          const msg = this.pendingQueue.shift();
          try {
            this.ws?.send(JSON.stringify(msg));
          } catch (e) {
            console.error('Failed to send pending WS msg:', e);
          }
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handlers.forEach(h => h(data));
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };
      
      this.ws.onclose = () => {
        this.ws = null;
        this.attemptReconnect();
      };
      
      this.ws.onerror = (err) => {
        console.error('WS Error:', err);
      };
    } catch (e) {
      console.error('WS connect error:', e);
    }
  }
  
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }
    
    const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    
    setTimeout(() => {
      this.connect();
    }, timeout);
  }
  
  onMessage(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
  
  send(data: any): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    } else if (this.ws?.readyState === WebSocket.CONNECTING) {
      this.pendingQueue.push(data);
      return true;
    } else {
      this.connect();
      this.pendingQueue.push(data);
      return false;
    }
  }
  
  close() {
    this.ws?.close();
  }
}

export const wsClient = typeof window !== 'undefined' ? new WSClient() : null;
