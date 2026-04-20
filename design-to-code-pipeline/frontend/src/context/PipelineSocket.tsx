import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import type { Job } from "../types/job";

type Ctx = {
  socket: Socket | null;
};

const PipelineSocketContext = createContext<Ctx>({ socket: null });

const url = import.meta.env.VITE_SOCKET_URL ?? window.location.origin;

export function PipelineSocketProvider({ children }: { children: ReactNode }) {
  const socket = useMemo(() => {
    return io(url, {
      path: "/socket.io",
      transports: ["websocket"],
    });
  }, []);

  useEffect(() => {
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return <PipelineSocketContext.Provider value={{ socket }}>{children}</PipelineSocketContext.Provider>;
}

export function useJobUpdates(handler: (job: Job) => void): void {
  const { socket } = useContext(PipelineSocketContext);
  useEffect(() => {
    if (!socket) return;
    const fn = (payload: Job) => handler(payload);
    socket.on("job-update", fn);
    return () => {
      socket.off("job-update", fn);
    };
  }, [socket, handler]);
}

export function useSubscribeJob(jobId: string | undefined): void {
  const { socket } = useContext(PipelineSocketContext);
  useEffect(() => {
    if (!socket || !jobId) return;
    socket.emit("subscribe-job", jobId);
  }, [socket, jobId]);
}
