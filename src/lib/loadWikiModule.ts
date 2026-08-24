type PostNotesModule = {
  renderPostNotes: (
    container: HTMLElement,
    markdown: string,
  ) => Promise<void>;
};

type EmbedModule = {
  createWikiMarkdown: () => Promise<{ render: (src: string) => string }>;
  renderWikiMarkdown: (markdown: string) => Promise<string>;
};

/**
 * Load applimit wiki ES modules at runtime from /static/.
 * Avoids Turbopack/webpack bundling (fixes __turbopack_context__.x errors).
 */
function runtimeImport<T>(path: string): Promise<T> {
  const loader = new Function(
    "path",
    "return import(path)",
  ) as (path: string) => Promise<T>;
  return loader(path);
}

export function loadWikiPostNotes(): Promise<PostNotesModule> {
  return runtimeImport<PostNotesModule>("/static/wiki_post_notes.js");
}

export function loadWikiEmbed(): Promise<EmbedModule> {
  return runtimeImport<EmbedModule>("/static/wiki_embed.js");
}
