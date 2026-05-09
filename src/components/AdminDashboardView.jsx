import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    collection,
    doc,
    getDoc,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';
import { appId, ADMIN_EMAIL_ENDPOINT } from '../constants/firebase';
import { SHARE_BACKGROUNDS } from '../assets/backgrounds';
import {
    AccountIcon,
    ChartColumnIcon,
    InfoIcon,
    RefreshIcon,
    SaveIcon,
    ShareIcon,
    SparklesIcon,
} from './icons';

const DEFAULT_REPLY_SUBJECT = 'Thanks for your Pokemon Team Builder suggestion';
const DEFAULT_REPLY_MESSAGE = 'I really appreciate you taking the time to help improve Pokemon Team Builder. Your feedback helps me decide what to polish next.';
const SUGGESTIONS_LIMIT = 100;

const makeAssetUrl = (assetUrl) => {
    if (!assetUrl || typeof window === 'undefined') return assetUrl || '';
    try {
        return new URL(assetUrl, window.location.origin).href;
    } catch (_) {
        return assetUrl;
    }
};

const brandLogoUrl = () => {
    const base = import.meta.env.BASE_URL || '/';
    return makeAssetUrl(`${base}${base.endsWith('/') ? '' : '/'}LogoCuteGengarRounded.png`);
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
}[char]));

const timestampToDate = (value) => {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
};

