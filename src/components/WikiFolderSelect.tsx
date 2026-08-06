"use client";

import { useEffect, useState } from "react";

export default function WikiFolderSelect({
  id = "wiki-folder",
  label = "Save to folder (optional)",
}: {
  id?: string;
  label?: string;
}) {
  const [folders, setFolders] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    fetch("/api/wiki/folders/flat")
      .then((r) => r.json())
      .then((data) => setFolders(data.folders || []))
      .catch(() => setFolders([]));
  }, []);

  return (
    <div style={{ marginTop: "0.6rem" }}>
      <label htmlFor={id}>{label}</label>
      <select id={id} name="folder_id" defaultValue="">
        <option value="">— No folder —</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
    </div>
  );
}
