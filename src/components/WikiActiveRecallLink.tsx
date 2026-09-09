import Link from "next/link";

export default function WikiActiveRecallLink({ pageId }: { pageId: string }) {
  return <p><Link href={`/exams/active-recall/new?wiki=${encodeURIComponent(pageId)}`}>🧠 Active recall from this page</Link></p>;
}
