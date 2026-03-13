"use client";

import React, { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface Props {
  value: string;
  onChange: (html: string) => void;
}

export function DocumentEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "";
    if (incoming !== current) {
      editor.commands.setContent(incoming, false);
    }
  }, [value, editor]);

  return (
    <div className="prose max-w-full">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default DocumentEditor;
