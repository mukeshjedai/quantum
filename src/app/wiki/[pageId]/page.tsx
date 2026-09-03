import Link from "next/link";
import { notFound } from "next/navigation";
import { serverFetch } from "@/lib/api";
import type { WikiAttachment, WikiPageResponse } from "@/lib/types";
import WikiContent from "@/components/WikiContent";
import WikiPageFilesPanel from "@/components/WikiPageFilesPanel";
import WikiPageTags from "@/components/WikiPageTags";
import StaticHtmlWikiEmbed from "@/components/StaticHtmlWikiEmbed";
import type { StaticHtmlAnchor } from "@/components/StaticHtmlWikiEmbed";
import WikiComments from "@/components/WikiComments";
import WikiPageNotes from "@/components/WikiPageNotes";
import SingularityTestButton from "@/components/SingularityTestButton";
import WikiBacklinks, { type WikiBacklink } from "@/components/WikiBacklinks";
import SphinxWikiContent from "@/components/SphinxWikiContent";

function pageTags(page: WikiPageResponse["page"]): string[] {
  const raw = page.tags;
  return Array.isArray(raw) ? raw.map(String) : [];
}

function pageAttachments(data: WikiPageResponse): WikiAttachment[] {
  const raw = data.attachments ?? data.page.attachments;
  return Array.isArray(raw) ? (raw as WikiAttachment[]) : [];
}
function pageBacklinks(page: WikiPageResponse["page"]): WikiBacklink[] {
  return Array.isArray(page.backlinks) ? page.backlinks as WikiBacklink[] : [];
}
export default async function WikiPageView({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await params;
  let data: WikiPageResponse;
  try {
    data = await serverFetch<WikiPageResponse>(`/api/wiki/pages/${pageId}`);
  } catch {
    notFound();
  }

  const { page, backend } = data;
  const pageType = page.page_type || "video";
  const tags = pageTags(page);
  const backlinks = pageBacklinks(page);

  if (pageType === "post_notes") {
    return (
      <div className="wrap">
        <WikiPageNotes pageId={page.id} />
        <SingularityTestButton title={String(page.title ?? "Untitled")} content={String(page.body_raw ?? data.body_markdown ?? "")} />
        <WikiBacklinks pageId={page.id} initialBacklinks={backlinks} canCreate />
        <h1 style={{ margin: "0 0 0.5rem" }}>{page.title}</h1>
        <WikiPageTags pageId={page.id} initialTags={tags} />
        <p className="muted">
          <Link href={`/wiki/post-notes?edit=${page.id}`}>Edit this page</Link>
          {" · "}Post notes
          {" · "}
          {page.updated_at ? `Updated ${page.updated_at}` : `Created ${page.created_at}`}
          {" · "}Storage: {backend}
        </p>
        <WikiContent
          content={String(page.body_raw ?? data.body_markdown ?? "")}
          pageType="post_notes"
        />
        <WikiComments pageId={page.id} />
      </div>
    );
  }

  if (pageType === "manual") {
    const attachments = pageAttachments(data);
    const isSphinx = String(page.content_format || "").startsWith("sphinx");
    return (
      <div className="wrap">
        <WikiPageNotes pageId={page.id} />
        <SingularityTestButton title={String(page.title ?? "Untitled")} content={String(data.body_markdown ?? page.body_raw ?? "")} />
        <WikiBacklinks pageId={page.id} initialBacklinks={backlinks} canCreate />
        <h1>{page.title}</h1>
        <WikiPageTags pageId={page.id} initialTags={tags} />
        <WikiPageFilesPanel pageId={page.id} initialAttachments={attachments} />
        <p className="muted">
          <Link href={`/wiki/paste?edit=${page.id}`}>Edit this page</Link>
          {" · "}{isSphinx ? "Sphinx / MyST" : "Paste notes"} · Storage: {backend}
        </p>
        {isSphinx ? (
          <SphinxWikiContent html={data.body_html || ""} title={String(page.title || "Documentation")} />
        ) : (
          <WikiContent
            content={String(data.body_markdown ?? page.body_raw ?? "")}
            pageType="manual"
            pageId={page.id}
          />
        )}
        <WikiComments pageId={page.id} />
      </div>
    );
  }

  if (pageType === "html") {
    return (
      <div className="wrap">
        <WikiPageNotes pageId={page.id} />
        <SingularityTestButton title={String(page.title ?? "Untitled")} content={String(data.body_html ?? "")} />
        <WikiBacklinks pageId={page.id} initialBacklinks={backlinks} />
        <h1>{page.title}</h1>
        <WikiPageTags pageId={page.id} initialTags={tags} />
        <p className="muted">
          <Link href={`/wiki/upload-html?edit=${page.id}`}>Replace HTML</Link>
          {" · "}Storage: {backend}
        </p>
        <div
          className="card wiki-content"
          dangerouslySetInnerHTML={{ __html: data.body_html || "" }}
        />
        <WikiComments pageId={page.id} />
      </div>
    );
  }

  if (pageType === "html_app") {
    return (
      <div className="wrap" style={{ maxWidth: "100%", padding: "1rem" }}>
        <WikiPageNotes pageId={page.id} />
        <SingularityTestButton title={String(page.title ?? "Untitled")} content="" />
        <WikiBacklinks pageId={page.id} initialBacklinks={backlinks} />
        <h1>{page.title}</h1>
        <WikiPageTags pageId={page.id} initialTags={tags} />
        <p className="muted">
          <Link href={`/wiki/html-workspace?edit=${page.id}`}>Replace file</Link>
          {" · "}Storage: {backend}
        </p>
        <StaticHtmlWikiEmbed
          pageId={page.id}
          title={page.title || "Embedded HTML page"}
          documentUrl={data.document_url}
          anchors={Array.isArray(page.html_anchors) ? page.html_anchors as StaticHtmlAnchor[] : []}
        />
        <WikiComments pageId={page.id} />
      </div>
    );
  }

  return (
    <div className="wrap">
      <WikiPageNotes pageId={page.id} />
      <SingularityTestButton title={String(page.title ?? "Untitled")} content={String(data.transcript || page.transcript || data.transcript_html || "")} />
      <WikiBacklinks pageId={page.id} initialBacklinks={backlinks} canCreate />
      <h1>{page.title}</h1>
      <WikiPageTags pageId={page.id} initialTags={tags} />
      <p className="muted">
        Video: {page.video_id} · Storage: {backend}
      </p>
      {data.transcript_html ? (
        <div className="card" dangerouslySetInnerHTML={{ __html: data.transcript_html }} />
      ) : (
        <div className="card">
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{data.transcript || page.transcript}</pre>
        </div>
      )}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Audio</h3>
        {data.hindi_audio_ready ? (
          <p>
            <a href={`/api/wiki/${pageId}/hindi-audio`}>Hindi audio</a>
          </p>
        ) : (
          <p className="muted">Hindi audio not generated yet.</p>
        )}
        <p>
          <a href={`/api/wiki/${pageId}/original-audio`}>Original audio</a>
        </p>
        {data.uploaded_translated_ready ? (
          <p>
            <a href={`/api/wiki/${pageId}/uploaded-translated-audio`}>Uploaded translated audio</a>
          </p>
        ) : null}
      </div>
      <WikiComments pageId={page.id} />
    </div>
  );
}
