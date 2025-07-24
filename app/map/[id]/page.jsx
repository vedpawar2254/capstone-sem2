"use client";
import { useState, useRef, useEffect } from "react";
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// Node shape types
const NODE_TYPES = {
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  DIAMOND: 'diamond',
  CLOUD: 'cloud'
};

// Default colors
const DEFAULT_NODE_COLOR = '#ffffffff';
const DEFAULT_CONNECTION_COLOR = '#94a3b8';

export default function MindMap() {
  const router = useRouter();
  const params = useParams();
  const mapId = params.id;
  
  // State initialization
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [scale, setScale] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isCreatingConnection, setIsCreatingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState(null);
  const [tempConnection, setTempConnection] = useState(null);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [editingNode, setEditingNode] = useState(null);
  const [editText, setEditText] = useState("");
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [mapTitle, setMapTitle] = useState("Untitled Map");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [connectionColor, setConnectionColor] = useState(DEFAULT_CONNECTION_COLOR);
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const [nodeMenu, setNodeMenu] = useState({ visible: false, x: 0, y: 0, nodeId: null });
  const canvasRef = useRef(null);
  const gridRef = useRef(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Load map when component mounts or mapId changes
  useEffect(() => {
    const loadMap = async () => {
      if (mapId) {
        setIsLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            router.push('/login');
            return;
          }

          const { data, error } = await supabase
            .from('mind_maps')
            .select('*')
            .eq('id', mapId)
            .eq('user_id', user.id)
            .single();

          if (error) throw error;
          
          if (data) {
            setNodes(data.nodes || []);
            setConnections(data.connections || []);
            setMapTitle(data.title || "Untitled Map");
          }
        } catch (error) {
          console.error('Load error:', error);
          setSaveMessage('Error loading map');
        } finally {
          setIsLoading(false);
        }
      } else {
        setNodes([
          { 
            id: "1", 
            x: 100, 
            y: 100, 
            text: "Main Idea", 
            width: 120, 
            height: 40,
            type: NODE_TYPES.RECTANGLE,
            color: DEFAULT_NODE_COLOR
          },
          { 
            id: "2", 
            x: 300, 
            y: 100, 
            text: "Sub Topic", 
            width: 120, 
            height: 40,
            type: NODE_TYPES.RECTANGLE,
            color: DEFAULT_NODE_COLOR
          }
        ]);
        setConnections([{ from: "1", to: "2" }]);
        setIsLoading(false);
      }
    };

    loadMap();
  }, [mapId, router]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        deleteNode(selectedNode);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveMindMap();
      }
      if (e.key === 'Enter' && !editingNode) {
        addNode();
      }
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setEditingNode(null);
        if (isCreatingConnection) {
          setIsCreatingConnection(false);
          setConnectionStart(null);
          setTempConnection(null);
        }
        setNodeMenu({ visible: false, x: 0, y: 0, nodeId: null });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, editingNode, isCreatingConnection]);

  // Toggle node collapse state
  const toggleCollapse = (nodeId) => {
    setCollapsedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Calculate intersection point with node border
  const getBorderIntersection = (fromX, fromY, toX, toY, node) => {
    const centerX = node.x + node.width / 2;
    const centerY = node.y + node.height / 2;
    
    // Calculate direction vector
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const dirX = dx / length;
    const dirY = dy / length;
    
    // For different node types
    switch(node.type) {
      case NODE_TYPES.CIRCLE:
        // Circle intersection
        const radius = Math.min(node.width, node.height) / 2;
        const angle = Math.atan2(dirY, dirX);
        return {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
        
      case NODE_TYPES.DIAMOND:
        // Diamond intersection (rotated square)
        const halfWidth = node.width / 2;
        const halfHeight = node.height / 2;
        
        // Check which edge we intersect
        const absDirX = Math.abs(dirX);
        const absDirY = Math.abs(dirY);
        
        if (absDirX > absDirY) {
          const edgeX = dirX > 0 ? halfWidth : -halfWidth;
          const edgeY = edgeX * dirY / dirX;
          return {
            x: centerX + edgeX,
            y: centerY + edgeY
          };
        } else {
          const edgeY = dirY > 0 ? halfHeight : -halfHeight;
          const edgeX = edgeY * dirX / dirY;
          return {
            x: centerX + edgeX,
            y: centerY + edgeY
          };
        }
        
      default: // Rectangle and Cloud
        // Rectangle intersection
        const halfW = node.width / 2;
        const halfH = node.height / 2;
        
        // Calculate intersection with rectangle
        const tX = (dirX > 0 ? halfW : -halfW) / dirX;
        const tY = (dirY > 0 ? halfH : -halfH) / dirY;
        const t = Math.min(tX, tY);
        
        return {
          x: centerX + dirX * t,
          y: centerY + dirY * t
        };
    }
  };

  // Calculate smooth bezier curve path between nodes
  const calculateConnectionPath = (fromNode, toNode) => {
    const fromCenterX = fromNode.x + fromNode.width / 2;
    const fromCenterY = fromNode.y + fromNode.height / 2;
    const toCenterX = toNode.x + toNode.width / 2;
    const toCenterY = toNode.y + toNode.height / 2;
    
    // Get intersection points at node borders
    const fromIntersection = getBorderIntersection(
      toCenterX, toCenterY, fromCenterX, fromCenterY, fromNode
    );
    const toIntersection = getBorderIntersection(
      fromCenterX, fromCenterY, toCenterX, toCenterY, toNode
    );
    
    // Calculate control points for a smooth curve
    const dx = toIntersection.x - fromIntersection.x;
    const dy = toIntersection.y - fromIntersection.y;
    const controlX1 = fromIntersection.x + dx * 0.5;
    const controlY1 = fromIntersection.y;
    const controlX2 = toIntersection.x - dx * 0.5;
    const controlY2 = toIntersection.y;
    
    return {
      path: `M${fromIntersection.x},${fromIntersection.y} C${controlX1},${controlY1} ${controlX2},${controlY2} ${toIntersection.x},${toIntersection.y}`,
      arrowX: toIntersection.x,
      arrowY: toIntersection.y
    };
  };

  // Add a new node
  const addNode = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      x: Math.random() * 500,
      y: Math.random() * 500,
      text: "New Idea",
      width: 120,
      height: 40,
      type: NODE_TYPES.RECTANGLE,
      color: DEFAULT_NODE_COLOR
    };
    setNodes([...nodes, newNode]);
  };

  // Update node properties
  const updateNode = (nodeId, updates) => {
    setNodes(nodes.map(node => 
      node.id === nodeId ? { ...node, ...updates } : node
    ));
  };

  // Show context menu for node
  const showNodeMenu = (e, nodeId) => {
    e.preventDefault();
    setNodeMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      nodeId
    });
  };

  // Close context menu
  const closeNodeMenu = () => {
    setNodeMenu({ visible: false, x: 0, y: 0, nodeId: null });
  };

  // Delete a node and its connections
  const deleteNode = (nodeId) => {
    setNodes(nodes.filter(node => node.id !== nodeId));
    setConnections(connections.filter(
      conn => conn.from !== nodeId && conn.to !== nodeId
    ));
    setSelectedNode(null);
    closeNodeMenu();
  };

  // Save function
  const saveMindMap = async () => {
    setIsSaving(true);
    setSaveMessage("");
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      const mapData = {
        user_id: user.id,
        title: mapTitle,
        nodes,
        connections,
        updated_at: new Date().toISOString()
      };

      if (mapId) mapData.id = mapId;

      const { data, error } = await supabase
        .from('mind_maps')
        .upsert(mapData)
        .select()
        .single();

      if (error) throw error;

      setSaveMessage("");
      setTimeout(() => setSaveMessage(""), 3000);
      
      if (!mapId && data?.id) {
        router.push(`/map/${data.id}`);
      }

      return data;
    } catch (error) {
      console.error('Save error:', error);
      setSaveMessage(`Error: ${error.message}`);
      setTimeout(() => setSaveMessage(""), 5000);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save every 10 seconds
  useEffect(() => {
    if (mapId) {
      const autoSaveTimer = setInterval(() => {
        if (nodes.length > 0 || connections.length > 0) {
          saveMindMap().catch(console.error);
        }
      }, 10000);

      return () => clearInterval(autoSaveTimer);
    }
  }, [nodes, connections, mapId]);

  // Grid drawing effect
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

      for (let x = 0; x <= canvas.width; x += size) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

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

  // Render node based on its type
  const renderNodeShape = (node) => {
    const baseClasses = "w-full h-full flex items-center justify-center p-2";
    const isSelected = selectedNode === node.id;
    const isCollapsed = collapsedNodes.has(node.id);
    const hasChildren = connections.some(conn => conn.from === node.id);

    const commonProps = {
      className: `${baseClasses} ${isSelected ? 'font-medium' : ''}`,
      style: { backgroundColor: node.color }
    };

    switch(node.type) {
      case NODE_TYPES.CIRCLE:
        return (
          <div className="rounded-full border-2 border-gray-300 overflow-hidden" style={{
            width: `${node.width}px`,
            height: `${node.height}px`,
          }}>
            <div {...commonProps}>
              <span className="text-center">{node.text}</span>
              {hasChildren && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapse(node.id);
                  }}
                  className="ml-2 text-xs bg-white rounded-full w-5 h-5 flex items-center justify-center"
                >
                  {isCollapsed ? '+' : '-'}
                </button>
              )}
            </div>
          </div>
        );
      case NODE_TYPES.DIAMOND:
        return (
          <div className="transform rotate-45 border-2 border-gray-300 overflow-hidden" style={{
            width: `${node.width}px`,
            height: `${node.width}px`,
          }}>
            <div className={`${baseClasses} transform -rotate-45`} style={{ width: `${node.width * 1.4}px`, height: `${node.width * 1.4}px` }}>
              <span className="text-center">{node.text}</span>
              {hasChildren && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapse(node.id);
                  }}
                  className="ml-2 text-xs bg-white rounded-full w-5 h-5 flex items-center justify-center"
                >
                  {isCollapsed ? '+' : '-'}
                </button>
              )}
            </div>
          </div>
        );
      case NODE_TYPES.CLOUD:
        return (
          <div className="border-2 border-gray-300 p-2" style={{
            width: `${node.width}px`,
            minHeight: `${node.height}px`,
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          }}>
            <div {...commonProps}>
              <span className="text-center">{node.text}</span>
              {hasChildren && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapse(node.id);
                  }}
                  className="ml-2 text-xs bg-white rounded-full w-5 h-5 flex items-center justify-center"
                >
                  {isCollapsed ? '+' : '-'}
                </button>
              )}
            </div>
          </div>
        );
      default: // RECTANGLE
        return (
          <div className="rounded-lg border-2 border-gray-300" style={{
            width: `${node.width}px`,
            minHeight: `${node.height}px`,
          }}>
            <div {...commonProps}>
              <span className="text-center">{node.text}</span>
              {hasChildren && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapse(node.id);
                  }}
                  className="ml-2 text-xs bg-white rounded-full w-5 h-5 flex items-center justify-center"
                >
                  {isCollapsed ? '+' : '-'}
                </button>
              )}
            </div>
          </div>
        );
    }
  };

  // Filter out collapsed nodes and their children
  const visibleNodes = nodes.filter(node => {
    if (collapsedNodes.has(node.id)) return false;
    
    // Check if any ancestor is collapsed
    let parentId = connections.find(conn => conn.to === node.id)?.from;
    while (parentId) {
      if (collapsedNodes.has(parentId)) return false;
      parentId = connections.find(conn => conn.to === parentId)?.from;
    }
    
    return true;
  });

  // Filter out connections to collapsed nodes
  const visibleConnections = connections.filter(conn => {
    return !collapsedNodes.has(conn.from) && !collapsedNodes.has(conn.to);
  });

  // Node and connection handlers
  const startEditing = (node) => {
    setEditingNode(node.id);
    setEditText(node.text);
  };

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

  const startConnection = (e, node) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIsCreatingConnection(true);
    setConnectionStart(node.id);
    setTempConnection({
      from: { x: node.x + node.width / 2, y: node.y + node.height / 2 },
      to: { x: e.clientX - canvasPosition.x, y: e.clientY - canvasPosition.y },
    });
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
    } else if (isCreatingConnection) {
      setTempConnection({
        ...tempConnection,
        to: {
          x: e.clientX - canvasPosition.x,
          y: e.clientY - canvasPosition.y,
        },
      });
    }
  };

  const endConnection = (e, endNode) => {
    if (!isCreatingConnection) return;
    if (e && e.stopPropagation) e.stopPropagation();

    if (endNode && connectionStart !== endNode.id) {
      setConnections([
        ...connections,
        {
          from: connectionStart,
          to: endNode.id,
        },
      ]);
    }

    setIsCreatingConnection(false);
    setConnectionStart(null);
    setTempConnection(null);
  };

  const handleNodeMouseDown = (e, node) => {
    if (e.stopPropagation) e.stopPropagation();
    setSelectedNode(node.id);
    setIsDraggingNode(true);
    setDragOffset({
      x: e.clientX - node.x - canvasPosition.x,
      y: e.clientY - node.y - canvasPosition.y,
    });
  };

  const handleCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current) {
      setIsDraggingCanvas(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      setSelectedNode(null);
      endConnection(e, null);
      closeNodeMenu();
    }
  };

  const handleMouseUp = () => {
    setIsDraggingNode(false);
    setIsDraggingCanvas(false);
    if (isCreatingConnection) {
      endConnection({}, null);
    }
  };

  const zoomIn = () => setScale((prev) => Math.min(2, prev + 0.1));
  const zoomOut = () => setScale((prev) => Math.max(0.5, prev - 0.1));

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Loading your mind map...</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen bg-gray-100 text-gray-800"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={closeNodeMenu}
    >
      {/* Toolbar */}
      <div className="bg-white p-4 shadow-md flex flex-wrap items-center gap-4">
        <Link href="/" className="text-xl font-bold text-gray-800">
          Home
        </Link>
        
        <input
          type="text"
          value={mapTitle}
          onChange={(e) => setMapTitle(e.target.value)}
          className="px-4 py-2 border rounded"
          placeholder="Map Title"
        />

        {/* Connection Color Picker */}
        <div className="flex items-center gap-2">
          <label>Line Color:</label>
          <input
            type="color"
            value={connectionColor}
            onChange={(e) => setConnectionColor(e.target.value)}
            className="w-8 h-8 cursor-pointer"
          />
        </div>

        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
          onClick={addNode}
          disabled={isSaving}
        >
          + Add Node
        </button>

        <button
          className={`px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer flex items-center ${
            isSaving ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={saveMindMap}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            'Save (Ctrl+S)'
          )}
        </button>

        {selectedNode && (
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer"
            onClick={() => deleteNode(selectedNode)}
            disabled={isSaving}
          >
            Delete (Del)
          </button>
        )}

        <div className="flex items-center space-x-2">
          <button
            className="px-3 py-1 bg-gray-200 rounded cursor-pointer hover:bg-gray-300"
            onClick={zoomOut}
            disabled={isSaving}
          >
            -
          </button>
          <span className="text-sm">{(scale * 100).toFixed(0)}%</span>
          <button
            className="px-3 py-1 bg-gray-200 cursor-pointer rounded hover:bg-gray-300"
            onClick={zoomIn}
            disabled={isSaving}
          >
            +
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className={`px-4 py-2 text-center ${
          saveMessage.includes("Error") ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
        }`}>
          {saveMessage}
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        <canvas
          ref={gridRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        />

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
          {/* Enhanced Connections with curved paths */}
          {visibleConnections.map((conn, i) => {
            const fromNode = nodes.find((n) => n.id === conn.from);
            const toNode = nodes.find((n) => n.id === conn.to);
            if (!fromNode || !toNode) return null;

            const { path } = calculateConnectionPath(fromNode, toNode);

            return (
              <svg
                key={`conn-${i}`}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ zIndex: 0 }}
              >
                <path
                  d={path}
                  stroke={connectionColor}
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                />
              </svg>
            );
          })}

          {/* Temp connection while creating */}
          {isCreatingConnection && tempConnection && (
            <svg
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ zIndex: 10 }}
            >
              <line
                x1={tempConnection.from.x}
                y1={tempConnection.from.y}
                x2={tempConnection.to.x}
                y2={tempConnection.to.y}
                stroke={connectionColor}
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            </svg>
          )}

          {/* Render visible nodes */}
          {visibleNodes.map((node) => (
            <div
              key={node.id}
              className={`absolute select-none ${
                selectedNode === node.id ? "ring-2 ring-blue-500" : ""
              } ${connectionStart === node.id ? "ring-2 ring-purple-500" : ""}`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                zIndex: selectedNode === node.id ? 20 : 10,
                cursor: isCreatingConnection ? "crosshair" : "move",
              }}
              onMouseDown={(e) =>
                isCreatingConnection ? null : handleNodeMouseDown(e, node)
              }
              onMouseUp={(e) =>
                isCreatingConnection ? endConnection(e, node) : null
              }
              onDoubleClick={() => startEditing(node)}
              onContextMenu={(e) => showNodeMenu(e, node.id)}
            >
              {/* Connection handle */}
              <div
                className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2 w-3 h-3 rounded-full bg-purple-500 cursor-crosshair"
                onMouseDown={(e) => startConnection(e, node)}
              />

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
                renderNodeShape(node)
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Node context menu */}
      {nodeMenu.visible && (
        <div 
          className="fixed bg-white shadow-lg rounded-md py-2 z-50"
          style={{
            left: `${nodeMenu.x}px`,
            top: `${nodeMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 font-semibold border-b">Node Options</div>
          <div className="flex flex-col">
            <button 
              className="px-4 py-2 text-left hover:bg-gray-100"
              onClick={() => {
                updateNode(nodeMenu.nodeId, { type: NODE_TYPES.RECTANGLE });
                closeNodeMenu();
              }}
            >
              Set as Rectangle
            </button>
            <button 
              className="px-4 py-2 text-left hover:bg-gray-100"
              onClick={() => {
                updateNode(nodeMenu.nodeId, { type: NODE_TYPES.CIRCLE });
                closeNodeMenu();
              }}
            >
              Set as Circle
            </button>
            <button 
              className="px-4 py-2 text-left hover:bg-gray-100"
              onClick={() => {
                updateNode(nodeMenu.nodeId, { type: NODE_TYPES.DIAMOND });
                closeNodeMenu();
              }}
            >
              Set as Diamond
            </button>
            <button 
              className="px-4 py-2 text-left hover:bg-gray-100"
              onClick={() => {
                updateNode(nodeMenu.nodeId, { type: NODE_TYPES.CLOUD });
                closeNodeMenu();
              }}
            >
              Set as Cloud
            </button>
            <div className="px-4 py-2 border-t">
              <label className="block mb-1">Node Color:</label>
              <input
                type="color"
                value={nodes.find(n => n.id === nodeMenu.nodeId)?.color || DEFAULT_NODE_COLOR}
                onChange={(e) => updateNode(nodeMenu.nodeId, { color: e.target.value })}
                className="w-full h-8 cursor-pointer"
              />
            </div>
            <button 
              className="px-4 py-2 text-left text-red-500 hover:bg-red-50 border-t"
              onClick={() => {
                deleteNode(nodeMenu.nodeId);
                closeNodeMenu();
              }}
            >
              Delete Node
            </button>
          </div>
        </div>
      )}

      <svg className="hidden">
        <defs>
          {/* Enhanced arrowhead marker */}
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={connectionColor} />
          </marker>
        </defs>
      </svg>
    </div>
  );
}