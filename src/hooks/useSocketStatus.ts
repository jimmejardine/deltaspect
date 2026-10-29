import { useEffect, useState } from "react";
import { hlSocket, type SocketStatus } from "../api/hlSocket";

export function useSocketStatus() {
  const [status, setStatus] = useState<SocketStatus>("closed");
  useEffect(() => hlSocket.onStatus(setStatus), []);
  return status;
}
