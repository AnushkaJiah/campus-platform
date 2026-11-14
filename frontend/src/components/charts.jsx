import React, { useEffect, useRef, useState } from 'react';

/* Small dependency-free SVG charts: a line/area chart and a column chart.
   Colours come from CSS classes (see index.css) so they follow light and dark mode. */

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setWidth(Math.max(240, el.clientWidth));
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

// Round axis ticks: 0, 25, 50, 75, 100 and so on.
export function niceScale(max, count = 4) {
  const rough = Math.max(max, 1e-9) / count;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const f = rough / pow;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = [];
  for (let v = 0; v <= top + step / 1000; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { ticks, top };
}

function barPath(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + w - radius} Q${x + w},${y} ${x + w},${y + radius} V${y + h} Z`;
}

function Tooltip({ left, top, width, children }) {
  const clamped = Math.min(Math.max(left, 70), width - 70);
  return (
    <div className="chart-tip" style={{ left: clamped, top }} role="status">
      {children}
    </div>
  );
}

const M = { top: 16, right: 18, bottom: 28, left: 44 };

function Grid({ ticks, y, width, format }) {
  return ticks.map((t) => (
    <g key={t}>
      <line className="chart__grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
      <text className="chart__axis-text" x={M.left - 8} y={y(t) + 4} textAnchor="end">{format(t)}</text>
    </g>
  ));
}

/** data: [{ label, value (number|null), tip }] */
export function LineChart({ data, height = 220, minTop = 0, format = (v) => v, ariaLabel }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const innerW = width - M.left - M.right;
  const innerH = height - M.top - M.bottom;
  const values = data.map((d) => d.value).filter((v) => v != null);
  const { ticks, top } = niceScale(Math.max(minTop, ...values, 0));
  const n = data.length;
  const x = (i) => M.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v) => M.top + innerH - (v / top) * innerH;

  const segments = [];
  let current = [];
  data.forEach((d, i) => {
    if (d.value == null) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push([x(i), y(d.value), i]);
    }
  });
  if (current.length) segments.push(current);
  const linePath = (seg) => seg.map((p, k) => `${k ? 'L' : 'M'}${p[0]},${p[1]}`).join('');
  const areaPath = (seg) => `${linePath(seg)} L${seg[seg.length - 1][0]},${M.top + innerH} L${seg[0][0]},${M.top + innerH} Z`;

  const step = Math.max(1, Math.ceil(n / 6));
  const labelIndexes = data.map((_, i) => i).filter((i) => i % step === 0 && (n - 1 - i >= step * 0.6 || i === n - 1));
  if (!labelIndexes.includes(n - 1) && n - 1 - labelIndexes[labelIndexes.length - 1] >= step * 0.6) labelIndexes.push(n - 1);

  const lastPoint = segments.length ? segments[segments.length - 1][segments[segments.length - 1].length - 1] : null;
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHover(n === 1 ? 0 : Math.round(ratio * (n - 1)));
  };
  const hovered = hover != null ? data[hover] : null;

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        <Grid ticks={ticks} y={y} width={width} format={format} />
        {segments.map((seg) => (
          <g key={seg[0][2]}>
            <path className="chart__area" d={areaPath(seg)} />
            <path className="chart__line" d={linePath(seg)} />
            {seg.length === 1 && <circle className="chart__dot" cx={seg[0][0]} cy={seg[0][1]} r={4} />}
          </g>
        ))}
        {labelIndexes.map((i) => (
          <text key={i} className="chart__axis-text" x={x(i)} y={height - 8} textAnchor="middle">{data[i].label}</text>
        ))}
        {lastPoint && hover == null && <circle className="chart__dot" cx={lastPoint[0]} cy={lastPoint[1]} r={4.5} />}
        {hovered && (
          <g>
            <line className="chart__cross" x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + innerH} />
            {hovered.value != null && <circle className="chart__dot" cx={x(hover)} cy={y(hovered.value)} r={4.5} />}
          </g>
        )}
        <rect x={M.left} y={M.top} width={innerW} height={innerH} fill="transparent"
              onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>
      {hovered && (
        <Tooltip left={x(hover)} top={(hovered.value != null ? y(hovered.value) : M.top + innerH / 2) - 10} width={width}>
          {hovered.tip}
        </Tooltip>
      )}
    </div>
  );
}

/** data: [{ label, value (number|null), tip, highlight }] ; tone: 'navy' | 'amber' */
export function ColumnChart({ data, height = 220, tone = 'navy', labelEvery = 1, format = (v) => v, ariaLabel }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const innerW = width - M.left - M.right;
  const innerH = height - M.top - M.bottom;
  const values = data.map((d) => d.value).filter((v) => v != null);
  const { ticks, top } = niceScale(Math.max(...values, 0));
  const n = data.length;
  const slot = innerW / n;
  const barW = Math.min(26, slot * 0.64);
  const y = (v) => M.top + innerH - (v / top) * innerH;
  const hovered = hover != null ? data[hover] : null;
  const peak = data.findIndex((d) => d.highlight);

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        <Grid ticks={ticks} y={y} width={width} format={format} />
        {data.map((d, i) => {
          if (d.value == null || d.value <= 0) return null;
          const cx = M.left + slot * (i + 0.5);
          const h = M.top + innerH - y(d.value);
          return (
            <path key={d.label + i}
                  className={`chart__bar chart__bar--${d.highlight ? 'gold' : tone} ${hover === i ? 'chart__bar--hover' : ''}`}
                  d={barPath(cx - barW / 2, y(d.value), barW, h, 4)} />
          );
        })}
        {peak >= 0 && data[peak].value != null && (
          <text className="chart__value" x={M.left + slot * (peak + 0.5)} y={y(data[peak].value) - 6} textAnchor="middle">
            {format(data[peak].value)}
          </text>
        )}
        {data.map((d, i) => (i % labelEvery === 0 ? (
          <text key={`l${i}`} className="chart__axis-text" x={M.left + slot * (i + 0.5)} y={height - 8} textAnchor="middle">{d.label}</text>
        ) : null))}
        {data.map((d, i) => (
          <rect key={`h${i}`} x={M.left + slot * i} y={M.top} width={slot} height={innerH} fill="transparent"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}
      </svg>
      {hovered && (
        <Tooltip left={M.left + slot * (hover + 0.5)} top={(hovered.value != null ? y(hovered.value) : M.top + innerH / 2) - 10} width={width}>
          {hovered.tip}
        </Tooltip>
      )}
    </div>
  );
}
