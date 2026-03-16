"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, ArrowLeft, Calendar, User, FileText, AlertCircle } from "lucide-react";

export default function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blog')
      .then(res => res.json())
      .then(data => setPosts(data.posts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'safety_guide': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'alert': return <Zap className="w-4 h-4 text-red-500" />;
      default: return <FileText className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'safety_guide': return 'Safety Protocol';
      case 'alert': return 'Outage Alert';
      case 'news': return 'Electricity News';
      default: return 'GridGuard Blog';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight">GridGuard Updates</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">Official Announcements</h1>
          <p className="text-slate-400 max-w-xl mx-auto">Latest grid updates, safety protocols, and news curated by the Ethiopian Electric Utility and GridGuard management.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-slate-500 border border-slate-800/50 rounded-2xl bg-slate-900/30">
            No updates have been posted yet. Check back soon!
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <article key={post.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8 hover:bg-slate-900 transition-colors group">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-xs font-semibold rounded-full border border-slate-700">
                    {getTypeIcon(post.type)}
                    <span className="text-slate-300">{getTypeLabel(post.type)}</span>
                  </div>
                  <span className="text-slate-500 text-xs flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors">{post.title}</h2>
                <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-line mb-8">
                  {post.body}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-slate-500 border-t border-slate-800/50 pt-4">
                  <User className="w-4 h-4" />
                  <span>Posted by <span className="font-medium text-slate-300">{post.created_by || 'Admin'}</span></span>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
