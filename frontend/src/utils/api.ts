export const ws = new WebSocket("ws://localhost:3001/ws");

export let playerId: string = localStorage.getItem("playerId") ?? "";
while (!playerId || playerId === "null") {
  playerId = prompt("Enter your player ID") ?? "";
}

localStorage.setItem("playerId", playerId ?? "");

const onOpenCallbacks: Map<string, any> = new Map();
const onMessageCallbacks: Map<string, any> = new Map();
const onCloseCallbacks: Map<string, any> = new Map();
let isConnected = false;

ws.onopen = () => {
  console.log("Connected to server");
  onOpenCallbacks.forEach((callback, _key) => callback());
  isConnected = true;
};

ws.onmessage = (event: any) => {
  const message = JSON.parse(event.data);
  console.log("Received message from server:", message);
  onMessageCallbacks.get(message.type)?.callback(message.message);
};

ws.onclose = () => {
  console.log("Connection closed");
  onCloseCallbacks.forEach((callback, _key) => callback());
};

ws.onerror = (error) => {
  console.log("Error:", error);
};

export const onOpen = (key: string, callback: any) => {
  onOpenCallbacks.set(key, callback);
  if (isConnected) {
    callback();
  }
};

export const onMessage = (messageType: string, callback: any) => {
  onMessageCallbacks.set(messageType, { messageType: messageType, callback: callback });
};

export const onClose = (key: string, callback: any) => {
  onCloseCallbacks.set(key, callback);
};

export const init = () => {
  send("player.join", {
    id: playerId,
    name: "Player 1"
  });
}

export const send = (type: string, message: any) => { 
  ws.send(JSON.stringify({
    type: type,
    message: message
  }));
};