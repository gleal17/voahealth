"use client";

import React, { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface Props {
  value: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

export function DocumentEditor({ value, onChange, editable = true }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    editable,
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

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editable, editor]);

  return (
    <div className="prose max-w-full">
      <div
        className={
          "rounded-xl border border-slate-200 px-3 py-2 shadow-sm dark:border-slate-700 " +
          (editable
            ? "bg-slate-50 dark:bg-slate-800/50"
            : "bg-slate-100/80 dark:bg-slate-800/30")
        }
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default DocumentEditor;
