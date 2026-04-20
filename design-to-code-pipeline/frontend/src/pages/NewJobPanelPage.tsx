import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../services/api";

export function NewJobPanelPage() {
  const navigate = useNavigate();
  const [ticketId, setTicketId] = useState("");
  const [repo, setRepo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.createJob({ ticketId: ticketId.trim(), repo: repo.trim() });
      navigate(`/jobs/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-xl font-semibold text-white lg:text-2xl">Start pipeline</h1>
      <p className="mt-2 text-sm text-slate-500">Jira ticket key and Bitbucket repository (`workspace/repo-slug`, e.g. paytmteam/my-repo).</p>
      {error ? <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">{error}</div> : null}
      <form onSubmit={(e) => void onSubmit(e)} className="mx-auto mt-8 max-w-lg space-y-5 rounded-2xl border border-slate-800/80 bg-[#0c1018] p-6">
        <label className="block text-sm text-slate-300">
          Jira ticket key
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-[#07090e] px-3 py-2.5 text-white outline-none ring-sky-500/40 focus:border-sky-500 focus:ring-2"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            placeholder="PROJ-123"
            required
          />
        </label>
        <label className="block text-sm text-slate-300">
          Bitbucket repository
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-[#07090e] px-3 py-2.5 text-white outline-none ring-sky-500/40 focus:border-sky-500 focus:ring-2"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="paytmteam/my-repo"
            required
            pattern="^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create job"}
        </button>
      </form>
    </div>
  );
}
