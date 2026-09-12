/** Convert common clipboard formatting to editable Markdown, without importing active HTML. */
export function codeBlock(code: string, language: string, rst = false): string {
  const lang = language.replace(/[^a-zA-Z0-9_+-]/g, "");
  if (rst) return `\n\n.. code-block:: ${lang || "text"}\n\n${code.split("\n").map(line => `   ${line}`).join("\n")}\n\n`;
  const runs = code.match(/`+/g) || [];
  const fence = "`".repeat(Math.max(3, ...runs.map(run => run.length + 1)));
  return `\n\n${fence}${lang}\n${code}\n${fence}\n\n`;
}

export function richHtmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,form,input,button,meta,link").forEach(node => node.remove());
  const safeUrl = (url: string) => /^(https?:\/\/|mailto:|\/[^/]|#)/i.test(url) ? url.replace(/[\s()<>]/g, c => encodeURIComponent(c)) : "";
  const escape = (text: string) => text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/([\\`*_[\]])/g,"\\$1");
  function render(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return escape(node.textContent || "").replace(/\s+/g," ");
    if (!(node instanceof Element)) return "";
    const tag = node.tagName.toLowerCase();
    const inner = () => Array.from(node.childNodes).map(render).join("");
    if (tag === "pre") {
      const language = (node.querySelector("code")?.className || node.className).match(/language-([\w+-]+)/)?.[1] || "";
      return codeBlock(node.textContent || "", language);
    }
    if (tag === "code") {
      const text = node.textContent || "";
      const fence = "`".repeat(Math.max(1,...(text.match(/`+/g)||[]).map(run=>run.length+1)));
      return `${fence} ${text} ${fence}`;
    }
    if (tag === "br") return "  \n";
    if (/^h[1-6]$/.test(tag)) return `\n\n${"#".repeat(Number(tag[1]))} ${inner().trim()}\n\n`;
    if (tag === "strong" || tag === "b") return `**${inner()}**`;
    if (tag === "em" || tag === "i") return `*${inner()}*`;
    if (tag === "del" || tag === "s") return `~~${inner()}~~`;
    if (tag === "a") { const href=safeUrl(node.getAttribute("href") || ""); return href?`[${inner()}](${href})`:inner(); }
    if (tag === "img") { const src=safeUrl(node.getAttribute("src") || ""); return src?`![${escape(node.getAttribute("alt") || "image")}](${src})`:""; }
    if (tag === "ul" || tag === "ol") {
      const start = Number(node.getAttribute("start")) || 1;
      return "\n\n" + Array.from(node.children).filter(child=>child.tagName==="LI").map((child,i)=> {
        const prefix=tag==="ol"?`${start+i}. `:"- ";
        return prefix+Array.from(child.childNodes).map(render).join("").trim().replace(/\n/g,"\n"+" ".repeat(prefix.length));
      }).join("\n")+"\n\n";
    }
    if (tag === "blockquote") return "\n\n"+inner().trim().split("\n").map(line=>"> "+line).join("\n")+"\n\n";
    if (tag === "table") {
      const rows=Array.from(node.querySelectorAll("tr")).map(row=>Array.from(row.children).map(cell=>render(cell).trim().replace(/\|/g,"\\|").replace(/\n+/g," ")));
      if (!rows.length) return "";
      const width=Math.max(...rows.map(row=>row.length));
      const format=(row:string[])=>"| "+Array.from({length:width},(_,i)=>row[i]||"").join(" | ")+" |";
      const hasHeader = Boolean(node.querySelector("tr")?.querySelector("th"));
      const header=hasHeader?rows.shift()!:Array(width).fill("");
      return "\n\n"+[format(header),format(Array(width).fill("---")),...rows.map(format)].join("\n")+"\n\n";
    }
    if (tag === "hr") return "\n\n---\n\n";
    if (["p","div","section","article"].includes(tag)) return "\n\n"+inner()+"\n\n";
    return inner();
  }
  return Array.from(doc.body.childNodes).map(render).join("").trim();
}
