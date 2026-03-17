import { useEffect, useMemo, useState } from 'react';
import mermaid from 'mermaid';
import './MermaidDiagram.css';

function MermaidDiagram({ code }) {
  const [svg, setSvg] = useState('');
  const [renderError, setRenderError] = useState('');

  const sanitizeCode = (mermaidCode) => {
    if (!mermaidCode) return '';

    // Remove markdown code blocks if present
    let cleaned = mermaidCode
      .replace(/```mermaid\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Fix invalid arrow syntax
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
        mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });
        const renderId = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const { svg: renderedSvg } = await mermaid.render(renderId, cleanedCode);

        if (isMounted) {
          setSvg(renderedSvg);
          setRenderError('');
        }
      } catch {
        if (isMounted) {
          setSvg('');
          setRenderError('Unable to render diagram from generated code.');
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [cleanedCode]);

  return (
    <div className="mermaid-diagram">
      {renderError ? (
        <p className="diagram-error">{renderError}</p>
      ) : (
        <div className="mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
      )}
    </div>
  );
}

export default MermaidDiagram;
