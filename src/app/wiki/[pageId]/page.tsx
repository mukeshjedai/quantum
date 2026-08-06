import Link from "next/link";
import { notFound } from "next/navigation";
import { serverFetch } from "@/lib/api";
import type { WikiPageResponse } from "@/lib/types";
import WikiContent from "@/components/WikiContent";

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

  if (pageType === "post_notes") {
    return (
      <div className="wrap">
        <h1 style={{ margin: "0 0 0.5rem" }}>{page.title}</h1>
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
      </div>
    );
  }

  if (pageType === "manual") {
    return (
      <div className="wrap">
        <h1>{page.title}</h1>
        <p className="muted">
          <Link href={`/wiki/paste?edit=${page.id}`}>Edit this page</Link>
          {" · "}Paste notes · Storage: {backend}
        </p>
        <WikiContent
          content={String(data.body_markdown ?? page.body_raw ?? "")}
          pageType="manual"
        />
      </div>
    );
  }

  if (pageType === "html") {
    return (
      <div className="wrap">
        <h1>{page.title}</h1>
        <p className="muted">
          <Link href={`/wiki/upload-html?edit=${page.id}`}>Replace HTML</Link>
          {" · "}Storage: {backend}
        </p>
        <div
          className="card wiki-content"
          dangerouslySetInnerHTML={{ __html: data.body_html || "" }}
        />
      </div>
    );
  }

  if (pageType === "html_app") {
    return (
      <div className="wrap" style={{ maxWidth: "100%", padding: "1rem" }}>
        <h1>{page.title}</h1>
        <p className="muted">
          <Link href={`/wiki/html-workspace?edit=${page.id}`}>Replace file</Link>
          {" · "}Storage: {backend}
        </p>
        <iframe
          title={page.title || "HTML app"}
          src={data.document_url}
          style={{ width: "100%", height: "calc(100vh - 140px)", border: "1px solid #e2e8f0", borderRadius: 8 }}
        />
      </div>
    );
  }

  return (
    <div className="wrap">
      <h1>{page.title}</h1>
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
    </div>
  );
}
