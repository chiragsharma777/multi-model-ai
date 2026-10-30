import { supabase } from "../lib/supabase";

// ======================================================
// API CONFIG
// ======================================================

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";

// ======================================================
// GET ACCESS TOKEN
// ======================================================

async function getAccessToken() {
  const {
    data,
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error(
      "Failed to get session:",
      error
    );

    throw new Error(
      "Unable to get your session."
    );
  }

  const accessToken =
    data?.session?.access_token;

  if (!accessToken) {
    throw new Error(
      "You are not signed in. Please sign in again."
    );
  }

  return accessToken;
}

// ======================================================
// GENERIC API REQUEST
// ======================================================

async function apiRequest(
  endpoint,
  options = {}
) {
  const accessToken =
    await getAccessToken();

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${accessToken}`,

        ...(options.headers || {}),
      },
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}

// ======================================================
// HEALTH CHECK
// ======================================================

export async function healthCheck() {
  const response = await fetch(
    `${API_URL}/health`
  );

  if (!response.ok) {
    throw new Error(
      "Backend is not responding."
    );
  }

  return await response.json();
}

// ======================================================
// AUTH / CURRENT USER
// ======================================================

export async function getCurrentUser() {
  return await apiRequest(
    "/auth/me",
    {
      method: "GET",
    }
  );
}

// ======================================================
// SEND CHAT MESSAGE
// ======================================================

export async function sendMessage(
  message,
  conversationId = null,
  model = "sarvam-105b",
  temperature = 0.7
) {
  if (
    !message ||
    !message.trim()
  ) {
    throw new Error(
      "Message cannot be empty."
    );
  }

  return await apiRequest(
    "/chat",
    {
      method: "POST",

      body: JSON.stringify({
        message:
          message.trim(),

        model,

        temperature,

        conversation_id:
          conversationId,
      }),
    }
  );
}

// ======================================================
// GET ALL CONVERSATIONS
// ======================================================

export async function getConversations() {
  return await apiRequest(
    "/conversations",
    {
      method: "GET",
    }
  );
}

// ======================================================
// GET MESSAGES
// ======================================================

export async function getMessages(
  conversationId
) {
  if (!conversationId) {
    return [];
  }

  return await apiRequest(
    `/conversations/${conversationId}/messages`,
    {
      method: "GET",
    }
  );
}

// ======================================================
// CREATE CONVERSATION
// ======================================================

export async function createConversation(
  title = "New Chat"
) {
  return await apiRequest(
    "/conversations",
    {
      method: "POST",

      body: JSON.stringify({
        title,
      }),
    }
  );
}

// ======================================================
// RENAME CONVERSATION
// ======================================================

export async function renameConversation(
  conversationId,
  title
) {
  if (!conversationId) {
    throw new Error(
      "Conversation ID is required."
    );
  }

  if (
    !title ||
    !title.trim()
  ) {
    throw new Error(
      "Conversation title cannot be empty."
    );
  }

  return await apiRequest(
    `/conversations/${conversationId}`,
    {
      method: "PATCH",

      body: JSON.stringify({
        title:
          title.trim(),
      }),
    }
  );
}

// ======================================================
// DELETE CONVERSATION
// ======================================================

export async function deleteConversation(
  conversationId
) {
  if (!conversationId) {
    throw new Error(
      "Conversation ID is required."
    );
  }

  return await apiRequest(
    `/conversations/${conversationId}`,
    {
      method: "DELETE",
    }
  );
}

// ======================================================
// DEFAULT EXPORT
// ======================================================

export default {
  healthCheck,
  getCurrentUser,
  sendMessage,
  getConversations,
  getMessages,
  createConversation,
  renameConversation,
  deleteConversation,
};
