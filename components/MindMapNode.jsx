import { useState, useRef } from 'react';

export default function MindMapNode({
  node,
  onUpdateText,
  onDrag,
  onConnect,
  isSelected,
  onSelect,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    onSelect();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      onDrag(node.id, dx, dy);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  return (
    <div
      className={`absolute p-3 rounded-lg border-2 cursor-move select-none
        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}
        ${isDragging ? 'shadow-lg' : ''}`}
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width}px`,
        minHeight: `${node.height}px`,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <input
          type="text"
          value={node.text}
          onChange={(e) => onUpdateText(node.id, e.target.value)}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
          className="w-full outline-none bg-transparent"
          autoFocus
        />
      ) : (
        <div className="w-full h-full">{node.text}</div>
      )}
    </div>
  );
}