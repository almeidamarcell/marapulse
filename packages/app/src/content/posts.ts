import feedbackWidget from "../../../../content/blog/introducing-feedback-widget.md?raw";
import reactionsWidget from "../../../../content/blog/introducing-reactions-widget.md?raw";
import { parseBlogPost, sortPostsByDate, type BlogPost } from "../lib/blog";

const RAW_POSTS = [feedbackWidget, reactionsWidget];

export const BLOG_POSTS: BlogPost[] = sortPostsByDate(RAW_POSTS.map(parseBlogPost));

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
