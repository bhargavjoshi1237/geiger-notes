"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
import { toast } from "sonner";
import { Toggle } from "@/components/ui/toggle";

const Toolbar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-surface-dialog">
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        className="data-[state=on]:bg-surface-hover hover:bg-surface-hover text-foreground"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        className="data-[state=on]:bg-surface-hover hover:bg-surface-hover text-foreground"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        className="data-[state=on]:bg-surface-hover hover:bg-surface-hover text-foreground"
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("code")}
        onPressedChange={() => editor.chain().focus().toggleCode().run()}
        className="data-[state=on]:bg-surface-hover hover:bg-surface-hover text-foreground"
      >
        <Code className="h-4 w-4" />
      </Toggle>
      <div className="w-[1px] h-6 bg-surface-hover mx-1 self-center" />
      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        className="data-[state=on]:bg-surface-hover hover:bg-surface-hover text-foreground"
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        className="data-[state=on]:bg-surface-hover hover:bg-surface-hover text-foreground"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("blockquote")}
        onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        className="data-[state=on]:bg-surface-hover hover:bg-surface-hover text-foreground"
      >
        <Quote className="h-4 w-4" />
      </Toggle>
    </div>
  );
};

const DocumentEditor = ({ documentId, onClose, isOpen }) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("saved"); // 'saved', 'saving', 'unsaved', 'local'

  const contentRef = useRef(content);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);

  // Fetch initial content
  useEffect(() => {
    if (!isOpen) return;

    if (!documentId) {
      const localDoc = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "This is a local playground document. Changes stay in this session only.",
              },
            ],
          },
        ],
      };

      setContent(localDoc);
      contentRef.current = localDoc;
      setSaveStatus("local");
      setLoading(false);
      return;
    }

    if (isOpen && documentId) {
      setLoading(true);
      fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/documents?id=${documentId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load document");
          return res.json();
        })
        .then((data) => {
          setContent(data.content);
          contentRef.current = data.content;
        })
        .catch((err) => {
          console.error(err);
          toast.error("Failed to load document");
        })
        .finally(() => {
          setLoading(false);
        });
      }
  }, [isOpen, documentId]);

  const saveDocument = async (currentContent) => {
    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    isSavingRef.current = true;
    setSaveStatus("saving");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/documents`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: documentId,
          content: currentContent,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setSaveStatus("saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save document");
      setSaveStatus("unsaved");
    } finally {
      isSavingRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        // Get the *really* latest content from ref if we had a clearer way,
        // but for now we rely on the debouncer to have fired again or
        // we should re-trigger save with latest editor content.
        // Actually, the debounce mechanism in onUpdate wraps this.
        // If onUpdate fires while saving, debounce timer resets.
        // When timer completes, it calls saveDocument again.
        // If saveDocument is called while isSavingRef is true, we set pendingSaveRef = true.
        // BUT, we need to ensure that when the current save finishes, we check pendingSaveRef.
        // If pending is true, we should save again immediately with latest content.

        // However, getting "latest content" here is tricky without `editor` state.
        // Let's rely on the debounce timer to simply retry after the current save?
        // Or better: The debounce timer basically says "user stopped typing for X ms".
        // If user types continuously, timer keeps resetting.
        // If user stops, save triggers.
        // If save takes long and user types ONE char, timer resets.
        // When timer fires, if save is in progress, we must wait.

        // Let's simplify:
        // Just use a standard debounce. If a save is in progress, queue the next save.
      }
    }
  };

  // Debounced save function
  const debouncedSave = useCallback(
    (() => {
      let timeoutId = null;
      return (newContent) => {
        contentRef.current = newContent; // Update ref immediately
        setSaveStatus("unsaved");

        if (timeoutId) clearTimeout(timeoutId);

        timeoutId = setTimeout(async () => {
          // Perform save
          if (isSavingRef.current) {
            // If already saving, just let the next debounce cycle handle it?
            // No, we might lose the final update if we don't ensure it runs.
            // Actually, if we just wait for the running save to finish, we might have a gap.
            // A simple way is to check in the `finally` block of `saveDocument`.
            // But `saveDocument` needs the content.
            // Let's keep it simple: Just always send the latest contentRef.current when the timeout fires.
            // If a save is overlapping, we can just let it run parallel? No, valid race condition.
            // We should use a queue or a lock.
            await saveDocument(contentRef.current);
          } else {
            await saveDocument(contentRef.current);
          }
        }, 1500); // Increased debounce to 1.5s to be safer
      };
    })(),
    [documentId],
  );

  // Refined save document logic to handle queueing
  const performSave = async (contentToSave) => {
    if (!documentId) {
      setSaveStatus("local");
      return;
    }

    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    isSavingRef.current = true;
    setSaveStatus("saving");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/documents`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: documentId, content: contentToSave }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaveStatus("saved");
    } catch (e) {
      console.error(e);
      setSaveStatus("unsaved");
    } finally {
      isSavingRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        // Save again with latest content
        performSave(contentRef.current);
      }
    }
  };

  // Re-creating the debounce wrapper to use the new performSave
  const handleContentUpdate = useCallback(
    (() => {
      let timeoutId = null;
      return (newContent) => {
        contentRef.current = newContent;
        setSaveStatus(documentId ? "unsaved" : "local");
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          performSave(contentRef.current);
        }, 1000);
      };
    })(),
    [documentId],
  );

  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: content,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            "prose prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] text-foreground p-6",
        },
      },
      onUpdate: ({ editor }) => {
        handleContentUpdate(editor.getJSON());
      },
    },
    [content],
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col bg-surface-dialog text-foreground border-border p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border flex flex-row items-center justify-between space-y-0 shrink-0 bg-surface-dialog">
          <DialogTitle className="text-lg font-medium">
            Document Editor
          </DialogTitle>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              {saveStatus === "saving" && (
                <span className="text-yellow-500 animate-pulse">Saving...</span>
              )}
              {saveStatus === "saved" && (
                <span className="text-green-500">Synced</span>
              )}
              {saveStatus === "unsaved" && (
                <span className="text-muted-foreground">Unsaved changes...</span>
              )}
              {saveStatus === "local" && (
                <span className="text-muted-foreground">Local playground</span>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Toolbar */}
        {!loading && editor && (
          <div className="shrink-0 z-10">
            <Toolbar editor={editor} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto w-full relative bg-surface-dialog">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div
              className="w-full h-full"
              onClick={() => editor?.chain().focus().run()}
            >
              {/* Click wrapper to focus editor anywhere */}
              {editor && (
                <EditorContent editor={editor} className="min-h-full" />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentEditor;
