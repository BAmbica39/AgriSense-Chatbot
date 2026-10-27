// Markdown.jsx - renders the small Markdown subset the backend asks Gemini to use:
// headings (#), bullet lists (- or *), numbered lists (1.), **bold** and *italic*.
// Text is rendered through React (never as raw HTML), so replies can't inject markup.

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;

const renderInline = (text) =>
  text.split(INLINE).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*\s][^*]*\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });

const parseBlocks = (text) => {
  const blocks = [];
  let paragraph = [];

  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'p', text: paragraph.join('\n') });
    paragraph = [];
  };
  // Consecutive items (even with blank lines between them) belong to the same list.
  const addItem = (type, item, start) => {
    const last = blocks[blocks.length - 1];
    if (last?.type === type) last.items.push(item);
    else blocks.push({ type, items: [item], start });
  };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    let match;
    if (!line) {
      flush();
    } else if ((match = line.match(/^#{1,6}\s+(.*)$/))) {
      flush();
      blocks.push({ type: 'h', text: match[1] });
    } else if ((match = line.match(/^[-*•]\s+(.*)$/))) {
      flush();
      addItem('ul', match[1]);
    } else if ((match = line.match(/^(\d+)[.)]\s+(.*)$/))) {
      flush();
      addItem('ol', match[2], Number(match[1]));
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
};

const Markdown = ({ text }) =>
  parseBlocks(text).map((block, i) => {
    switch (block.type) {
      case 'h':
        return <h3 key={i}>{renderInline(block.text)}</h3>;
      case 'ul':
        return <ul key={i}>{block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}</ul>;
      case 'ol':
        return <ol key={i} start={block.start}>{block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}</ol>;
      default:
        return <p key={i}>{renderInline(block.text)}</p>;
    }
  });

export default Markdown;
