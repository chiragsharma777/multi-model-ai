import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useAuth } from "./context/AuthContext";

import {
  sendMessage as sendChatMessage,
  getConversations,
  getMessages,
  createConversation,
  renameConversation,
  deleteConversation,
} from "./services/api";

import ProfileModal from "./components/ProfileModal";

import "./App.css";

// ======================================================
// MARKDOWN
// ======================================================

function cleanMarkdown(text) {
  if (!text) return "";

  return String(text)
    .replace(/\\\*/g, "*")
    .replace(/\\_/g, "_")
    .replace(/\\#/g, "#")
    .replace(/\\`/g, "`");
}

function MarkdownMessage({ content }) {
  const [copied, setCopied] = useState(false);

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),

        code: ({ inline, children }) => {
          const codeText = String(children).replace(/\n$/, "");

          if (inline) {
            return (
              <code className="inline-code">
                {children}
              </code>
            );
          }

          return (
            <div className="code-block">
              <div className="code-header">
                <span>Code</span>

                <button
                  type="button"
                  onClick={() => copyCode(codeText)}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <pre>
                <code>{codeText}</code>
              </pre>
            </div>
          );
        },
      }}
    >
      {cleanMarkdown(content)}
    </ReactMarkdown>
  );
}

// ======================================================
// AUTH PAGE
// ======================================================

