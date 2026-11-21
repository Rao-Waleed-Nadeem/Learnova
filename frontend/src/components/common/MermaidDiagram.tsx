import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, Eye, AlertCircle, FileCode } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

let diagramIdCounter = 0;

/**
 * Robust sanitizer for Mermaid code to prevent parse failures with complex labels,
 * quotes inside link pipes, and unescaped delimiters.
 */
export function sanitizeMermaidCode(raw: string): string {
  if (!raw) return '';
  let code = raw.trim();

  // 1. Strip markdown fences
  code = code.replace(/^```(?:mermaid)?\s*/i, '').replace(/```$/i, '').trim();

  // 2. Fix 'end' keyword followed immediately by a node identifier or edge on same line
  code = code.replace(/\bend\s+([A-Za-z0-9_]+)/g, 'end\n  $1');

  // 3. Fix unescaped double quotes inside |...| pipe link labels:
  // e.g. -->|"=" (points to)| or -->|"something"|
  // In Mermaid, quotes inside pipes must be single quotes or removed.
  code = code.replace(/\|([^|\n]+)\|/g, (_match, label) => {
    const cleanLabel = label.replace(/"/g, "'").trim();
    return `|${cleanLabel}|`;
  });

  // 4. Fix node brackets with unquoted parentheses:
  // e.g. Node[Label (extra info)] -> Node["Label (extra info)"]
  code = code.replace(/([A-Za-z0-9_]+)\[([^"\]\n]*\([^\)]*\)[^"\]\n]*)\]/g, '$1["$2"]');

  // 5. Fix arrow edges that might have malformed spacing
  code = code.replace(/-->\s*\|/g, '-->|');

  return code;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, className = '' }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showCodeFallback, setShowCodeFallback] = useState(false);
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';

  const chartId = useRef(`mermaid-${Date.now()}-${++diagramIdCounter}`).current;

  // Determine diagram type from syntax
  const getDiagramTypeLabel = (code: string): string => {
    const trimmed = code.trim().toLowerCase();
    if (trimmed.startsWith('flowchart') || trimmed.startsWith('graph')) return 'Flowchart';
    if (trimmed.startsWith('sequencediagram')) return 'Sequence Diagram';
    if (trimmed.startsWith('statediagram')) return 'State Diagram';
    if (trimmed.startsWith('classdiagram')) return 'Class Diagram';
    if (trimmed.startsWith('erdiagram')) return 'ER Diagram';
    if (trimmed.startsWith('mindmap')) return 'Mindmap';
    return 'Architecture Diagram';
  };

  useEffect(() => {
    let isCancelled = false;

    const renderChart = async () => {
      if (!chart.trim()) return;

      try {
        setError(null);
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          themeVariables: isDark
            ? {
                primaryColor: '#3156D3',
                primaryTextColor: '#F3F4F6',
                primaryBorderColor: '#4368E8',
                lineColor: '#6B7280',
                secondaryColor: '#1F2937',
                tertiaryColor: '#111827',
                background: '#181C24',
                mainBkg: '#1E232E',
                nodeBorder: '#374151',
                clusterBkg: '#141820',
              }
            : {
                primaryColor: '#E8EEFF',
                primaryTextColor: '#1E293B',
                primaryBorderColor: '#3156D3',
                lineColor: '#64748B',
                secondaryColor: '#F8FAFC',
                tertiaryColor: '#F1F5F9',
                background: '#FFFFFF',
                mainBkg: '#FFFFFF',
                nodeBorder: '#CBD5E1',
                clusterBkg: '#F8FAFC',
              },
        });

        // First pass: sanitize syntax
        const cleanChart = sanitizeMermaidCode(chart);

        // Render diagram to SVG
        const renderId = `render-${chartId}`;
        try {
          const { svg } = await mermaid.render(renderId, cleanChart);
          if (!isCancelled) {
            setSvgContent(svg);
            setShowCodeFallback(false);
          }
        } catch (firstErr: any) {
          // Second pass fallback: strip all quotes from edge pipes and parentheses from nodes
          const simplified = cleanChart
            .replace(/\|[^|\n]+\|/g, (m) => m.replace(/['"()=]/g, ' '))
            .replace(/\["([^"]+)"\]/g, '[$1]');

          try {
            const fallbackId = `render-fb-${chartId}`;
            const { svg } = await mermaid.render(fallbackId, simplified);
            if (!isCancelled) {
              setSvgContent(svg);
              setShowCodeFallback(false);
            }
          } catch (secondErr: any) {
            if (!isCancelled) {
              console.warn('Mermaid rendering notice:', secondErr);
              setError(secondErr?.message || 'Could not compile visual diagram');
              setShowCodeFallback(true);
            }
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('Mermaid initialization notice:', err);
          setError(err?.message || 'Could not initialize diagram engine');
          setShowCodeFallback(true);
        }
      }
    };

    renderChart();

    return () => {
      isCancelled = true;
    };
  }, [chart, isDark, chartId]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(chart.trim());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const typeLabel = getDiagramTypeLabel(chart);

  return (
    <div className={`my-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-[#151922] shadow-xs overflow-hidden ${className}`}>
      {/* Diagram Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 dark:bg-[#1C212B] border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-indigo-500" />
          <span className="font-semibold text-gray-700 dark:text-gray-300">{typeLabel}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
            Vector Rendered
          </span>
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <button
              type="button"
              onClick={() => setShowCodeFallback((prev) => !prev)}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <FileCode className="w-3 h-3" />
              <span>{showCodeFallback ? 'Hide Source' : 'View Source'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition cursor-pointer"
            title="Copy Mermaid source syntax"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SVG Container or Fallback */}
      <div className="p-4 sm:p-6 flex items-center justify-center overflow-x-auto min-h-[140px]">
        {svgContent && !showCodeFallback ? (
          <div
            className="w-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : showCodeFallback || error ? (
          <div className="w-full space-y-3">
            {error && (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Diagram source available (syntax sanitized for readability)</span>
              </div>
            )}
            <pre className="p-4 rounded-xl bg-gray-900 text-gray-100 font-mono text-xs overflow-x-auto">
              {chart.trim()}
            </pre>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-gray-400 animate-pulse">
            <div className="w-3 h-3 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            <span>Rendering visual architecture graph...</span>
          </div>
        )}
      </div>
    </div>
  );
};
