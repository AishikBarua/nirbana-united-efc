'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useTranslations, useFormatter } from 'next-intl';

interface CommentItem {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

interface PlayerOption {
  id: string;
  name: string;
}

/**
 * A comment thread plus a "sign your comment with @yourname" form, used on
 * both a news post and a gallery photo. There are no visitor accounts on
 * this site, so instead of logging in, a commenter picks their own name
 * from the current squad roster (typing "@" style filters the list) — that
 * choice becomes the public "@Name" byline on their comment. It's a
 * self-declared name, not a verified identity, but it can't be an arbitrary
 * made-up one: the server only accepts a name that's actually on the
 * roster (see app/api/comments/route.ts).
 *
 * New comments don't appear immediately — they go into the admin's
 * moderation queue first (see /admin/comments) and only show up here once
 * approved, so this always fetches and displays APPROVED comments only.
 */
export default function CommentBox({ targetType, targetId }: { targetType: 'NEWS' | 'GALLERY'; targetId: string }) {
  const t = useTranslations('comments');
  const format = useFormatter();

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);

  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [nameQuery, setNameQuery] = useState('');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingComments(true);
    fetch(`/api/comments?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`)
      .then((res) => (res.ok ? res.json() : { comments: [] }))
      .then((data) => {
        if (!cancelled) setComments(Array.isArray(data.comments) ? data.comments : []);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingComments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetType, targetId]);

  useEffect(() => {
    fetch('/api/players')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setPlayers(data.map((p) => ({ id: (p as { id: string }).id, name: (p as { name: string }).name })));
        }
      })
      .catch(() => setPlayers([]));
  }, []);

  const filteredPlayers = (
    nameQuery.trim() ? players.filter((p) => p.name.toLowerCase().includes(nameQuery.trim().toLowerCase())) : players
  ).slice(0, 8);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedName) {
      setError(t('pickNameFirst'));
      return;
    }
    if (!body.trim()) {
      setError(t('emptyComment'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, authorName: selectedName, body }),
      });

      if (res.status === 429) {
        setError(t('tooManyAttempts'));
        return;
      }
      if (!res.ok) {
        setError(t('genericError'));
        return;
      }

      setSubmitted(true);
      setBody('');
      setSelectedName(null);
      setNameQuery('');
    } catch {
      setError(t('genericError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2 className="mb-4 font-display text-lg font-bold text-gold-200">{t('title')}</h2>

      {!loadingComments && comments.length === 0 && <p className="text-sm text-gold-100/40">{t('noComments')}</p>}

      {comments.length > 0 && (
        <ul className="mb-6 flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id} className="card-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-wide text-signal-teal">@{c.authorName}</div>
                <div className="text-[11px] text-gold-100/30">
                  {format.dateTime(new Date(c.createdAt), { dateStyle: 'medium' })}
                </div>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm text-gold-100/80">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {submitted ? (
        <p className="text-sm text-signal-green">{t('submittedNotice')}</p>
      ) : (
        <form onSubmit={handleSubmit} className="card-surface space-y-3 p-4">
          <div className="relative">
            <label className="label-field" htmlFor={`commentAuthor-${targetId}`}>
              {t('yourName')}
            </label>
            <input
              id={`commentAuthor-${targetId}`}
              type="text"
              className="input-field"
              placeholder={t('namePlaceholder')}
              value={selectedName ? `@${selectedName}` : nameQuery}
              onChange={(e) => {
                setSelectedName(null);
                setNameQuery(e.target.value.replace(/^@/, ''));
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              autoComplete="off"
            />
            {showDropdown && !selectedName && filteredPlayers.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gold-400/20 bg-ink-900 shadow-card">
                {filteredPlayers.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-gold-100/80 hover:bg-gold-400/10"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedName(p.name);
                        setNameQuery('');
                        setShowDropdown(false);
                      }}
                    >
                      @{p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="label-field" htmlFor={`commentBody-${targetId}`}>
              {t('yourComment')}
            </label>
            <textarea
              id={`commentBody-${targetId}`}
              className="input-field min-h-[90px] resize-y"
              maxLength={1000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-signal-red">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
            {submitting ? '…' : t('submit')}
          </button>
        </form>
      )}
    </section>
  );
}
