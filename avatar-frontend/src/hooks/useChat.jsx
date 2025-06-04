import { createContext, useContext, useEffect, useState } from "react";

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const chat = async (message) => {
    setLoading(true);

    // 1. Kirim ke LLM (Ollama)
    const replyRes = await fetch(`${backendUrl}/chat-ollama`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const replyData = await replyRes.json();
    const replyText = replyData.reply;

    // // 🔊 Putar audio jika tersedia
    // if (replyData.audio) {
    //   const audio = new Audio("data:audio/mp3;base64," + replyData.audio);
    //   audio.play();

    //   audio.onended = () => {
    //     onMessagePlayed();
    //   };
    // } else {
    //   // fallback jika tidak ada audio
    //   setTimeout(() => {
    //     onMessagePlayed();
    //   }, 3000);
    // }

    // 2. Prediksi ekspresi dari teks
    const gestureRes = await fetch(`${backendUrl}/gesture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: replyText }),
    });
    const gestureData = await gestureRes.json();
    const facialExpression = gestureData.gesture || "neutral";

    // 3. Tambahkan ke antrian message
setMessages((prev) => [
      ...prev,
      {
        text: replyText,
        facialExpression,
        animation: "Talking_1",
        audio: replyData.audio || "", // ✅ masukkan audio dari backend
        lipsync: replyData.lipsync || { mouthCues: [] }, // ✅ masukkan lipsync
      },
    ]);

    setLoading(false);
  };

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const onMessagePlayed = () => {
    setMessages((messages) => messages.slice(1));
  };

  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[0]);
    } else {
      setMessage(null);
    }
  }, [messages]);

  return (
    <ChatContext.Provider
      value={{
        chat,
        message,
        onMessagePlayed,
        loading,
        cameraZoomed,
        setCameraZoomed,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
