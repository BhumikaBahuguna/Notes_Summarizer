import { useEffect, useMemo, useState } from 'react';
import mermaid from 'mermaid';

function MermaidDiagram({ code }) {
  const [svg, setSvg] = useState('');
  const [renderError, setRenderError] = useState('');

  const sanitizeCode = (mermaidCode) => {
    if (!mermaidCode) return '';
    let cleaned = mermaidCode
      .replace(/```mermaid\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    cleaned = cleaned.replace(/\|>/g, '|');
    return cleaned;
  };

  const cleanedCode = useMemo(() => sanitizeCode(code), [code]);

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      if (!cleanedCode) {
        if (isMounted) {
          setSvg('');
          setRenderError('No diagram code available.');
        }
        return;
      }
      try {
        mermaid.initialize({ 
          startOnLoad: false, 
          securityLevel: 'loose',
          theme: 'dark' // Use a dark theme to match the UI
        });
        const renderId = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const { svg: renderedSvg } = await mermaid.render(renderId, cleanedCode);
        if (isMounted) {
          setSvg(renderedSvg);
          setRenderError('');
        }
      } catch (e) {
        if (isMounted) {
          setSvg('');
          setRenderError('Unable to render diagram from generated code.');
        }
      }
    };
    renderDiagram();
    return () => { isMounted = false; };
  }, [cleanedCode]);

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      {renderError ? (
        <p className="text-red-400 text-sm bg-red-500/10 p-4 rounded-xl border border-red-500/20">{renderError}</p>
      ) : (
        <div className="mermaid overflow-x-auto max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      )}
    </div>
  );
}

export default MermaidDiagram;
