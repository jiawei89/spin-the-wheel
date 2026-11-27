/** Tiny renderer for the approved copy's inline markdown: paragraphs split
 *  on blank lines, [label](href) links inside a paragraph. Nothing else. */
import type { ReactNode } from "react";

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function inlineNodes(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  LINK.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LINK.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <a key={key++} href={m[2]}>
        {m[1]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function RichText({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i}>{inlineNodes(p)}</p>
      ))}
    </>
  );
}
