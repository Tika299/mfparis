// Keep the legacy npm entrypoint pointed at the hardened socket server.
// Production deployments should use socket-server/Dockerfile directly.
import './socket-server/server.mjs'
