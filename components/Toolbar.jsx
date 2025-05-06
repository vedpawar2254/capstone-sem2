export default function Toolbar({ scale, setScale }) {
  const handleZoomIn = () => {
    setScale(Math.min(2, scale + 0.1));
  };

  const handleZoomOut = () => {
    setScale(Math.max(0.5, scale - 0.1));
  };

  return (
    <div className="bg-white p-4 shadow-md flex items-center space-x-4">
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => {
          // Add node logic would be here
          console.log("Add node");
        }}
      >
        + Add Node
      </button>

      <div className="flex items-center space-x-2">
        <button
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={handleZoomOut}
        >
          -
        </button>
        <span className="text-sm">{(scale * 100).toFixed(0)}%</span>
        <button
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={handleZoomIn}
        >
          +
        </button>
      </div>
    </div>
  );
}
