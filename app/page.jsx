"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AuthGuard from '../components/AuthGaurd';
import Navbar from "@/components/Navbar";

export default function Home() {
  const router = useRouter();
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaps = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('mind_maps')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (!error) {
        setMaps(data || []);
      }
      setLoading(false);
    };

    fetchMaps();
  }, []);

  const createNewMap = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const newMap = {
      user_id: user.id,
      title: "Untitled Map",
      nodes: [
        { id: "1", x: 100, y: 100, text: "Main Idea", width: 120, height: 40 },
        { id: "2", x: 300, y: 100, text: "Sub Topic", width: 120, height: 40 },
      ],
      connections: [{ from: "1", to: "2" }]
    };

    const { data, error } = await supabase
      .from('mind_maps')
      .insert([newMap])
      .select()
      .single();

    if (error) {
      console.error('Error creating map:', error);
      return;
    }

    router.push(`/map/${data.id}`);
  };

  return (
    <AuthGuard>
      <Navbar/>
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Your Mind Maps</h1>
          
          <button
            onClick={createNewMap}
            className="mb-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            + Create New Map
          </button>

          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {maps.map(map => (
                <div
                  key={map.id}
                  onClick={() => router.push(`/map/${map.id}`)}
                  className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 cursor-pointer transition border border-gray-700"
                >
                  <h3 className="text-xl font-semibold mb-2">{map.title}</h3>
                  <p className="text-gray-400 text-sm">
                    Last updated: {new Date(map.updated_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {!loading && maps.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">You don't have any mind maps yet. Create your first one!</p>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}