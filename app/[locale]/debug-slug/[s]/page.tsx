// Temporary diagnostic page used once to track down a Bengali-slug 404 bug.
// The bug is fixed (see lib/services/playerService.ts). This file is inert
// and safe to delete along with its parent "debug-slug" folder.
import { notFound } from 'next/navigation';
export default function DebugSlugPage() {
  notFound();
}
