import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

export default function StreamingText({ content }: { content: string }) {
  return (
    <>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
      <span style={{
        display: 'inline-block',
        width: '8px',
        height: '16px',
        background: 'var(--accent-primary)',
        animation: 'fadeIn 0.5s infinite alternate',
        marginLeft: '4px',
        verticalAlign: 'text-bottom'
      }} />
    </>
  );
}
