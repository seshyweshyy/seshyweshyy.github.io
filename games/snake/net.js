// net.js
export class Net {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = Math.random().toString(36).slice(2);
    this.handlers = [];

    this.ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      for (let h of this.handlers) h(msg);
    };
  }

  send(obj) {
    obj.id = this.id;
    this.ws.send(JSON.stringify(obj));
  }

  onMessage(fn) {
    this.handlers.push(fn);
  }
}
