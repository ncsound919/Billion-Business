import React, { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { LogOut, Plus, Search, Zap, AlertCircle, RefreshCw } from "lucide-react";
import ScoreGauge from "../../components/ScoreGauge";
import QuickWinsList from "../../components/QuickWinsList";
import RoadmapBoard from "../../components/RoadmapBoard";
import type { HealthReport, QuickWin, RoadmapItem, IsoCompliance } from "../../types";
import IsoComplianceCert from "../../components/IsoComplianceCert";

interface Scan {
  id: string;
  repoUrl: string;
  owner: string;
  repo: string;
  score: number;
  grade: string;
  createdAt: string;
}

interface ScanDetail extends Scan {
  report: HealthReport | null;
  compliance?: IsoCompliance | null;
}

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const { isAuthenticated } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRescanning, setIsRescanning] = useState(false);
  const [completedWins, setCompletedWins] = useState<string[]>([]);

  const filteredScans = () =>
    scans.filter(
      (s) =>
        s.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.repo.toLowerCase().includes(searchTerm.toLowerCase())
    );

  useEffect(() => {
    if (!isAuthenticated) return;

    fetch("/api/v1/scans", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch scans");
        return res.json();
      })
      .then((data) => {
        const list: Scan[] = (data.scans || []).map((s: Record<string, unknown>) => ({
          id: s.id as string,
          repoUrl: s.repo_url as string,
          owner: s.owner as string,
          repo: s.name as string,
          score: (s.score as number) ?? 0,
          grade: (s.grade_category as string) ?? "N/A",
          createdAt: s.created_at as string,
        }));
        setScans(list);
        if (list.length > 0) {
          fetchDetail(list[0].id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const fetchDetail = async (id: string) => {
    try {
      const [detailRes, complianceRes] = await Promise.all([
        fetch(`/api/v1/scans/${id}`, { credentials: "include" }),
        fetch(`/api/v1/scans/${id}/compliance`, { credentials: "include" }),
      ]);
      if (!detailRes.ok) return;
      const detail = await detailRes.json();
      const compliance = complianceRes.ok ? await complianceRes.json() : null;
      setSelectedScan({ ...detail, compliance } as ScanDetail);
    } catch {
      // silently fail detail fetch
    }
  };

  const handleSelectScan = (scan: Scan) => {
    setSelectedScan(null);
    fetchDetail(scan.id);
  };

  const handleRescan = async () => {
    if (!selectedScan) return;
    setIsRescanning(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/scans", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: selectedScan.repoUrl }),
      });
      if (!res.ok) throw new Error("Failed to submit rescan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to re-scan");
    } finally {
      setIsRescanning(false);
    }
  };

  const quickWins: QuickWin[] = selectedScan?.report?.quickWins ?? [];
  const roadmap: RoadmapItem[] = selectedScan?.report?.roadmap ?? [];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Zap className="text-yellow-400" size={24} />
            <h1 className="text-xl font-bold">Grader</h1>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar - Scan List */}
          <div className="col-span-3">
            <div className="bg-slate-800 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Your Scans</h2>
                <button className="text-yellow-400 hover:text-yellow-300 transition">
                  <Plus size={18} />
                </button>
              </div>

              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-4 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400 mb-4"></div>
                  <p className="text-slate-400 text-sm">Loading your scans...</p>
                </div>
              ) : error ? (
                <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-400 mt-0.5 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-medium text-red-300">Error Loading Scans</p>
                      <p className="text-sm text-slate-300 mt-1">{error}</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="mt-3 text-sm text-yellow-400 hover:text-yellow-300 transition"
                      >
                        Reload Page
                      </button>
                    </div>
                  </div>
                </div>
              ) : filteredScans().length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm mb-4">No scans found</p>
                  <button className="text-yellow-400 hover:text-yellow-300 transition flex items-center gap-2 mx-auto">
                    <Plus size={16} />
                    <span>Add your first scan</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredScans().map((scan) => (
                    <button
                      key={scan.id}
                      onClick={() => handleSelectScan(scan)}
                      className={`w-full text-left p-3 rounded-lg transition ${selectedScan?.id === scan.id ? "bg-slate-700" : "hover:bg-slate-700/50"}`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{scan.owner}/{scan.repo}</p>
                          <p className="text-xs text-slate-400">
                            Scored: {scan.score} | Grade: {scan.grade}
                          </p>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${scan.score >= 90 ? "bg-green-500" : scan.score >= 70 ? "bg-yellow-500" : "bg-red-500"}`}>
                          {scan.grade}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Scan Details */}
          <div className="col-span-9">
            {selectedScan ? (
              <div className="space-y-8">
                <div className="bg-slate-800 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-bold">{selectedScan.owner}/{selectedScan.repo}</h2>
                      <p className="text-slate-400">
                        Last scanned: {new Date(selectedScan.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <ScoreGauge score={selectedScan.score} category={selectedScan.grade} />
                      <button
                        onClick={handleRescan}
                        disabled={isRescanning}
                        className={`bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition ${isRescanning ? "opacity-70 cursor-not-allowed" : "hover:bg-yellow-300"}`}
                      >
                        {isRescanning ? (
                          <span className="animate-spin">↻</span>
                        ) : (
                          <RefreshCw size={16} />
                        )}
                        <span>Re-scan</span>
                      </button>
                    </div>
                  </div>

                  {isRescanning && (
                    <div className="mb-6 p-4 bg-slate-700 rounded-lg flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-yellow-400"></div>
                      <p className="text-sm text-slate-300">Re-scanning repository...</p>
                    </div>
                  )}

                  {selectedScan.report ? (
                    <>
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-slate-700 p-4 rounded-lg">
                          <h3 className="text-sm font-medium text-slate-400 mb-2">Security</h3>
                          <p className="text-2xl font-bold">{selectedScan.report.security.vulnerabilityCount > 0 ? Math.max(10, 100 - selectedScan.report.security.vulnerabilityCount * 15) : 85}%</p>
                        </div>
                        <div className="bg-slate-700 p-4 rounded-lg">
                          <h3 className="text-sm font-medium text-slate-400 mb-2">Quality</h3>
                          <p className="text-2xl font-bold">{selectedScan.report.quality.readmeScore}%</p>
                        </div>
                        <div className="bg-slate-700 p-4 rounded-lg">
                          <h3 className="text-sm font-medium text-slate-400 mb-2">Market</h3>
                          <p className="text-2xl font-bold">{selectedScan.report.market.benchmarks.starRatingPercentile}%</p>
                        </div>
                      </div>

                      <QuickWinsList quickWins={quickWins} completedWins={completedWins} onToggleWin={(id) => setCompletedWins(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id])} />
                      <RoadmapBoard roadmap={roadmap} />
                      {selectedScan.compliance && (
                        <IsoComplianceCert
                          compliance={selectedScan.compliance}
                          repoOwner={selectedScan.owner}
                          repoName={selectedScan.repo}
                        />
                      )}
                    </>
                  ) : (
                    <p className="text-slate-400 text-center py-8">Loading report...</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-xl p-8 text-center">
                <p className="text-slate-400 mb-4">Select a scan from the left to view details</p>
                <button className="text-yellow-400 hover:text-yellow-300 transition flex items-center gap-2 mx-auto">
                  <Plus size={16} />
                  <span>Add your first scan</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}