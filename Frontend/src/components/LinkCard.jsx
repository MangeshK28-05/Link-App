import { useState, useEffect } from "react";
import EditLinkModal from "./EditLinkModal";
import { Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { toast } from 'sonner'

const API_URL = import.meta.env.VITE_API_URL;

function LinkCard({ link, onDelete }) {
  const [currentLink, setCurrentLink] = useState(link);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    setCurrentLink(link);
  }, [link]);

  const sanitizeUrl = (url) => {
    if (!url) return "#";
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  };

  const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(currentLink.url);
    toast.success('Copied'); 
  } catch (err) {
    toast.error("Failed to copy URL"); 
  }
  };

  const handleOpen = () => {
    window.open(sanitizeUrl(currentLink.url), "_blank", "noopener,noreferrer");
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
      toast.error('something went wrong');
    }
  };

  return (
    <div className="Link-Card">
      <h4 className="Link-title">{currentLink.title || "Untitled"}</h4>
      <span className="Link-url">{currentLink.url}</span>

      <div className="buttons">
        <button onClick={handleCopy}><Copy size={17} /></button>
        <button onClick={handleOpen}><ExternalLink size={17} /></button>
        <button onClick={() => setShowEdit(true)} aria-label="Edit"><Pencil size={17} /></button>
        <button onClick={handleDelete} aria-label="Delete"><Trash2 size={17} /></button>
      </div>

      {currentLink.tags?.length > 0 && (
        <div className="tags">
          {currentLink.tags.map((tag) => (
            <em key={tag} className="Tags">{tag}</em>
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

export default LinkCard;