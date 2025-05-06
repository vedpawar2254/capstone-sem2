export default function ConnectionLine({ from, to }) {
  if (!from || !to) return null;

  const x1 = from.x + from.width / 2;
  const y1 = from.y + from.height / 2;
  const x2 = to.x + to.width / 2;
  const y2 = to.y + to.height / 2;

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
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
  );
}
