import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const VALID_NAMES = ["creating", "discovering", "maintaining", "frontmatter"];

export async function GET(
  _request: Request,
  { params }: { params: { name: string } }
) {
  const { name } = params;

  if (!VALID_NAMES.includes(name)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "content", "resources", `${name}.md`);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const content = fs.readFileSync(filePath, "utf8");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.md"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
