import type { ReactNode } from "react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";

const inertContent = {
  // Navigation is restricted to separately validated server citations.
  // Model-generated links/images cannot fetch content or leave the workspace.
  a: ({ children }: { children?: ReactNode }) => (
    <span className="underline decoration-dotted underline-offset-4">
      {children}
    </span>
  ),
  img: () => null,
};

export default function EvidenceMarkdown() {
  return (
    <MarkdownTextPrimitive
      className="asst-markdown"
      smooth={false}
      skipHtml
      remarkPlugins={[remarkGfm]}
      components={inertContent}
    />
  );
}
