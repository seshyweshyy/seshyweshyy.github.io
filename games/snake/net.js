// net.js
export class Net {
  constructor(url) {
    this.url = url || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
    this.id = Math.random().toString(36).slice(2);
    this.handlers = [];
    this.statusHandlers = [];
    this.pending = null;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this._setStatus('open');
      if (this.pending) {
        this.ws.send(JSON.stringify(this.pending));
        this.pending = null;
      }
    };

    this.ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      for (const h of this.handlers) h(msg);
    };

    this.ws.onclose = () => {
      this._setStatus('closed');
      setTimeout(() => this.connect(), 1000);
    };

    this.ws.onerror = () => {
      this._setStatus('error');
    };
  }

  send(obj) {
    obj.id = this.id;
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    } else {
      this.pending = obj;
    }
  }

  onMessage(fn) {
    this.handlers.push(fn);
  }

  onStatus(fn) {
    this.statusHandlers.push(fn);
  }

  _setStatus(status) {
    for (const h of this.statusHandlers) h(status);
  }
}
