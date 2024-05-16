import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [instructions, setInstructions] = useState("");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleInstructionsChange = (e) => {
    setInstructions(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("instructions", instructions);

    try {
      const res = await fetch("/api/editFile", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setMessage(data.message);
        setDownloadUrl(data.downloadUrl);
        console.log("Download URL:", data.downloadUrl);
      } else {
        const errorData = await res.json();
        setMessage(`Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setMessage("Error processing the file.");
    }
  };

  return (
    <div>
      <h1>Upload and Edit DOCX File</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" accept=".docx" onChange={handleFileChange} required />
        <textarea
          placeholder="Enter editing instructions"
          onChange={handleInstructionsChange}
          required
        ></textarea>
        <button type="submit">Edit File</button>
      </form>
      {message && <p>{message}</p>}
      {downloadUrl && (
        <p>
          <a href={downloadUrl} download>
            Download Edited File
          </a>
        </p>
      )}
    </div>
  );
}
