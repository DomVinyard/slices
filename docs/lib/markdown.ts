import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import gfm from 'remark-gfm'

const contentDirectory = path.join(process.cwd(), 'content')

export async function getMarkdownContent(slug: string) {
  const fullPath = path.join(contentDirectory, `${slug}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  
  const { data, content } = matter(fileContents)
  
  const processedContent = await remark()
    .use(gfm)
    .use(html, { sanitize: false })
    .process(content)
  
  const contentHtml = processedContent.toString()
  
  return {
    slug,
    contentHtml,
    ...data,
  }
}

export function getAllSlugs(dir: string = '') {
  const fullDir = path.join(contentDirectory, dir)
  
  if (!fs.existsSync(fullDir)) {
    return []
  }
  
  const files = fs.readdirSync(fullDir)
  
  return files
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.replace(/\.md$/, ''))
}

export async function getAllMarkdownContent() {
  const slugs = ['index', 'getting-started', 'spec', 'reference', 'toolkit']
  const contents = await Promise.all(slugs.map(getMarkdownContent))
  return contents
}

export function getRawMarkdownContent(slug: string) {
  const fullPath = path.join(contentDirectory, `${slug}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { content } = matter(fileContents)
  return content.replace(/<div class="callout">[\s\S]*?<\/div>/g, '').trim()
}

export function getAllRawMarkdownContent() {
  const slugs = ['index', 'getting-started', 'spec', 'reference', 'toolkit']
  return slugs.map(getRawMarkdownContent).join('\n\n---\n\n')
}
