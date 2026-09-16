import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function ProfileModal({ onClose }) {
  const { user, updatePassword, signOut } = useAuth();

  const [name, setName] = useState(
    user?.user_metadata?.full_name || ""
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveProfile(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          data: {
            full_name: name.trim(),
          },
        });

      if (updateError) {
        throw updateError;
      }

      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);

    try {
      const { error: updateError } =
        await updatePassword(password);

      if (updateError) {
        throw updateError;
      }

      setPassword("");
      setConfirmPassword("");

      setMessage("Password changed successfully.");
    } catch (err) {
      setError(err.message || "Failed to change password.");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleLogout() {
    await signOut();
  }

  const avatarLetter =
    (
      name ||
      user?.email?.charAt(0) ||
      "E"
    )
      .charAt(0)
      .toUpperCase();

  return (
    <div
      className="profile-overlay"
      onClick={onClose}
    >
      <div
        className="profile-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="profile-header">
          <div>
            <h2>Profile & Account</h2>
            <p>Manage your EnigmaAI account</p>
          </div>

          <button
            className="profile-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="profile-avatar">
          {avatarLetter}
        </div>

        <form onSubmit={saveProfile}>
          <div className="form-group">
            <label>Display name</label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Your name"
            />
          </div>

          <div className="form-group">
            <label>Email</label>

            <input
              type="email"
              value={user?.email || ""}
              disabled
            />
          </div>

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save profile"}
          </button>
        </form>

        <div className="profile-divider" />

        <div className="profile-section">
          <h3>Change password</h3>
          <p>Choose a new password for your account.</p>

          <form onSubmit={changePassword}>
            <div className="form-group">
              <label>New password</label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="New password"
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label>Confirm password</label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Confirm password"
                minLength={6}
              />
            </div>

            <button
              className="auth-submit"
              type="submit"
              disabled={passwordLoading}
            >
              {passwordLoading
                ? "Changing..."
                : "Change password"}
            </button>
          </form>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {message && (
          <div className="auth-success">
            {message}
          </div>
        )}

        <div className="profile-divider" />

        <button
          className="profile-logout"
          type="button"
          onClick={handleLogout}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}