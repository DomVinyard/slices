import { NextRequest, NextResponse } from 'next/server';
import { loadAllTTFiles, searchTTFiles } from '@/app/demo/viewer/lib/tt-loader';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  try {
    const files = query
      ? await searchTTFiles(query)
      : await loadAllTTFiles();

    // Return simplified file data for the API
    const response = files.map((file) => ({
      id: file.id,
      title: file.frontmatter.title,
      summary: file.frontmatter.summary,
      kind: file.frontmatter.kind,
      bodyType: file.frontmatter.body?.type,
      linkCount: file.frontmatter.links?.length || 0,
      createdAt: file.frontmatter.created_at,
    }));

    return NextResponse.json({ files: response, count: response.length });
  } catch (error) {
    console.error('Error loading files:', error);
    return NextResponse.json(
      { error: 'Failed to load files' },
      { status: 500 }
    );
  }
}
