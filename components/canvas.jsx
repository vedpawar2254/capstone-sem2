import { useState, useRef } from "react";
import MindMapNode from "./MindMapNode";
import ConnectionLine from "./ConnectionLine";

export default function Canvas({ scale }) {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const canvasRef = useRef(null);

  const addNode = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      x: Math.random() * 500,
      y: Math.random() * 500,
      text: "New Idea",
      width: 150,
      height: 40,
    };
    setNodes([...nodes, newNode]);
  };

  const updateNodeText = (id, newText) => {
    setNodes(
      nodes.map((node) => (node.id === id ? { ...node, text: newText } : node))
    );
  };

  const handleNodeDrag = (id, dx, dy) => {
    setNodes(
      nodes.map((node) =>
        node.id === id ? { ...node, x: node.x + dx, y: node.y + dy } : node
      )
    );
  };

  const createConnection = (fromId, toId) => {
    if (fromId === toId) return;
    if (
      connections.some(
        (conn) =>
          (conn.from === fromId && conn.to === toId) ||
          (conn.from === toId && conn.to === fromId)
      )
    )
      return;

    setConnections([...connections, { from: fromId, to: toId }]);
  };

  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      setSelectedNode(null);
    }
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full bg-gray-50"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "0 0",
      }}
      onClick={handleCanvasClick}
    >
      {connections.map((conn, i) => (
        <ConnectionLine
          key={i}
          from={nodes.find((n) => n.id === conn.from)}
          to={nodes.find((n) => n.id === conn.to)}
        />
      ))}

      {nodes.map((node) => (
        <MindMapNode
          key={node.id}
          node={node}
          onUpdateText={updateNodeText}
          onDrag={handleNodeDrag}
          onConnect={createConnection}
          isSelected={selectedNode === node.id}
          onSelect={() => setSelectedNode(node.id)}
        />
      ))}
    </div>
  );
}
