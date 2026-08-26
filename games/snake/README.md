# snake.io

Solo mode is pure client-side and works as static files (e.g. on GitHub Pages).

Online mode needs a real WebSocket connection, which GitHub Pages can't serve —
it only hosts static files. `server.js` runs a small Node app (static file
serving + WebSocket game state) that needs to run somewhere that can execute
Node, such as [Render](https://render.com).

## Deploy the online server (Render, free tier)

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In Render, choose **New > Blueprint** and point it at this repo. It will
   pick up `render.yaml` at the repo root, which deploys `games/snake` as a
   Node web service (`npm install` then `npm start`).
3. Once deployed, Render gives you a URL like `https://snake-online-xxxx.onrender.com`.
4. Open `games/snake/index.html` and set `ONLINE_SERVER_URL` near the bottom
   of the file to that URL, then commit/push. The "Play Online" button on
   the static site will then send players to the live server.

## Running locally

```
cd games/snake
npm install
npm start
```

This serves the whole mini-site (including online play) at
`http://localhost:8080`.
