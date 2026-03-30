import { useState } from "react";
import { toast } from 'sonner'

const API_URL = import.meta.env.VITE_API_URL;

export default function AddLinkForm({ onAdded }) {
  const [form, setForm] = useState({ title: "", url: "", password: "", tags: "" });
  const [message, setMessage] = useState("");

  const handleAddLink = async () => {
    if (!form.title || !form.url) {
      setMessage("Title and URL are required");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/links`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          url: form.url,
          password: form.password,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : ["general"],
        }),
      });

      const data = await res.json();

      if (data.success) {
        onAdded(data.data);
        setForm({ title: "", url: "", password: "", tags: "" });
        setMessage("");
        toast.success("link added")
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage("Something went wrong");
      toast.error('something went wrong')
    }
  };

  return (
    <div className="addLink-form">
      <h3>Add A Link</h3>

      <h5>Link Title</h5>
      <input
        type="text"
        placeholder="Link title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <h5>Link URL</h5>
      <input
        type="text"
        placeholder="www.something.com"
        value={form.url}
        onChange={(e) => setForm({ ...form, url: e.target.value })}
      />

      <h5>Password (optional)</h5>
      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />

      <h5>Tags (comma separated , 6 max)</h5>
      <input
        type="text"
        placeholder="news, funny, work"
        value={form.tags}
        onChange={(e) => setForm({ ...form, tags: e.target.value })}
      />

      <button onClick={handleAddLink}>Add Link</button>
      {message && <p>{message}</p>}
    </div>
  );
}