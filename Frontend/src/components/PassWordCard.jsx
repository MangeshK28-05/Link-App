import { useState, useEffect } from "react";
import EditLinkModal from "./EditLinkModal";
import { Copy, ExternalLink, Pencil, Trash2, Lock, LockOpen } from "lucide-react";
import { toast } from 'sonner'

const API_URL = import.meta.env.VITE_API_URL;

function PassWordCard({ link, onDelete }) {
  const [currentLink, setCurrentLink] = useState(link);
  const [password, setPassword] = useState("");
  const [isLocked, setIsLocked] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    setCurrentLink(link);
  }, [link]);

  const sanitizeUrl = (url) => {
    if (!url) return "#";
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  };

  const handleUnlock = async () => {
    if (!password) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/links/${currentLink._id}/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        setIsLocked(false);
        setPassword("");
        toast.success('unlocked');

      } else {
        toast.error('wrong password')
      }

    } catch (err) {
      toast.error('something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLock = () => {
    if (isLocked) {
      handleUnlock();
    } else {
      setIsLocked(true);
      setPassword("");
    }
  };

  const handleAction = (action) => {
    if (isLocked) return;

    const url = sanitizeUrl(currentLink.url);
    if (action === "copy") {
      navigator.clipboard.writeText(url);
      toast.success('copied')
    } else if (action === "open") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API_URL}/api/links/${currentLink._id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (data.success) {
        onDelete(currentLink._id);
        toast.info('deleted');
      } else {
        alert(data.message || "Failed to delete");
      }
    } catch (err) {
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className={`P-link-card ${isLocked ? "card-locked" : "card-unlocked"}`}>
      <h4>{isLocked ? "Locked Content" : currentLink.title}</h4>
      <p className="url-display">
        {isLocked ? "Locked" : currentLink.url}
      </p>

      <div className="auth-row">
        {isLocked && (
          <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleToggleLock()}
          disabled={!isLocked || isLoading}
          placeholder = "Enter password..."
        />
        ) }
        <button
          onClick={handleToggleLock}
          disabled={isLoading}
          className="lock-btn"
        >
          {isLoading ? "..." : isLocked ? <Lock size={17}/> : <LockOpen size={17}/>}
        </button>
      </div>

      <div className="buttons">
        <button onClick={() => handleAction("copy")} disabled={isLocked}><Copy size={17} /></button>
        <button onClick={() => handleAction("open")} disabled={isLocked}><ExternalLink size={17} /></button>
        <button onClick={() => setShowEdit(true)} disabled={isLocked}><Pencil size={17} /></button>
        <button onClick={handleDelete}><Trash2 size={17} /></button>
      </div>

      {!isLocked && currentLink.tags?.length > 0 && (
        <div className="Tags">
          {currentLink.tags.map((tag) => (
            <em key={tag} className="tag-pill">{tag}</em>
          ))}
        </div>
      )}

      {showEdit && (
        <EditLinkModal
          link={currentLink}
          onClose={() => setShowEdit(false)}
          onUpdated={(updated) => setCurrentLink(updated)}
        />
      )}
    </div>
  );
}

export default PassWordCard;