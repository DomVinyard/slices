import { NextResponse } from 'next/server';
import { getAllRawMarkdownContent } from '@/lib/markdown';

export async function GET() {
  const content = "# slices.info\n\n" + getAllRawMarkdownContent();

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
