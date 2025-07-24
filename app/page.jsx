"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AuthGuard from '../components/AuthGaurd';
import Navbar from "@/components/Navbar";
import { toast } from 'react-hot-toast';

export default function Home() {
  const router = useRouter();
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

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

  const deleteMap = async (mapId) => {
    if (!window.confirm('Are you sure you want to delete this mind map?')) {
      return;
    }

    setDeletingId(mapId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { error } = await supabase
        .from('mind_maps')
        .delete()
        .eq('id', mapId)
        .eq('user_id', user.id);

      if (error) throw error;

      setMaps(maps.filter(map => map.id !== mapId));
      toast.success('Mind map deleted successfully');
    } catch (error) {
      console.error('Error deleting map:', error);
      toast.error('Failed to delete mind map');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AuthGuard>
      <Navbar/>
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Your Mind Maps</h1>
          
          <button
            onClick={createNewMap}
            className="mb-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer"
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
                  className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition border border-gray-700 relative group"
                >
                  <div 
                    onClick={() => router.push(`/map/${map.id}`)} 
                    className="cursor-pointer"
                  >
                    <h3 className="text-xl font-semibold mb-2">{map.title}</h3>
                    <p className="text-gray-400 text-sm">
                      Last updated: {new Date(map.updated_at).toLocaleString()}
                    </p>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMap(map.id);
                    }}
                    disabled={deletingId === map.id}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    {deletingId === map.id ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
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