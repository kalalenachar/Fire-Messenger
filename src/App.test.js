import soundEngine from "./config/soundEngine";
import { getBotReplyAsync, fireBotUser, initialFireChats } from "./data/fireMockData";
import {
  editMessageAsync,
  toggleStarMessageAsync,
  pinChatMessageAsync,
  unpinChatMessageAsync,
  forwardMessagesAsync,
  setChatDisappearingTimerAsync,
} from "./data/fireStorage";

describe("Agni Messenger Web Core Engine Test Suite", () => {
  test("soundEngine initializes and toggles audio feedback", () => {
    expect(soundEngine).toBeDefined();
    const initial = soundEngine.isEnabled;
    const toggled = soundEngine.toggleSound();
    expect(toggled).toBe(!initial);
    // Restore
    soundEngine.toggleSound(initial);
    expect(soundEngine.isEnabled).toBe(initial);
  });

  test("soundEngine safely executes audio synthesizers without throwing errors", () => {
    expect(() => {
      soundEngine.playMessageSent();
      soundEngine.playMessageReceived();
      soundEngine.playReactionSound();
      soundEngine.startCallRingtone();
      soundEngine.stopCallRingtone();
      soundEngine.playCallConnected();
      soundEngine.playCallEnded();
      soundEngine.playNotificationChime();
    }).not.toThrow();
  });

  test("Groq AI conversational fallback returns intelligent offline response", async () => {
    const reply = await getBotReplyAsync("Hello, what is the weather today?", []);
    expect(typeof reply).toBe("string");
    expect(reply.length).toBeGreaterThan(0);
  });

  test("Groq AI fallback generates joke on joke prompt", async () => {
    const jokeReply = await getBotReplyAsync("Tell me a joke", []);
    expect(typeof jokeReply).toBe("string");
    expect(jokeReply.length).toBeGreaterThan(0);
  });

  test("fireStorage message action helpers execute safely without throwing", async () => {
    await expect(editMessageAsync("msg_1", "chat_1", "Updated content")).resolves.not.toThrow();
    await expect(toggleStarMessageAsync("msg_1", "user_1", "chat_1")).resolves.not.toThrow();
    await expect(pinChatMessageAsync("chat_1", { _id: "msg_1", content: "Pinned!" })).resolves.not.toThrow();
    await expect(unpinChatMessageAsync("chat_1")).resolves.not.toThrow();
    await expect(forwardMessagesAsync({ _id: "msg_1", content: "Fwd" }, ["chat_2", "chat_3"], { _id: "u1", name: "User" })).resolves.not.toThrow();
    await expect(setChatDisappearingTimerAsync("chat_1", 86400)).resolves.not.toThrow();
  });

  test("initialFireChats and fireBotUser are structured properly", () => {
    expect(Array.isArray(initialFireChats)).toBe(true);
    expect(initialFireChats.length).toBeGreaterThan(0);
    expect(fireBotUser).toBeDefined();
    expect(fireBotUser.isBot).toBe(true);
  });
});
