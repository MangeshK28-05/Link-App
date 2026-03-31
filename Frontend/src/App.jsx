import React ,{ useState, useEffect } from "react";
import "./App.css";
import LinkCard from "./components/LinkCard";
import PassWordCard from "./components/PassWordCard";
import AddLinkForm from "./components/AddLinkForm";
import Login from "./components/Login";
import Signup from "./components/Signup";
import { BrushCleaning , Sun , Moon ,  CircleX  } from "lucide-react";
import { Toaster } from 'sonner';
const API_URL = import.meta.env.VITE_API_URL

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [links, setLinks] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    if (darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/links`, {
          credentials: "include"
        });
        if (res.ok) {
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.log("Not logged in");
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    const getLinks = async () => {
      try {
        let url = `${API_URL}/api/links`;
        if (selectedTag) {
          url = `${API_URL}/api/links/tag/${encodeURIComponent(selectedTag)}`;
        }

        const res = await fetch(url, {
          credentials: "include"
        });
        const data = await res.json();

        if (data.success) {
          setLinks(data.data || []);
        }
      } catch (err) {
        console.error("Error fetching links:", err);
      }
    };

    getLinks();
  }, [selectedTag, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const getTags = async () => {
      try {
        const res = await fetch(`${API_URL}/api/tags`, {
          credentials: "include"
        });
        const data = await res.json();
        if (data.success) {
          setTags(data.data || []);
        }
      } catch (err) {
        console.error("Error fetching tags:", err);
      }
    };
    getTags();
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className={`App ${darkMode ? "dark" : ""}`}>
        {showSignup ? (
          <Signup setIsLoggedIn={setIsLoggedIn} setShowSignup={setShowSignup} />
        ) : (
          <Login setIsLoggedIn={setIsLoggedIn} setShowSignup={setShowSignup} />
        )}
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
      setIsLoggedIn(false);
      setLinks([]);
      setTags([]);
    } catch (err) {
      console.error("Logout error:", err);
      setIsLoggedIn(false);
    }
  };

  const refreshTags = async () => {
    try{
      const res = await fetch(`${API_URL}/api/tags` , {
        credentials : "include"
      })
      const data = await res.json()
      if(data.success){
        setTags(data.data)
      }
    }
    catch(err){
      console.log('error' , err)
    }
  }

  const filteredLinks = links.filter((link) =>
    link.title?.toLowerCase().includes(search.toLowerCase())
  );

  const removeLinkFromUI = (id) => {
    setLinks((prevLinks) => prevLinks.filter(link => link._id !== id));
  };

  return (
    <>
    <Toaster position="top-center" richColors />
    <div className={`App ${darkMode ? "dark" : ""}`}>
      <div className="top-bar">
        <button
          className="dark-toggle"
          onClick={() => setDarkMode(prev => !prev)}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={() => setSearch("")}><BrushCleaning size={17}/></button>
      </div>

      {/* Add Link Button */}
      <div className="Form-inputDiv">
        <button onClick={() => setShowForm(true)}>Add Link</button>
      </div>

      {/* Add Link Modal */}
      {showForm && (
        <div className="addlink-overlay" onClick={() => setShowForm(false)}>
          <div className="addlink-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowForm(false)}> <CircleX /></button>
            <AddLinkForm
              onAdded={(newLink) => {
                setLinks((prev) => [...prev, newLink]);
                refreshTags();
                setShowForm(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Tag Filter Buttons */}
      <div className="Tag-btnDiv">
        <h4>Tags</h4>
        <button
          className={selectedTag === "" ? "active" : ""}
          onClick={() => setSelectedTag("")}
        >
          All
        </button>
        {tags.map((tag, index) => (
          <button
            key={index}
            className={selectedTag === tag ? "active" : ""}
            onClick={() => setSelectedTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Links List */}
      <div className="links-container">
        {filteredLinks.length === 0 ? (
          <p>No links found.</p>
        ) : (
          filteredLinks.map((link) =>
            link.hasPassword ? (
              <PassWordCard key={link._id} link={link} onDelete={removeLinkFromUI} />
            ) : (
              <LinkCard key={link._id} link={link} onDelete={removeLinkFromUI} />
            )
          )
        )}
      </div>
    </div>
    </>
  );
}

export default App;