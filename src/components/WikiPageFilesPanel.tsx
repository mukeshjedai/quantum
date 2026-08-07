"use client";

import { useState } from "react";
import WikiPageAttachments from "@/components/WikiPageAttachments";
import type { WikiAttachment } from "@/lib/types";

type WikiPageFilesPanelProps = {
  pageId: string;
  initialAttachments: WikiAttachment[];
};

export default function WikiPageFilesPanel({
  pageId,
  initialAttachments,
}: WikiPageFilesPanelProps) {
  const [attachments, setAttachments] = useState(initialAttachments);
  return (
    <WikiPageAttachments pageId={pageId} attachments={attachments} onChange={setAttachments} />
  );
}