function AuthRequired() {
  const {
    signIn,
    signUp,
    resetPassword,
  } = useAuth();

  const [mode, setMode] = useState("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanEmail = email.trim();

    // ==================================================
    // FORGOT PASSWORD
    // ==================================================

    if (mode === "forgot") {
      if (!cleanEmail) {
        setError("Please enter your email address.");
        return;
      }

      setLoading(true);

      try {
        const { error: resetError } =
          await resetPassword(cleanEmail);

        if (resetError) {
          throw new Error(resetError.message);
        }

        setSuccess(
          "Password reset link sent. Please check your email."
        );
      } catch (err) {
        setError(
          err.message ||
            "Failed to send password reset email."
        );
      } finally {
        setLoading(false);
      }

      return;
    }

    // ==================================================
    // SIGN IN / SIGN UP VALIDATION
    // ==================================================

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (mode === "signup") {
      if (password.length < 6) {
        setError(
          "Password must be at least 6 characters."
        );
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);

    try {
      // =================================================
      // SIGN IN
      // =================================================

      if (mode === "signin") {
        const { error: signInError } =
          await signIn(cleanEmail, password);

        if (signInError) {
          throw new Error(signInError.message);
        }
      }

      // =================================================
      // SIGN UP
      // =================================================

      else {
        const { data, error: signUpError } =
          await signUp(cleanEmail, password);

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        if (data?.session) {
          setSuccess(
            "Account created successfully."
          );
        } else {
          setSuccess(
            "Account created. Please check your email to confirm your account."
          );
        }
      }
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  const isSignIn = mode === "signin";
  const isSignUp = mode === "signup";
  const isForgot = mode === "forgot";

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* BRAND */}

        <div className="auth-logo">
          <span>AI</span>
        </div>

        {/* HEADING */}

        <div className="auth-heading">
          <h1>
            {isSignIn
              ? "Welcome back"
              : isSignUp
              ? "Create your account"
              : "Forgot password?"}
          </h1>

          <p>
            {isSignIn
              ? "Sign in to continue to Your AI"
              : isSignUp
              ? "Create an account to start using Your AI"
              : "Enter your email and we'll send you a password reset link"}
          </p>
        </div>

        {/* ERROR */}

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div className="auth-success">
            {success}
          </div>
        )}

        {/* FORM */}

        <form onSubmit={handleSubmit}>

          {/* EMAIL */}

          <div className="form-group">
            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter your email"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          {/* PASSWORD */}

          {!isForgot && (
            <div className="form-group">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                autoComplete={
                  isSignIn
                    ? "current-password"
                    : "new-password"
                }
                disabled={loading}
              />
            </div>
          )}

          {/* CONFIRM PASSWORD */}

          {isSignUp && (
            <div className="form-group">
              <label htmlFor="confirmPassword">
                Confirm Password
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
          )}

          {/* FORGOT PASSWORD */}

          {isSignIn && (
            <div className="forgot-password-row">
              <button
                type="button"
                className="forgot-password"
                onClick={() =>
                  switchMode("forgot")
                }
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? isForgot
                ? "Sending..."
                : isSignIn
                ? "Signing in..."
                : "Creating account..."
              : isForgot
              ? "Send reset link"
              : isSignIn
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        {/* SWITCH */}

        <div className="auth-switch">
          {isForgot ? (
            <>
              <span>
                Remember your password?
              </span>

              <button
                type="button"
                onClick={() =>
                  switchMode("signin")
                }
              >
                Sign in
              </button>
            </>
          ) : isSignIn ? (
            <>
              <span>
                Don't have an account?
              </span>

              <button
                type="button"
                onClick={() =>
                  switchMode("signup")
                }
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              <span>
                Already have an account?
              </span>

              <button
                type="button"
                onClick={() =>
                  switchMode("signin")
                }
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ======================================================
// RESET PASSWORD PAGE
// ======================================================

function ResetPasswordPage() {
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleReset(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!password || !confirmPassword) {
      setError("Please enter your new password.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } =
        await updatePassword(password);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSuccess(
        "Password updated successfully. You can now sign in with your new password."
      );

      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err.message ||
          "Failed to update password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          <span>AI</span>
        </div>

        <div className="auth-heading">
          <h1>Reset your password</h1>

          <p>
            Enter a new password for your Your AI account
          </p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {success && (
          <div className="auth-success">
            {success}
          </div>
        )}

        <form onSubmit={handleReset}>

          <div className="form-group">
            <label htmlFor="newPassword">
              New Password
            </label>

            <input
              id="newPassword"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter new password"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="newConfirmPassword">
              Confirm New Password
            </label>

            <input
              id="newConfirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              placeholder="Confirm new password"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Updating password..."
              : "Update password"}
          </button>
        </form>

        {success && (
          <div className="auth-switch">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ======================================================
// HOME / CHAT PAGE
// ======================================================

function HomePage() {
  const { user, signOut } = useAuth();

  // ====================================================
  // CHAT STATE
  // ====================================================

  const [conversations, setConversations] =
    useState([]);

  const [
    activeConversationId,
    setActiveConversationId,
  ] = useState(null);

  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");

  const [sending, setSending] = useState(false);

  const [loadingHistory, setLoadingHistory] =
    useState(true);

  // ====================================================
  // EDITING
  // ====================================================

  const [editingId, setEditingId] =
    useState(null);

  const [editingTitle, setEditingTitle] =
    useState("");

  // ====================================================
  // PROFILE
  // ====================================================

  const [showProfile, setShowProfile] =
    useState(false);

  // ====================================================
  // AI SETTINGS
  // ====================================================

  const [selectedModel, setSelectedModel] =
    useState(
      "inclusionai/ling-3.0-flash-fin:free"
    );

  const [temperature, setTemperature] =
    useState(0.7);

  const models = [
    {
      id: "inclusionai/ling-3.0-flash-fin:free",
      name: "Ling 3 Flash",
    },

    {
      id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      name: "Nemotron 3 Nano Omni",
    },

    {
      id: "poolside/laguna-s-2.1:free",
      name: "Laguna S 2.1",
    },
  ];

  // ====================================================
  // FILE UPLOAD
  // ====================================================

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [fileContent, setFileContent] =
    useState("");

  const [uploadingFile, setUploadingFile] =
    useState(false);

  // ====================================================
  // USER
  // ====================================================

  const userEmail =
    user?.email || "User";

  const userInitial =
    userEmail.charAt(0).toUpperCase();

  // ====================================================
  // LOAD CONVERSATIONS
  // ====================================================

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      setLoadingHistory(true);

      const data =
        await getConversations();

      setConversations(data);
    } catch (error) {
      console.error(
        "Failed to load conversations:",
        error
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  // ====================================================
  // OPEN CONVERSATION
  // ====================================================

  async function openConversation(
    conversationId
  ) {
    try {
      setActiveConversationId(
        conversationId
      );

      const data =
        await getMessages(
          conversationId
        );

      setMessages(data);
    } catch (error) {
      console.error(
        "Failed to load messages:",
        error
      );
    }
  }

  // ====================================================
  // NEW CHAT
  // ====================================================

  function newChat() {
    setActiveConversationId(null);
    setMessages([]);
    setInput("");

    setSelectedFile(null);
    setFileContent("");
  }

  // ====================================================
  // FILE UPLOAD
  // ====================================================

  async function handleFileUpload(event) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    // Maximum file size = 10 MB

    const maxSize =
      10 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(
        "File is too large. Maximum size is 10 MB."
      );

      event.target.value = "";
      return;
    }

    // Supported extensions

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase();

    const allowedExtensions = [
      "txt",
      "md",
      "json",
      "csv",
    ];

    if (
      !allowedExtensions.includes(
        extension
      )
    ) {
      alert(
        "Supported files: TXT, MD, JSON and CSV."
      );

      event.target.value = "";
      return;
    }

    try {
      setUploadingFile(true);

      const content =
        await file.text();

      setSelectedFile(file);
      setFileContent(content);
    } catch (error) {
      console.error(
        "File upload failed:",
        error
      );

      alert(
        "Failed to read the file."
      );
    } finally {
      setUploadingFile(false);
    }

    event.target.value = "";
  }

  // ====================================================
  // REMOVE FILE
  // ====================================================

  function removeSelectedFile() {
    setSelectedFile(null);
    setFileContent("");
  }

  // ====================================================
  // SEND MESSAGE
  // ====================================================

  async function handleSendMessage(event) {
    event?.preventDefault();

    const text = input.trim();

    if (
      (!text && !selectedFile) ||
      sending
    ) {
      return;
    }

    setSending(true);
    setInput("");

    // ==================================================
    // CREATE MESSAGE TO SEND
    // ==================================================

    let finalMessage = text;

    if (
      selectedFile &&
      fileContent
    ) {
      finalMessage = `${text || "Please analyze this file."}

Attached file:
${selectedFile.name}

File content:
${fileContent}`;
    }

    // ==================================================
    // TEMPORARY USER MESSAGE
    // ==================================================

    const temporaryUserMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content:
        text ||
        `Attached: ${selectedFile?.name}`,
      file_name:
        selectedFile?.name || null,
    };

    setMessages((previous) => [
      ...previous,
      temporaryUserMessage,
    ]);

    try {
      // =================================================
      // SEND TO FASTAPI
      // =================================================

      const response =
        await sendChatMessage(
          finalMessage,
          activeConversationId,
          selectedModel,
          temperature
        );

      // =================================================
      // UPDATE CONVERSATION
      // =================================================

      if (response.conversation_id) {
        setActiveConversationId(
          response.conversation_id
        );
      }

      // =================================================
      // ASSISTANT MESSAGE
      // =================================================

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        model: response.model,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);

      // =================================================
      // CLEAR FILE
      // =================================================

      setSelectedFile(null);
      setFileContent("");

      // =================================================
      // REFRESH HISTORY
      // =================================================

      await loadConversations();
    } catch (error) {
      console.error(
        "Message failed:",
        error
      );

      setMessages((previous) => [
        ...previous,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            error.message ||
            "Sorry, something went wrong.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  // ====================================================
  // CREATE CONVERSATION
  // ====================================================

  async function handleCreateConversation() {
    try {
      const conversation =
        await createConversation(
          "New Chat"
        );

      setConversations((previous) => [
        conversation,
        ...previous,
      ]);

      setActiveConversationId(
        conversation.id
      );

      setMessages([]);
      setSelectedFile(null);
      setFileContent("");
    } catch (error) {
      console.error(
        "Failed to create conversation:",
        error
      );
    }
  }

  // ====================================================
  // DELETE CONVERSATION
  // ====================================================

  async function handleDeleteConversation(
    conversationId
  ) {
    const confirmed =
      window.confirm(
        "Delete this conversation?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteConversation(
        conversationId
      );

      setConversations((previous) =>
        previous.filter(
          (conversation) =>
            conversation.id !==
            conversationId
        )
      );

      if (
        activeConversationId ===
        conversationId
      ) {
        newChat();
      }
    } catch (error) {
      console.error(
        "Failed to delete conversation:",
        error
      );
    }
  }

  // ====================================================
  // RENAME
  // ====================================================

  function startRename(
    conversation
  ) {
    setEditingId(
      conversation.id
    );

    setEditingTitle(
      conversation.title ||
        "New Chat"
    );
  }

  async function saveRename(
    conversationId
  ) {
    const title =
      editingTitle.trim();

    if (!title) {
      setEditingId(null);
      return;
    }

    try {
      const updated =
        await renameConversation(
          conversationId,
          title
        );

      setConversations((previous) =>
        previous.map(
          (conversation) =>
            conversation.id ===
            conversationId
              ? {
                  ...conversation,
                  ...updated,
                }
              : conversation
        )
      );
    } catch (error) {
      console.error(
        "Failed to rename conversation:",
        error
      );
    } finally {
      setEditingId(null);
    }
  }

  // ====================================================
  // SIGN OUT
  // ====================================================

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      console.error(
        "Sign out failed:",
        error
      );
    }
  }

  // ====================================================
  // QUICK ACTION
  // ====================================================

  function handleQuickAction(
    text
  ) {
    setInput(text);
  }

  // ====================================================
  // EXPORT CHAT
  // ====================================================

  function safeFileName(name) {
    return (
      name
        .replace(/[<>:"/\\|?*]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 80) ||
      "your-ai-chat"
    );
  }

  function downloadFile(
    blob,
    filename
  ) {
    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
  }

  function exportChat(
    format = "txt"
  ) {
    if (
      !messages ||
      messages.length === 0
    ) {
      alert(
        "There are no messages to export."
      );

      return;
    }

    const title =
      conversations.find(
        (conversation) =>
          conversation.id ===
          activeConversationId
      )?.title ||
      "Your AI Chat";

    // ==================================================
    // JSON
    // ==================================================

    if (format === "json") {
      const blob =
        new Blob(
          [
            JSON.stringify(
              {
                title,
                model: selectedModel,
                temperature,
                exported_at:
                  new Date().toISOString(),
                messages,
              },
              null,
              2
            ),
          ],
          {
            type: "application/json",
          }
        );

      downloadFile(
        blob,
        `${safeFileName(title)}.json`
      );

      return;
    }

    // ==================================================
    // TXT
    // ==================================================

    const text =
      messages
        .map((message) => {
          const role =
            message.role === "user"
              ? "You"
              : "Your AI";

          return `${role}:\n${message.content}\n`;
        })
        .join(
          "\n------------------------\n\n"
        );

    const output = `${title}

Model: ${selectedModel}

Temperature: ${temperature}

${text}`;

    const blob =
      new Blob(
        [output],
        {
          type:
            "text/plain;charset=utf-8",
        }
      );

    downloadFile(
      blob,
      `${safeFileName(title)}.txt`
    );
  }

  // ====================================================
  // UI
  // ====================================================

  return (
    <div className="app">

      {/* ==================================================
          SIDEBAR
          ================================================== */}

      <aside className="sidebar">

        <div className="brand">
          <span>AI</span>
        </div>

        <button
          type="button"
          className="new-chat-button"
          onClick={newChat}
        >
          <span>+</span>
          New chat
        </button>

        <div className="sidebar-section">

          <div className="sidebar-label">
            Recent chats
          </div>

          <div className="chat-history">

            {loadingHistory ? (
              <div className="empty-chat-list">
                Loading...
              </div>
            ) : conversations.length === 0 ? (
              <div className="empty-chat-list">
                No conversations yet
              </div>
            ) : (
              conversations.map(
                (conversation) => (
                  <div
                    key={conversation.id}
                    className={`chat-history-item ${
                      activeConversationId ===
                      conversation.id
                        ? "active"
                        : ""
                    }`}
                  >

                    {editingId ===
                    conversation.id ? (
                      <input
                        className="history-edit-input"
                        value={
                          editingTitle
                        }
                        autoFocus
                        onChange={(event) =>
                          setEditingTitle(
                            event.target.value
                          )
                        }
                        onBlur={() =>
                          saveRename(
                            conversation.id
                          )
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key ===
                            "Enter"
                          ) {
                            event.preventDefault();

                            saveRename(
                              conversation.id
                            );
                          }

                          if (
                            event.key ===
                            "Escape"
                          ) {
                            setEditingId(
                              null
                            );
                          }
                        }}
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          className="history-main"
                          onClick={() =>
                            openConversation(
                              conversation.id
                            )
                          }
                        >
                          <span className="history-icon">
                            ◇
                          </span>

                          <span className="history-title">
                            {conversation.title ||
                              "New Chat"}
                          </span>
                        </button>

                        <div className="history-actions">

                          <button
                            type="button"
                            onClick={() =>
                              startRename(
                                conversation
                              )
                            }
                            title="Rename"
                          >
                            ✎
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteConversation(
                                conversation.id
                              )
                            }
                            title="Delete"
                          >
                            ×
                          </button>

                        </div>
                      </>
                    )}

                  </div>
                )
              )
            )}

          </div>
        </div>

        {/* USER ACCOUNT */}

        <div className="sidebar-bottom">

          <div className="user-card">

            <button
              type="button"
              className="user-profile-button"
              onClick={() =>
                setShowProfile(true)
              }
            >
              <div className="user-avatar">
                {userInitial}
              </div>

              <div className="user-info">

                <strong
                  title={userEmail}
                >
                  {user?.user_metadata
                    ?.full_name ||
                    userEmail}
                </strong>

                <span>
                  Online
                </span>

              </div>
            </button>

            <button
              type="button"
              className="sign-out-button"
              onClick={
                handleSignOut
              }
              title="Sign out"
            >
              ↪
            </button>

          </div>
        </div>
      </aside>

      {/* ==================================================
          MAIN
          ================================================== */}

      <main className="main">

        {/* HEADER */}

        <header className="header">

          <div className="header-title">

            <h2>
              Your AI
            </h2>

            <span className="online-status">
              <span className="online-dot"></span>
              Online
            </span>

          </div>

          {/* =================================================
              AI SETTINGS
              ================================================= */}

          <div className="chat-settings">

            {/* MODEL */}

            <label className="model-setting">

              <span>
                Model
              </span>

              <select
                value={
                  selectedModel
                }
                onChange={(event) =>
                  setSelectedModel(
                    event.target.value
                  )
                }
              >
                {models.map(
                  (model) => (
                    <option
                      key={model.id}
                      value={model.id}
                    >
                      {model.name}
                    </option>
                  )
                )}
              </select>

            </label>

            {/* TEMPERATURE */}

            <label className="temperature-setting">

              <span>
                Temperature:{" "}
                {Number(
                  temperature
                ).toFixed(1)}
              </span>

              <input
                type="range"
                min="0"
                max="1.5"
                step="0.1"
                value={
                  temperature
                }
                onChange={(event) =>
                  setTemperature(
                    Number(
                      event.target.value
                    )
                  )
                }
              />

            </label>

          </div>

          {/* =================================================
              HEADER ACTIONS
              ================================================= */}

          <div className="header-actions">

            <button
              type="button"
              className="export-button txt"
              onClick={() =>
                exportChat("txt")
              }
              title="Export chat as TXT"
            >
              ↓ TXT
            </button>

            <button
              type="button"
              className="export-button json"
              onClick={() =>
                exportChat("json")
              }
              title="Export chat as JSON"
            >
              ↓ JSON
            </button>

            <button
              type="button"
              className="header-avatar"
              onClick={() =>
                setShowProfile(true)
              }
              title="Profile"
            >
              {userInitial}
            </button>

          </div>
        </header>

        {/* ==================================================
            CHAT AREA
            ================================================== */}

        <section className="chat-area">

          {messages.length === 0 ? (
            <div className="welcome">

              <h1>
                How can I help you today?
              </h1>

              <p>
                Ask Your AI anything. I can
                help you write, code, learn,
                and explore ideas.
              </p>

              <div className="suggestions">

                <button
                  type="button"
                  onClick={() =>
                    handleQuickAction(
                      "Explain React.js to me"
                    )
                  }
                >
                  <strong>
                    Explain something
                  </strong>

                  <span>
                    Learn a concept simply
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickAction(
                      "Help me write a professional email"
                    )
                  }
                >
                  <strong>
                    Help me write
                  </strong>

                  <span>
                    Create or improve text
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickAction(
                      "Help me debug my code"
                    )
                  }
                >
                  <strong>
                    Debug code
                  </strong>

                  <span>
                    Find and fix problems
                  </span>
                </button>

              </div>
            </div>
          ) : (
            <div className="messages-container">

              {messages.map(
                (message) => (
                  <div
                    key={message.id}
                    className={`message-row ${
                      message.role === "user"
                        ? "user-message"
                        : "assistant-message"
                    }`}
                  >

                    <div className="message-avatar">
                      {message.role ===
                      "user"
                        ? userInitial
                        : "AI"}
                    </div>

                    <div className="message-body">

                      <div className="message-name">
                        {message.role ===
                        "user"
                          ? "You"
                          : "Your AI"}
                      </div>

                      <div className="message-text">

                        {message.role ===
                        "assistant" ? (
                          <MarkdownMessage
                            content={
                              message.content
                            }
                          />
                        ) : (
                          <>
                            <p>
                              {message.content}
                            </p>

                            {message.file_name && (
                              <div className="message-file">
                                📎{" "}
                                {message.file_name}
                              </div>
                            )}
                          </>
                        )}

                      </div>
                    </div>
                  </div>
                )
              )}

              {/* TYPING */}

              {sending && (
                <div className="message-row assistant-message">

                  <div className="message-avatar">
                    AI
                  </div>

                  <div className="message-body">

                    <div className="message-name">
                      Your AI
                    </div>

                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}
        </section>

        {/* ==================================================
            COMPOSER
            ================================================== */}

        <div className="composer-area">

          {/* SELECTED FILE */}

          {selectedFile && (
            <div className="selected-file">

              <div className="selected-file-info">

                <span className="file-icon">
                  📎
                </span>

                <div>
                  <strong>
                    {selectedFile.name}
                  </strong>

                  <span>
                    {(
                      selectedFile.size /
                      1024
                    ).toFixed(1)}{" "}
                    KB
                  </span>
                </div>

              </div>

              <button
                type="button"
                className="remove-file-button"
                onClick={
                  removeSelectedFile
                }
                title="Remove file"
              >
                ×
              </button>

            </div>
          )}

          {/* COMPOSER */}

          <form
            className="composer"
            onSubmit={
              handleSendMessage
            }
          >

            <div className="composer-input-row">

              {/* FILE BUTTON */}

              <label
                className="file-upload-button"
                title="Attach file"
              >
                📎

                <input
                  type="file"
                  accept=".txt,.md,.json,.csv,text/plain,text/markdown,application/json,text/csv"
                  onChange={
                    handleFileUpload
                  }
                  disabled={
                    sending ||
                    uploadingFile
                  }
                  hidden
                />
              </label>

              {/* TEXTAREA */}

              <textarea
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                      "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();

                    handleSendMessage(
                      event
                    );
                  }
                }}
                placeholder={
                  selectedFile
                    ? "Ask something about this file..."
                    : "Message Your AI..."
                }
                rows={1}
                disabled={sending}
              />

              {/* SEND */}

              <button
                type="submit"
                className="send-button"
                disabled={
                  sending ||
                  uploadingFile ||
                  (!input.trim() &&
                    !selectedFile)
                }
              >
                {sending
                  ? "..."
                  : "↑"}
              </button>

            </div>
          </form>

          <div className="composer-hint">
            Your AI can make mistakes.
            Check important information.
          </div>

        </div>
      </main>

      {/* PROFILE */}

      {showProfile && (
        <ProfileModal
          onClose={() =>
            setShowProfile(false)
          }
        />
      )}
    </div>
  );
}

// ======================================================
// APP
// ======================================================

export default function App() {
  const {
    user,
    loading,
    recoveryMode,
  } = useAuth();

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <div className="loading-screen">

        <div className="loading-logo">
          AI
        </div>

        <p>
          Loading Your AI...
        </p>

      </div>
    );
  }

  // ====================================================
  // PASSWORD RECOVERY
  // ====================================================

  if (recoveryMode) {
    return <ResetPasswordPage />;
  }

  // ====================================================
  // AUTH
  // ====================================================

  if (!user) {
    return <AuthRequired />;
  }

  // ====================================================
  // CHAT
  // ====================================================

  return <HomePage />;
}