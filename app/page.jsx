"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Layout, ChevronRight } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [recentMaps, setRecentMaps] = useState([]);

  useEffect(() => {
    const savedMaps = localStorage.getItem("recentMaps");
    if (savedMaps) {
      setRecentMaps(JSON.parse(savedMaps).slice(0, 5));
    }
  }, []);

  const handleCreateMap = () => {
    const newMapId = uuidv4();

    const updatedMaps = [
      { id: newMapId, name: "Untitled Map", date: new Date().toISOString() },
      ...recentMaps,
    ].slice(0, 5);

    localStorage.setItem("recentMaps", JSON.stringify(updatedMaps));
    router.push(`/map/${newMapId}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800 p-6">
      <div className="flex items-center mb-6">
        <Layout className="text-blue-600 mr-2" size={32} />
        <h1 className="text-4xl font-bold">MindURMap</h1>
      </div>

      <p className="mb-8 text-xl text-gray-600 max-w-md text-center">
        Keyboard-driven mind mapping with ultra-smooth canvas interactions and
        Apple-grade UX.
      </p>

      <button
        onClick={handleCreateMap}
        className="px-8 py-4 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition flex items-center justify-center text-lg"
      >
        <span>New Mind Map</span>
        <ChevronRight className="ml-2" size={20} />
      </button>

      {recentMaps.length > 0 && (
        <div className="mt-16 w-full max-w-4xl">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            Recent Mind Maps
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {recentMaps.map((map) => (
              <div
                key={map.id}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition cursor-pointer"
                onClick={() => router.push(`/map/${map.id}`)}
              >
                <h3 className="font-semibold text-lg mb-1">{map.name}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(map.date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
