"use client";
import { useState, useRef, useEffect } from "react";

export default function MindMap() {
  const [nodes, setNodes] = useState([
    { id: "1", x: 100, y: 100, text: "Main Idea", width: 120, height: 40 },
    { id: "2", x: 300, y: 100, text: "Sub Topic", width: 120, height: 40 },
  ]);
  const [connections, setConnections] = useState([{ from: "1", to: "2" }]);
  const [scale, setScale] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [editingNode, setEditingNode] = useState(null);
  const [editText, setEditText] = useState("");
  const canvasRef = useRef(null);
  const gridRef = useRef(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Draw grid background
  useEffect(() => {
    const drawGrid = () => {
      if (!gridRef.current) return;

      const canvas = gridRef.current;
      const ctx = canvas.getContext("2d");
      const size = 20 * scale;

      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;

      // Vertical lines
      for (let x = 0; x <= canvas.width; x += size) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= canvas.height; y += size) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    };

    drawGrid();
    window.addEventListener("resize", drawGrid);
    return () => window.removeEventListener("resize", drawGrid);
  }, [scale]);

  // Add a new node
  const addNode = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      x: Math.random() * 500,
      y: Math.random() * 500,
      text: "New Idea",
      width: 120,
      height: 40,
    };
    setNodes([...nodes, newNode]);
  };

  // Start editing a node
  const startEditing = (node) => {
    setEditingNode(node.id);
    setEditText(node.text);
  };

  // Save edited text
  const saveEditing = () => {
    if (editingNode) {
      setNodes(
        nodes.map((node) =>
          node.id === editingNode ? { ...node, text: editText } : node
        )
      );
      setEditingNode(null);
    }
  };

  // Handle node dragging
  const handleNodeMouseDown = (e, node) => {
    e.stopPropagation();
    setSelectedNode(node.id);
    setIsDraggingNode(true);
    setDragOffset({
      x: e.clientX - node.x,
      y: e.clientY - node.y,
    });
  };

  // Handle canvas dragging
  const handleCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current) {
      setIsDraggingCanvas(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      setSelectedNode(null);
    }
  };

  const handleMouseMove = (e) => {
    if (isDraggingNode && selectedNode) {
      setNodes(
        nodes.map((node) => {
          if (node.id === selectedNode) {
            return {
              ...node,
              x: e.clientX - dragOffset.x - canvasPosition.x,
              y: e.clientY - dragOffset.y - canvasPosition.y,
            };
          }
          return node;
        })
      );
    } else if (isDraggingCanvas) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setCanvasPosition((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    setIsDraggingNode(false);
    setIsDraggingCanvas(false);
  };

  // Zoom handlers
  const zoomIn = () => setScale((prev) => Math.min(2, prev + 0.1));
  const zoomOut = () => setScale((prev) => Math.max(0.5, prev - 0.1));

  return (
    <div
      className="flex flex-col h-screen bg-gray-100"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Toolbar */}
      <div className="bg-white p-4 shadow-md flex items-center space-x-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={addNode}
        >
          + Add Node
        </button>

        <div className="flex items-center space-x-2">
          <button
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            onClick={zoomOut}
          >
            -
          </button>
          <span className="text-sm">{(scale * 100).toFixed(0)}%</span>
          <button
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            onClick={zoomIn}
          >
            +
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden relative">
        {/* Grid Background */}
        <canvas
          ref={gridRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        />

        {/* MindMap Content */}
        <div
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
          style={{
            transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            cursor: isDraggingCanvas ? "grabbing" : "grab",
          }}
          onMouseDown={handleCanvasMouseDown}
        >
          {connections.map((conn, i) => (
            <svg
              key={i}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ zIndex: 0 }}
            >
              <line
                x1={nodes.find((n) => n.id === conn.from)?.x + 60}
                y1={nodes.find((n) => n.id === conn.from)?.y + 20}
                x2={nodes.find((n) => n.id === conn.to)?.x + 60}
                y2={nodes.find((n) => n.id === conn.to)?.y + 20}
                stroke="#94a3b8"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                </marker>
              </defs>
            </svg>
          ))}

          {nodes.map((node) => (
            <div
              key={node.id}
              className={`absolute p-2 rounded-lg border-2 cursor-move select-none
                ${
                  selectedNode === node.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 bg-white"
                }`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                minHeight: `${node.height}px`,
                zIndex: selectedNode === node.id ? 10 : 1,
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              onDoubleClick={() => startEditing(node)}
            >
              {editingNode === node.id ? (
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={saveEditing}
                  onKeyDown={(e) => e.key === "Enter" && saveEditing()}
                  className="w-full outline-none bg-transparent"
                  autoFocus
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {node.text}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
