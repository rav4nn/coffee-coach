"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface AdminStats {
  stats: {
    total_users: number;
    total_brews: number;
    total_beans: number;
    avg_brews_per_user: number;
    avg_beans_per_user: number;
  };
  brew_method_breakdown: Record<string, number>;
  top_beans: Array<{ name: string; count: number }>;
  users: Array<{
    id: string;
    email: string;
    name: string;
    created_at: string | null;
    profile_complete: boolean;
    brew_count: number;
    bean_count: number;
  }>;
  brews: Array<{
    id: string;
    user_id: string;
    bean_id: string | null;
    method_id: string | null;
    coffee_grams: number;
    water_ml: number;
    water_temp_c: number | null;
    grind_size: string | null;
    brew_time: string | null;
    rating: number | null;
    is_favourite: boolean;
    created_at: string | null;
  }>;
}

const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "brews" | "export">("overview");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.user?.id !== ADMIN_USER_ID) {
      router.push("/");
      return;
    }

    if (status === "authenticated") {
      fetchStats();
    }
  }, [status, session, router]);

  async function fetchStats() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to fetch admin stats");
      }
      const stats = await res.json();
      setData(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  if (!data) {
    return <div className="p-8 text-center">No data available</div>;
  }

  const { stats, brew_method_breakdown, top_beans, users, brews } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-slate-400 mt-1">Coffee Coach Analytics</p>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="flex gap-0 px-6">
          {(["overview", "users", "brews", "export"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-400 hover:text-slate-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <p className="text-sm text-slate-400 mb-1">Total Users</p>
                <p className="text-3xl font-bold">{stats.total_users}</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <p className="text-sm text-slate-400 mb-1">Total Brews</p>
                <p className="text-3xl font-bold">{stats.total_brews}</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <p className="text-sm text-slate-400 mb-1">Total Beans</p>
                <p className="text-3xl font-bold">{stats.total_beans}</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <p className="text-sm text-slate-400 mb-1">Avg Brews/User</p>
                <p className="text-3xl font-bold">{stats.avg_brews_per_user.toFixed(1)}</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <p className="text-sm text-slate-400 mb-1">Avg Beans/User</p>
                <p className="text-3xl font-bold">{stats.avg_beans_per_user.toFixed(1)}</p>
              </div>
            </div>

            {/* Brew Method Breakdown */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-lg font-bold mb-4">Brew Method Breakdown</h2>
              <div className="space-y-3">
                {Object.entries(brew_method_breakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([method, count]) => (
                    <div key={method} className="flex items-center justify-between">
                      <span className="text-slate-300 capitalize">{method.replace(/_/g, " ")}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{
                              width: `${(count / stats.total_brews) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-slate-400 w-12 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Top Beans */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-lg font-bold mb-4">Top 10 Beans</h2>
              <div className="space-y-2">
                {top_beans.map((bean, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0">
                    <span className="text-slate-300">{bean.name}</span>
                    <span className="text-primary font-semibold">{bean.count} brews</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700 border-b border-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-center">Brews</th>
                    <th className="px-4 py-3 text-center">Beans</th>
                    <th className="px-4 py-3 text-left">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-750">
                      <td className="px-4 py-3 text-slate-300">{user.email}</td>
                      <td className="px-4 py-3">{user.name || "—"}</td>
                      <td className="px-4 py-3 text-center font-semibold">{user.brew_count}</td>
                      <td className="px-4 py-3 text-center font-semibold">{user.bean_count}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Brews Tab */}
        {activeTab === "brews" && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-700 border-b border-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">User ID</th>
                    <th className="px-3 py-2 text-left">Method</th>
                    <th className="px-3 py-2 text-center">Coffee (g)</th>
                    <th className="px-3 py-2 text-center">Water (ml)</th>
                    <th className="px-3 py-2 text-center">Rating</th>
                    <th className="px-3 py-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {brews.slice(0, 100).map((brew) => (
                    <tr key={brew.id} className="border-b border-slate-700 hover:bg-slate-750">
                      <td className="px-3 py-2 text-slate-400 font-mono text-[10px]">
                        {brew.user_id.slice(0, 8)}...
                      </td>
                      <td className="px-3 py-2 capitalize">{brew.method_id?.replace(/_/g, " ") || "—"}</td>
                      <td className="px-3 py-2 text-center">{brew.coffee_grams}</td>
                      <td className="px-3 py-2 text-center">{brew.water_ml}</td>
                      <td className="px-3 py-2 text-center">
                        {brew.rating ? (
                          <span className="font-semibold text-primary">{brew.rating}/10</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {brew.created_at ? new Date(brew.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {brews.length > 100 && (
              <div className="px-4 py-2 bg-slate-700 text-slate-400 text-sm">
                Showing first 100 of {brews.length} brews
              </div>
            )}
          </div>
        )}

        {/* Export Tab */}
        {activeTab === "export" && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-lg font-bold mb-4">Export Data</h2>
              <p className="text-slate-400 mb-6">
                Download all user, brew, and bean data as JSON for analysis or backup.
              </p>
              <button
                onClick={() => {
                  const json = JSON.stringify(data, null, 2);
                  const blob = new Blob([json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `coffee-coach-data-${new Date().toISOString().split("T")[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="bg-primary text-slate-950 font-semibold py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Download Full Data (JSON)
              </button>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="font-bold mb-3">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Users</p>
                  <p className="text-2xl font-bold">{stats.total_users}</p>
                </div>
                <div>
                  <p className="text-slate-400">Brews</p>
                  <p className="text-2xl font-bold">{stats.total_brews}</p>
                </div>
                <div>
                  <p className="text-slate-400">Beans</p>
                  <p className="text-2xl font-bold">{stats.total_beans}</p>
                </div>
                <div>
                  <p className="text-slate-400">Methods</p>
                  <p className="text-2xl font-bold">{Object.keys(brew_method_breakdown).length}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
