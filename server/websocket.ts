import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export function initWebSocket(server: HttpServer) {
  io = new SocketIOServer(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/ws",
  });

  io.on("connection", (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });

    socket.on("subscribe:dashboard", () => {
      socket.join("dashboard");
    });

    socket.on("subscribe:analyses", () => {
      socket.join("analyses");
    });

    socket.on("subscribe:logs", () => {
      socket.join("logs");
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitNewAnalysis(analysis: any) {
  if (io) {
    io.to("dashboard").emit("analysis:new", analysis);
    io.to("analyses").emit("analysis:new", analysis);
  }
}

export function emitStatsUpdate(stats: any) {
  if (io) {
    io.to("dashboard").emit("stats:update", stats);
  }
}

export function emitNewLog(log: any) {
  if (io) {
    io.to("logs").emit("log:new", log);
  }
}
