import { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Trash2,
  MapPin,
} from "lucide-react";
import { useWeather } from "../context/WeatherContext";

function WeatherAI() {
  const { apiBaseUrl, selectedCity } = useWeather();

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      text: `Hi! I'm WeatherGPT AI, connected to live weather data. Your active city is ${selectedCity}. Ask me about rain chances, what to wear, travel safety, 5-day forecasts, or compare any two cities!`,
      time: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const SUGGESTIONS = [
    `Should I carry an umbrella in ${selectedCity} today?`,
    `What should I wear in ${selectedCity} right now?`,
    `5-day forecast for ${selectedCity}`,
    `Compare ${selectedCity} and Delhi weather`,
    `Is it safe to travel in Mumbai today?`,
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = async (textToSend) => {
    const clean = (textToSend ?? input).trim();
    if (!clean || sending) return;

    const nowTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsg = {
      id: Date.now(),
      role: "user",
      text: clean,
      time: nowTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`${apiBaseUrl}/api/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          city: selectedCity,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "AI service returned an error");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: data.reply || "No response received.",
          cityContext: data.cityContext,
          time: new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          text:
            err.message === "Failed to fetch"
              ? "Cannot reach WeatherGPT backend on port 5000. Please start the backend server and try again."
              : `Error: ${err.message}`,
          time: new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const handleClear = () => {
    setMessages([
      {
        id: Date.now(),
        role: "assistant",
        text: `Chat cleared! Ask me anything about weather in ${selectedCity} or any other city.`,
        time: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  return (
    <div className="ai-page">
      <div className="page-header">
        <div>
          <h1>WeatherGPT AI Assistant</h1>
          <p className="page-subtitle">
            Live weather-aware advisor for travel, outfits, monsoon checks, and city comparisons
          </p>
        </div>

        <div className="page-header-actions">
          <div className="context-pill">
            <MapPin size={15} color="#ff9d2e" />
            <span>Active City: <b>{selectedCity}</b></span>
          </div>
          <button
            type="button"
            className="action-btn"
            onClick={handleClear}
            title="Clear conversation"
          >
            <Trash2 size={16} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* QUICK SUGGESTIONS */}
      <div className="quick-chips">
        {SUGGESTIONS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="chip-btn"
            onClick={() => sendMessage(prompt)}
            disabled={sending}
          >
            <Sparkles size={13} />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* CHAT WINDOW */}
      <div className="chat-shell">
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-row ${msg.role}`}>
              <div className="chat-avatar">
                {msg.role === "assistant" ? (
                  <Bot size={18} />
                ) : (
                  <User size={18} />
                )}
              </div>
              <div className="chat-bubble">
                <div className="chat-bubble-text">{msg.text}</div>
                <div className="chat-bubble-meta">
                  {msg.cityContext && (
                    <span className="chat-city-tag">{msg.cityContext}</span>
                  )}
                  <span>{msg.time}</span>
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="chat-row assistant">
              <div className="chat-avatar">
                <Bot size={18} />
              </div>
              <div className="chat-bubble typing">
                Checking live weather data and crafting response...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form className="chat-input-bar" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={`Ask WeatherGPT anything (e.g., "Will it rain in ${selectedCity}?")...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            className="primary-btn"
            disabled={sending || !input.trim()}
          >
            <Send size={17} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default WeatherAI;
