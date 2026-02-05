import { NextRequest, NextResponse } from 'next/server';
import { loadTTFileById, loadAllTTFiles } from '@/app/demo/viewer/lib/tt-loader';
import { getFileLinks } from '@/app/demo/viewer/lib/graph-builder';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const file = await loadTTFileById(params.id);

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Get all files to compute links
    const allFiles = await loadAllTTFiles();
    const { incoming, outgoing } = getFileLinks(allFiles, params.id);

    return NextResponse.json({
      file: {
        id: file.id,
        path: file.path,
        frontmatter: file.frontmatter,
        body: file.body,
      },
      links: {
        incoming: incoming.map(({ file: f, rel }) => ({
          id: f.id,
          title: f.frontmatter.title,
          rel,
        })),
        outgoing: outgoing.map(({ file: f, rel }) => ({
          id: f.id,
          title: f.frontmatter.title,
          rel,
        })),
      },
    });
  } catch (error) {
    console.error('Error loading file:', error);
    return NextResponse.json(
      { error: 'Failed to load file' },
      { status: 500 }
    );
  }
}