const formatDate = (value) => {
    const date = timestampToDate(value);
    if (!date) return 'Unknown date';
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const normalizeSuggestion = (snapshotDoc) => {
    const data = snapshotDoc.data() || {};
    const author = data.author && typeof data.author === 'object' ? data.author : {};
    return {
        id: snapshotDoc.id,
        text: data.text || data.suggestion || '',
        page: data.page || data.source || 'footer',
        pageTitle: data.pageTitle || (data.page ? data.page : 'Footer'),
        source: data.source || (data.page ? 'pageGuide' : 'footer'),
        userId: data.userId || author.userId || null,
        userEmail: data.contactEmail || data.userEmail || data.email || author.email || null,
        displayName: data.displayName || data.nickname || author.displayName || null,
        userAgent: data.userAgent || null,
        createdAt: data.createdAt || null,
        respondedAt: data.respondedAt || null,
        responseSubject: data.responseSubject || '',
        responseMessage: data.responseMessage || '',
        responseRecipientEmail: data.responseRecipientEmail || '',
        responseChannel: data.responseChannel || '',
    };
};

const getAuthorInfo = (suggestion, profileMap) => {
    const profile = suggestion?.userId ? (profileMap[suggestion.userId] || {}) : {};
    const email = suggestion?.userEmail || profile.email || '';
    const displayName = suggestion?.displayName || profile.displayName || '';
    const fallbackName = email ? email.split('@')[0] : 'Anonymous trainer';

    return {
        name: displayName || fallbackName,
        email,
        userId: suggestion?.userId || '',
    };
};

const buildReplyTemplate = ({ suggestion, author, subject, message, background }) => {
    const logoUrl = brandLogoUrl();
    const backgroundUrl = makeAssetUrl(background?.url || SHARE_BACKGROUNDS[0]?.url || '');
    const authorName = author.name || 'Trainer';
    const suggestionText = suggestion?.text || '';
    const pageLabel = suggestion?.pageTitle || suggestion?.page || 'Pokemon Team Builder';
    const replyMessage = message.trim() || DEFAULT_REPLY_MESSAGE;

    const plainText = [
        `Hi ${authorName},`,
        '',
        'Thank you for sending this suggestion to Pokemon Team Builder:',
        `"${suggestionText}"`,
        '',
        replyMessage,
        '',
        `Suggestion context: ${pageLabel}`,
        '',
        'Thanks again,',
        'Enzo',
    ].join('\n');

    const html = `<!doctype html>
<html>
  <body style="margin:0;background:#111827;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#111827;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-radius:18px;overflow:hidden;background:#ffffff;box-shadow:0 20px 45px rgba(0,0,0,0.28);">
            <tr>
              <td style="background-image:linear-gradient(135deg,rgba(17,24,39,0.38),rgba(17,24,39,0.78)),url('${escapeHtml(backgroundUrl)}');background-size:cover;background-position:center;padding:32px 28px;color:#ffffff;">
                <img src="${escapeHtml(logoUrl)}" width="76" alt="Pokemon Team Builder" style="display:block;border:0;margin-bottom:18px;" />
                <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;opacity:0.86;">Pokemon Team Builder</div>
                <h1 style="margin:8px 0 0;font-size:28px;line-height:1.2;font-weight:800;">Thanks for the suggestion</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${escapeHtml(authorName)},</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Thank you for sending this suggestion:</p>
                <div style="margin:0 0 20px;padding:16px 18px;border-left:4px solid #7d65e1;background:#f3f4f6;border-radius:10px;font-size:15px;line-height:1.6;color:#111827;">
                  ${escapeHtml(suggestionText)}
                </div>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;white-space:pre-line;">${escapeHtml(replyMessage)}</p>
                <p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#6b7280;">Suggestion context: ${escapeHtml(pageLabel)}</p>
                <p style="margin:0;font-size:16px;line-height:1.6;">Thanks again,<br />Enzo</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f9fafb;color:#6b7280;font-size:12px;line-height:1.5;">
                You are receiving this because you sent feedback through Pokemon Team Builder.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    return { subject, plainText, html, backgroundUrl, logoUrl };
};

const pickRandomBackgroundId = () => {
    const background = SHARE_BACKGROUNDS[Math.floor(Math.random() * SHARE_BACKGROUNDS.length)] || SHARE_BACKGROUNDS[0];
    return background?.id || '';
};

const getBackgroundById = (id) => SHARE_BACKGROUNDS.find(background => background.id === id) || SHARE_BACKGROUNDS[0];

export function AdminDashboardView({ db, auth, isAdmin, colors, showToast }) {
    const [suggestions, setSuggestions] = useState([]);
    const [profileMap, setProfileMap] = useState({});
    const [selectedId, setSelectedId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('open');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [subject, setSubject] = useState(DEFAULT_REPLY_SUBJECT);
    const [customMessage, setCustomMessage] = useState(DEFAULT_REPLY_MESSAGE);
    const [emailBackgroundId, setEmailBackgroundId] = useState(() => pickRandomBackgroundId());
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [isMarkingResponded, setIsMarkingResponded] = useState(false);

    useEffect(() => {
        if (!db || !isAdmin) return undefined;
        setIsLoading(true);
        setError('');

        const suggestionsQuery = query(
            collection(db, `artifacts/${appId}/suggestions`),
            orderBy('createdAt', 'desc'),
            limit(SUGGESTIONS_LIMIT)
        );

        const unsubscribe = onSnapshot(
            suggestionsQuery,
            (snapshot) => {
                setSuggestions(snapshot.docs.map(normalizeSuggestion));
                setIsLoading(false);
            },
            (err) => {
                console.error('Error loading suggestions:', err);
                setError('Could not load suggestions. Check Firestore permissions for the admin account.');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [db, isAdmin]);

    useEffect(() => {
        if (!db || suggestions.length === 0) return undefined;
        const missingUserIds = Array.from(new Set(suggestions.map(suggestion => suggestion.userId).filter(Boolean)))
            .filter(userId => !profileMap[userId]);

        if (missingUserIds.length === 0) return undefined;

        let cancelled = false;
        Promise.all(missingUserIds.map(async (userId) => {
            try {
                const profileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'preferences');
                const profileSnap = await getDoc(profileRef);
                return [userId, profileSnap.exists() ? profileSnap.data() : {}];
            } catch (_) {
                return [userId, {}];
            }
        })).then((entries) => {
            if (cancelled) return;
            setProfileMap(prev => entries.reduce((next, [userId, profile]) => ({ ...next, [userId]: profile }), prev));
        });

        return () => { cancelled = true; };
    }, [db, suggestions, profileMap]);

    const filteredSuggestions = useMemo(() => {
        const queryText = searchTerm.trim().toLowerCase();
        return suggestions.filter((suggestion) => {
            const isAnswered = Boolean(suggestion.respondedAt);
            if (statusFilter === 'open' && isAnswered) return false;
            if (statusFilter === 'answered' && !isAnswered) return false;
            if (!queryText) return true;

            const author = getAuthorInfo(suggestion, profileMap);
            return [
                suggestion.text,
                suggestion.pageTitle,
                suggestion.page,
                author.name,
                author.email,
                author.userId,
            ].some(value => String(value || '').toLowerCase().includes(queryText));
        });
    }, [profileMap, searchTerm, statusFilter, suggestions]);

    useEffect(() => {
        const firstId = filteredSuggestions[0]?.id || null;
        if (!selectedId || !filteredSuggestions.some(suggestion => suggestion.id === selectedId)) {
            setSelectedId(firstId);
        }
    }, [filteredSuggestions, selectedId]);

    useEffect(() => {
        if (!selectedId) return;
        setSubject(DEFAULT_REPLY_SUBJECT);
        setCustomMessage(DEFAULT_REPLY_MESSAGE);
        setEmailBackgroundId(pickRandomBackgroundId());
    }, [selectedId]);

    const selectedSuggestion = useMemo(
        () => suggestions.find(suggestion => suggestion.id === selectedId) || null,
        [selectedId, suggestions]
    );

    const selectedAuthor = useMemo(
        () => getAuthorInfo(selectedSuggestion, profileMap),
        [profileMap, selectedSuggestion]
    );

    const selectedBackground = useMemo(
        () => getBackgroundById(emailBackgroundId),
        [emailBackgroundId]
    );

    const emailTemplate = useMemo(() => {
        if (!selectedSuggestion) return null;
        return buildReplyTemplate({
            suggestion: selectedSuggestion,
            author: selectedAuthor,
            subject,
            message: customMessage,
            background: selectedBackground,
        });
    }, [customMessage, selectedAuthor, selectedBackground, selectedSuggestion, subject]);

    const plainTextEmail = emailTemplate?.plainText || '';
    const htmlEmail = emailTemplate?.html || '';
    const hasRecipientEmail = Boolean(selectedAuthor.email);

    const stats = useMemo(() => {
        const answered = suggestions.filter(suggestion => suggestion.respondedAt).length;
        const withEmail = suggestions.filter(suggestion => getAuthorInfo(suggestion, profileMap).email).length;
        return {
            total: suggestions.length,
            open: suggestions.length - answered,
            answered,
            withEmail,
        };
    }, [profileMap, suggestions]);

    const copyToClipboard = useCallback(async (value, successMessage) => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            showToast?.(successMessage, 'success');
        } catch (_) {
            showToast?.('Could not copy to clipboard.', 'error');
        }
    }, [showToast]);

    const markSuggestionResponded = useCallback(async (channel = 'manual') => {
        if (!db || !selectedSuggestion || isMarkingResponded) return;
        setIsMarkingResponded(true);
        try {
            await updateDoc(doc(db, `artifacts/${appId}/suggestions`, selectedSuggestion.id), {
                respondedAt: serverTimestamp(),
                responseSubject: subject.trim() || DEFAULT_REPLY_SUBJECT,
                responseMessage: customMessage.trim(),
                responseRecipientEmail: selectedAuthor.email || null,
                responseBackgroundId: selectedBackground?.id || null,
                responseChannel: channel,
            });
            showToast?.('Suggestion marked as answered.', 'success');
        } catch (err) {
            console.error('Failed to mark suggestion as answered:', err);
            showToast?.('Could not update suggestion status.', 'error');
        } finally {
            setIsMarkingResponded(false);
        }
    }, [customMessage, db, isMarkingResponded, selectedAuthor.email, selectedBackground?.id, selectedSuggestion, showToast, subject]);

    const handleOpenMailDraft = useCallback(() => {
        if (!selectedSuggestion || !selectedAuthor.email) {
            showToast?.('No email address captured for this suggestion.', 'warning');
            return;
        }
        const mailtoUrl = `mailto:${encodeURIComponent(selectedAuthor.email)}?subject=${encodeURIComponent(subject.trim() || DEFAULT_REPLY_SUBJECT)}&body=${encodeURIComponent(plainTextEmail)}`;
        window.location.href = mailtoUrl;
    }, [plainTextEmail, selectedAuthor.email, selectedSuggestion, showToast, subject]);

    const handleSendEmail = useCallback(async () => {
        if (!ADMIN_EMAIL_ENDPOINT) {
            handleOpenMailDraft();
            return;
        }
        if (!selectedSuggestion || !selectedAuthor.email || !emailTemplate || isSendingEmail) {
            showToast?.('Pick a suggestion with an email before sending.', 'warning');
            return;
        }

        setIsSendingEmail(true);
        try {
            const token = await auth?.currentUser?.getIdToken?.();
            const response = await fetch(ADMIN_EMAIL_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    appId,
                    to: selectedAuthor.email,
                    subject: subject.trim() || DEFAULT_REPLY_SUBJECT,
                    text: emailTemplate.plainText,
                    html: emailTemplate.html,
                    suggestionId: selectedSuggestion.id,
                    suggestionText: selectedSuggestion.text,
                    message: customMessage.trim(),
                    backgroundId: selectedBackground?.id || null,
                }),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || `Email endpoint returned ${response.status}`);
            }

            if (!result.suggestionUpdated) {
                await markSuggestionResponded('email-endpoint');
            }
            showToast?.('Email sent.', 'success');
        } catch (err) {
            console.error('Failed to send email:', err);
            showToast?.(err.message || 'Could not send email from the endpoint.', 'error');
        } finally {
            setIsSendingEmail(false);
        }
    }, [auth, customMessage, emailTemplate, handleOpenMailDraft, isSendingEmail, markSuggestionResponded, selectedAuthor.email, selectedBackground?.id, selectedSuggestion, showToast, subject]);

    if (!isAdmin) {
        return (
            <div className="rounded-xl p-6 border text-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <p className="font-bold" style={{ color: colors.text }}>Admin access unavailable.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pb-10">
            <section
                className="rounded-2xl p-5 md:p-6 mb-5 overflow-hidden relative border"
                style={{
                    backgroundImage: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 120%)',
                    borderColor: colors.primary,
                    color: '#fff',
                    boxShadow: 'var(--elevation-2)',
                }}
            >
                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <ChartColumnIcon className="w-7 h-7" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-[0.18em] opacity-80 font-semibold">Owner Panel</p>
                            <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">Suggestion Inbox</h2>
                            <p className="text-xs md:text-sm opacity-85 mt-1">Live feedback, user identity, reply draft, and response tracking.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-[min(100%,32rem)]">
                        {[
                            ['Total', stats.total],
                            ['Open', stats.open],
                            ['Answered', stats.answered],
                            ['Email', stats.withEmail],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-lg bg-black/20 px-3 py-2 text-center">
                                <p className="text-[10px] uppercase tracking-wider opacity-75 font-semibold">{label}</p>
                                <p className="text-2xl font-extrabold leading-none mt-1">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(320px,420px)_1fr]">
                <section className="rounded-xl border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    <div className="p-4 border-b" style={{ borderColor: colors.border }}>
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <h3 className="font-bold" style={{ color: colors.text }}>Suggestions</h3>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: colors.textMuted }}>
                                <RefreshIcon className="w-3.5 h-3.5" />
                                Live
                            </span>
                        </div>
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search feedback, user, page..."
                            className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            style={{ backgroundColor: colors.cardLight, borderColor: colors.border, color: colors.text }}
                        />
                        <div className="grid grid-cols-3 gap-2 mt-3">
                            {[
                                ['open', 'Open'],
                                ['answered', 'Answered'],
                                ['all', 'All'],
                            ].map(([value, label]) => {
                                const active = statusFilter === value;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setStatusFilter(value)}
                                        className="px-2 py-1.5 rounded-lg text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        style={{
                                            backgroundColor: active ? colors.primary : colors.cardLight,
                                            color: active ? '#fff' : colors.text,
                                        }}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="max-h-[42rem] overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {isLoading && (
                            <div className="p-4 text-sm rounded-lg" style={{ backgroundColor: colors.cardLight, color: colors.textMuted }}>
                                Loading suggestions...
                            </div>
                        )}
                        {error && (
                            <div className="p-4 text-sm rounded-lg" style={{ backgroundColor: colors.danger + '22', color: colors.danger }}>
                                {error}
                            </div>
                        )}
                        {!isLoading && !error && filteredSuggestions.length === 0 && (
                            <div className="p-5 text-center text-sm rounded-lg" style={{ backgroundColor: colors.cardLight, color: colors.textMuted }}>
                                No suggestions found.
                            </div>
                        )}
                        {filteredSuggestions.map((suggestion) => {
                            const author = getAuthorInfo(suggestion, profileMap);
                            const active = selectedId === suggestion.id;
                            const answered = Boolean(suggestion.respondedAt);
                            return (
                                <button
                                    key={suggestion.id}
                                    type="button"
                                    onClick={() => setSelectedId(suggestion.id)}
                                    className="w-full text-left rounded-lg p-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    style={{
                                        backgroundColor: active ? colors.primary + '22' : colors.cardLight,
                                        border: `1px solid ${active ? colors.primary : 'transparent'}`,
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold truncate" style={{ color: colors.text }}>{author.name}</p>
                                            <p className="text-[11px] truncate" style={{ color: colors.textMuted }}>{author.email || 'No email captured'}</p>
                                        </div>
                                        <span
                                            className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                            style={{ backgroundColor: answered ? colors.success + '22' : colors.warning + '22', color: answered ? colors.success : colors.warning }}
                                        >
                                            {answered ? 'Answered' : 'Open'}
                                        </span>
                                    </div>
                                    <p className="text-xs mt-2 line-clamp-2" style={{ color: colors.text }}>
                                        {suggestion.text || 'Empty suggestion'}
                                    </p>
                                    <div className="flex items-center justify-between gap-2 mt-2 text-[10px]" style={{ color: colors.textMuted }}>
                                        <span className="truncate">{suggestion.pageTitle || suggestion.page}</span>
                                        <span className="shrink-0">{formatDate(suggestion.createdAt)}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="rounded-xl border min-h-[34rem]" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                    {selectedSuggestion ? (
                        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-0">
                            <div className="p-5 md:p-6 border-b lg:border-b-0 lg:border-r" style={{ borderColor: colors.border }}>
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="inline-flex w-9 h-9 rounded-lg items-center justify-center" style={{ backgroundColor: colors.primary + '1A', color: colors.primary }}>
                                                <AccountIcon className="w-5 h-5" />
                                            </span>
                                            <div className="min-w-0">
                                                <h3 className="text-xl font-extrabold truncate" style={{ color: colors.text }}>{selectedAuthor.name}</h3>
                                                <p className="text-xs truncate" style={{ color: colors.textMuted }}>{selectedAuthor.email || 'No email available'}</p>
                                            </div>
                                        </div>
                                        {selectedAuthor.userId && (
                                            <p className="text-[11px] font-mono" style={{ color: colors.textMuted }}>#{selectedAuthor.userId}</p>
                                        )}
                                    </div>
                                    <div className="text-left md:text-right text-xs" style={{ color: colors.textMuted }}>
                                        <p className="font-semibold" style={{ color: colors.text }}>{selectedSuggestion.pageTitle || selectedSuggestion.page}</p>
                                        <p>{formatDate(selectedSuggestion.createdAt)}</p>
                                        {selectedSuggestion.respondedAt && <p>Answered {formatDate(selectedSuggestion.respondedAt)}</p>}
                                    </div>
                                </div>

                                <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: colors.cardLight }}>
                                    <div className="flex items-center gap-2 mb-2" style={{ color: colors.primary }}>
                                        <InfoIcon />
                                        <p className="text-xs uppercase tracking-wider font-bold">Suggestion</p>
                                    </div>
                                    <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap" style={{ color: colors.text }}>
                                        {selectedSuggestion.text || 'Empty suggestion'}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <label className="block">
                                        <span className="block text-xs font-bold mb-1" style={{ color: colors.textMuted }}>Subject</span>
                                        <input
                                            value={subject}
                                            onChange={(event) => setSubject(event.target.value.slice(0, 120))}
                                            className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            style={{ backgroundColor: colors.cardLight, borderColor: colors.border, color: colors.text }}
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="block text-xs font-bold mb-1" style={{ color: colors.textMuted }}>Message</span>
                                        <textarea
                                            value={customMessage}
                                            onChange={(event) => setCustomMessage(event.target.value.slice(0, 1500))}
                                            rows={7}
                                            className="w-full px-3 py-2 rounded-lg text-sm border resize-y focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            style={{ backgroundColor: colors.cardLight, borderColor: colors.border, color: colors.text }}
                                        />
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSendEmail}
                                            disabled={!hasRecipientEmail || isSendingEmail}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-45 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            style={{ backgroundColor: colors.primary }}
                                        >
                                            <ShareIcon />
                                            {ADMIN_EMAIL_ENDPOINT ? (isSendingEmail ? 'Sending...' : 'Send Email') : 'Open Draft'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(htmlEmail, 'HTML email copied.')}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            style={{ backgroundColor: colors.cardLight, color: colors.text }}
                                        >
                                            <SparklesIcon />
                                            Copy HTML
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(plainTextEmail, 'Plain email copied.')}
                                            className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            style={{ backgroundColor: colors.cardLight, color: colors.text }}
                                        >
                                            Copy Text
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => markSuggestionResponded('manual')}
                                            disabled={isMarkingResponded}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-45 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            style={{ backgroundColor: colors.success, color: '#fff' }}
                                        >
                                            <SaveIcon />
                                            {isMarkingResponded ? 'Saving...' : 'Mark Answered'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <aside className="p-5 md:p-6">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <h4 className="font-bold" style={{ color: colors.text }}>Email Preview</h4>
                                    <button
                                        type="button"
                                        onClick={() => setEmailBackgroundId(pickRandomBackgroundId())}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        style={{ backgroundColor: colors.cardLight, color: colors.text }}
                                    >
                                        <RefreshIcon className="w-3.5 h-3.5" />
                                        Shuffle
                                    </button>
                                </div>
                                <div className="rounded-xl overflow-hidden border" style={{ borderColor: colors.border, backgroundColor: '#fff' }}>
                                    <div
                                        className="p-5 text-white min-h-[180px] flex flex-col justify-end"
                                        style={{
                                            backgroundImage: `linear-gradient(135deg, rgba(17, 24, 39, 0.32), rgba(17, 24, 39, 0.78)), url(${selectedBackground?.url})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                        }}
                                    >
                                        <img src={brandLogoUrl()} alt="Pokemon Team Builder" className="w-16 h-auto mb-4" />
                                        <p className="text-[10px] uppercase tracking-[0.18em] font-bold opacity-80">Pokemon Team Builder</p>
                                        <p className="text-2xl font-extrabold leading-tight">Thanks for the suggestion</p>
                                    </div>
                                    <div className="p-5 space-y-3 text-sm leading-relaxed" style={{ color: '#111827' }}>
                                        <p>Hi {selectedAuthor.name},</p>
                                        <p>Thank you for sending this suggestion:</p>
                                        <div className="rounded-lg p-3 border-l-4" style={{ backgroundColor: '#F3F4F6', borderColor: colors.primary }}>
                                            {selectedSuggestion.text || 'Empty suggestion'}
                                        </div>
                                        <p className="whitespace-pre-wrap">{customMessage.trim() || DEFAULT_REPLY_MESSAGE}</p>
                                        <p className="text-xs" style={{ color: '#6B7280' }}>Suggestion context: {selectedSuggestion.pageTitle || selectedSuggestion.page}</p>
                                        <p>Thanks again,<br />Enzo</p>
                                    </div>
                                </div>
                                {!hasRecipientEmail && (
                                    <p className="mt-3 text-xs" style={{ color: colors.warning }}>
                                        This suggestion has no captured email, so only copy actions are available.
                                    </p>
                                )}
                                {!ADMIN_EMAIL_ENDPOINT && hasRecipientEmail && (
                                    <p className="mt-3 text-xs" style={{ color: colors.textMuted }}>
                                        Direct sending needs an email backend endpoint. Draft mode opens your email app with the reply text.
                                    </p>
                                )}
                            </aside>
                        </div>
                    ) : (
                        <div className="h-full min-h-[34rem] flex items-center justify-center p-6 text-center">
                            <div>
                                <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: colors.primary + '1A', color: colors.primary }}>
                                    <ChartColumnIcon className="w-6 h-6" />
                                </div>
                                <p className="font-bold" style={{ color: colors.text }}>No suggestion selected</p>
                                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>Choose a suggestion from the inbox.</p>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default AdminDashboardView;
