import { useState } from "react";
import { toast } from 'sonner'

const API_URL = import.meta.env.VITE_API_URL;

function EditLinkModal({ link, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: link.title || "",
    url: link.url || "",
    tags: link.tags?.join(", ") || "",
  });
  const [message, setMessage] = useState("");

  async function handleSave() {
    if (!form.title && !form.url && !form.tags) {
      setMessage("Fill in at least one field");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/links/${link._id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          url: form.url,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        onUpdated(data.data);
        toast.success('success')
        onClose();
      } else {
        setMessage(data.message);
        toast.error('failed')
      }
    } catch (err) {
      setMessage("Something went wrong");
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Edit Link</h3>

        <h5>Title</h5>
        <input
          type="text"
          placeholder="Link title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <h5>URL</h5>
        <input
          type="text"
          placeholder="https://..."
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
        />

        <h5>Tags (comma separated)</h5>
        <input
          type="text"
          placeholder="react, tools, design"
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
        />

        {message && <p>{message}</p>}

        <div className="buttons">
          <button onClick={handleSave}>Save</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default EditLinkModal;