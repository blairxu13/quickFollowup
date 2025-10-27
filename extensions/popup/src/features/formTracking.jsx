// Form.jsx (minimal table toggle)
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";

async function fetchApplications(userId) {
  const res = await fetch(`http://localhost:8000/get_applications?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

export default function Form() {
  const [userId, setUserId] = useState(null);
  const [show, setShow] = useState(true); // <-- toggle

  useEffect(() => {
    chrome.storage.local.get(["user_id"], (r) => setUserId(r.user_id ?? null));
  }, []);

  const { data: apps } = useQuery({
    queryKey: ["applications", userId],
    queryFn: () => fetchApplications(userId),
    enabled: !!userId,
    staleTime: 30_000,
  });

  return (
    <div>
   

      {show && (
        <table>
          <thead>
            <tr>
              <th>Job Title</th>
              <th>Company</th>
              <th>Applied</th>
            </tr>
          </thead>
          <tbody>
            {(apps ?? []).map((job, i) => (
              <tr key={job.id ?? i}>
                <td>{job.job_title}</td>
                <td>{job.company}</td>
                <td>{job.created_at ? new Date(job.created_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
