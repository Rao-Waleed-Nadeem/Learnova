import React, { useState } from 'react';
import { MermaidDiagram } from './MermaidDiagram';
import {
  Copy,
  Check,
  Info,
  Lightbulb,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Terminal,
} from 'lucide-react';

interface RichMarkdownRendererProps {
  content: string;
  className?: string;
}

export const RichMarkdownRenderer: React.FC<RichMarkdownRendererProps> = ({
  content,
  className = '',
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Split content by code fences (```)
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inList = false;
    let listItems: React.ReactNode[] = [];

    const flushList = () => {
      if (inList && listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="my-2 space-y-1 pl-4 list-disc text-gray-700 dark:text-gray-300">
            {listItems}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, lIdx) => {
      const trimmed = line.trim();

      // Empty line
      if (!trimmed) {
        flushList();
        return;
      }

      // Blockquotes / Alerts (> [!NOTE], etc.)
      if (trimmed.startsWith('>')) {
        flushList();
        const quoteContent = trimmed.replace(/^>\s*/, '');
        let alertType: 'note' | 'tip' | 'warning' | 'quote' = 'quote';
        let alertText = quoteContent;

        if (quoteContent.startsWith('[!NOTE]')) {
          alertType = 'note';
          alertText = quoteContent.replace('[!NOTE]', '').trim();
        } else if (quoteContent.startsWith('[!TIP]')) {
          alertType = 'tip';
          alertText = quoteContent.replace('[!TIP]', '').trim();
        } else if (quoteContent.startsWith('[!WARNING]') || quoteContent.startsWith('[!CRITICAL]')) {
          alertType = 'warning';
          alertText = quoteContent.replace(/\[!(WARNING|CRITICAL)\]/, '').trim();
        }

        elements.push(
          <div
            key={`quote-${lIdx}`}
            className={`my-3 p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed flex items-start gap-2.5 ${
              alertType === 'tip'
                ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : alertType === 'warning'
                ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                : alertType === 'note'
                ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                : 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
            }`}
          >
            {alertType === 'tip' && <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />}
            {alertType === 'warning' && <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
            {alertType === 'note' && <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />}
            {alertType === 'quote' && <Flame className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />}
            <div className="flex-1 font-medium">{renderInlineStyles(alertText)}</div>
          </div>
        );
        return;
      }

      // Headings
      if (trimmed.startsWith('#### ')) {
        flushList();
        elements.push(
          <h4 key={`h4-${lIdx}`} className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mt-3 mb-1 uppercase tracking-wide">
            {renderInlineStyles(trimmed.replace('#### ', ''))}
          </h4>
        );
        return;
      }
      if (trimmed.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={`h3-${lIdx}`} className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white mt-4 mb-2 flex items-center gap-2">
            {renderInlineStyles(trimmed.replace('### ', ''))}
          </h3>
        );
        return;
      }
      if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={`h2-${lIdx}`} className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-5 mb-2.5 border-b border-gray-100 dark:border-gray-800 pb-1">
            {renderInlineStyles(trimmed.replace('## ', ''))}
          </h2>
        );
        return;
      }

      // Unordered lists (- or *)
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        inList = true;
        const itemText = trimmed.replace(/^[-*]\s+/, '');
        listItems.push(
          <li key={`li-${lIdx}`} className="text-xs sm:text-sm leading-relaxed">
            {renderInlineStyles(itemText)}
          </li>
        );
        return;
      }

      // Numbered lists (1. , 2. )
      if (/^\d+\.\s+/.test(trimmed)) {
        flushList();
        const num = trimmed.match(/^(\d+)\.\s+/)?.[1];
        const itemText = trimmed.replace(/^\d+\.\s+/, '');
        elements.push(
          <div key={`ol-${lIdx}`} className="flex items-start gap-2 my-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
              {num}
            </span>
            <span className="flex-1 leading-relaxed">{renderInlineStyles(itemText)}</span>
          </div>
        );
        return;
      }

      // Standard paragraph
      flushList();
      elements.push(
        <p key={`p-${lIdx}`} className="my-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {renderInlineStyles(trimmed)}
        </p>
      );
    });

    flushList();
    return elements;
  };

  // Parse inline bold (**), italic (*), code (`), and links
  const renderInlineStyles = (str: string): React.ReactNode => {
    // Regex matching bold, code, and links
    const tokens = str.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g);

    return tokens.map((token, i) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-gray-900 dark:text-white">
            {token.slice(2, -2)}
          </strong>
        );
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 mx-0.5 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-400 font-mono text-[11px] sm:text-xs"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
        const match = token.match(/^\[(.*?)\]\((.*?)\)$/);
        if (match) {
          const [, label, url] = match;
          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 dark:text-indigo-400 underline hover:opacity-80 transition"
            >
              {label}
            </a>
          );
        }
      }
      return token;
    });
  };

  // Primary Block Splitting by code fences
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className={`space-y-1 text-left ${className}`}>
      {parts.map((part, index) => {
        if (!part) return null;

        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract language and code body
          const firstLineBreak = part.indexOf('\n');
          const lang = part.slice(3, firstLineBreak).trim().toLowerCase();
          const code = part.slice(firstLineBreak + 1, -3);

          if (lang === 'mermaid') {
            return <MermaidDiagram key={index} chart={code} />;
          }

          const isCopied = copiedIndex === index;

          return (
            <div
              key={index}
              className="my-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-[#0F1218] text-gray-100 overflow-hidden shadow-xs"
            >
              <div className="px-3.5 py-1.5 bg-[#181C24] border-b border-gray-800 flex items-center justify-between text-xs text-gray-400">
                <span className="font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5 text-indigo-400">
                  <Terminal className="w-3.5 h-3.5" />
                  {lang || 'code'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(code, index)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer"
                  aria-label="Copy code to clipboard"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 font-mono text-xs sm:text-[13px] overflow-x-auto leading-relaxed text-gray-200">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        return <div key={index}>{renderFormattedText(part)}</div>;
      })}
    </div>
  );
};
