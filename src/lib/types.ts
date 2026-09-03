export type WikiPageType =
  | "manual"
  | "post_notes"
  | "html"
  | "html_app"
  | "video"
  | string;

export interface WikiAttachment {
  id: string;
  filename: string;
  size: number;
  content_type?: string;
  uploaded_at?: string;
  url: string;
}

export interface WikiPage {
  id: string;
  title?: string;
  page_type?: WikiPageType;
  body_raw?: string;
  content_format?: "markdown" | "sphinx";
  created_at?: string;
  updated_at?: string;
  video_id?: string;
  transcript?: string;
  summary?: string;
  tags?: string[];
  attachments?: WikiAttachment[];
  [key: string]: unknown;
}

export interface WikiPageResponse {
  page: WikiPage;
  backend: string;
  warning?: string | null;
  attachments?: WikiAttachment[];
  body_markdown?: string;
  body_html?: string;
  document_url?: string;
  transcript?: string;
  transcript_html?: string | null;
  hindi_audio_ready?: boolean;
  uploaded_translated_ready?: boolean;
}

export interface WikiListItem {
  id: string;
  title?: string;
  page_type?: string;
  video_id?: string;
  summary?: string;
  created_at?: string;
  tags?: string[];
}

export interface FolderNode {
  id: string;
  name: string;
  children?: FolderNode[];
  links?: FolderLink[];
}

export interface FolderLink {
  id: string;
  title: string;
  url: string;
  wiki_page_id?: string | null;
}

export interface JobStatus {
  status: string;
  stage?: string;
  progress?: number;
  phase_progress?: number;
  detail?: string;
  error?: string | null;
}
