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
import { Heart, Meh, MessageSquareHeart, ThumbsDown, ThumbsUp } from 'lucide-react';
import '../../styles/admin-view.css';
import { appId, ADMIN_EMAIL_ENDPOINT } from '../../constants/firebase';
import { SHARE_BACKGROUNDS } from '../../assets/backgrounds';
import {
    AccountIcon,
    ChartColumnIcon,
    InfoIcon,
    RefreshIcon,
    SaveIcon,
    ShareIcon,
    SparklesIcon,
} from '../icons';
import { useTranslation } from '../../hooks/useTranslation';
import { useFeedbackPulseStore } from '../../store/useFeedbackPulseStore';
import {
    FEEDBACK_REACTIONS,
    FEEDBACK_REACTION_BY_ID,
    FEEDBACK_REACTION_IDS,
    summarizeFeedbackReactions,
} from '../../utils/feedbackPulse';

const DEFAULT_REPLY_MESSAGE = 'I really appreciate you taking the time to help improve PokemonBuilder. Your feedback helps me decide what to polish next.';
const SUGGESTIONS_LIMIT = 150;

const REACTION_ICONS = {
    love: Heart,
    like: ThumbsUp,
    neutral: Meh,
    dislike: ThumbsDown,
};

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
    return makeAssetUrl(`${base}${base.endsWith('/') ? '' : '/'}logo-mascot-256.png`);
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

const formatDate = (value, language) => {
    const date = timestampToDate(value);
    if (!date) return language === 'pt' ? 'Data desconhecida' : 'Unknown date';
    const locale = language === 'pt' ? 'pt-BR' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const normalizeSuggestion = (snapshotDoc) => {
    const data = typeof snapshotDoc.data === 'function' ? (snapshotDoc.data() || {}) : (snapshotDoc || {});
    const author = data.author && typeof data.author === 'object' ? data.author : {};
    const reaction = FEEDBACK_REACTION_IDS.includes(data.reaction) ? data.reaction : null;
    return {
        id: snapshotDoc.id || data.id || '',
        text: data.text || data.suggestion || '',
        reaction,
        campaignVersion: data.campaignVersion || null,
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

const getAuthorInfo = (suggestion, profileMap, language) => {
    const profile = suggestion?.userId ? (profileMap[suggestion.userId] || {}) : {};
    const email = suggestion?.userEmail || profile.email || '';
    const displayName = suggestion?.displayName || profile.displayName || '';
    const fallbackName = email ? email.split('@')[0] : (language === 'pt' ? 'Treinador anônimo' : 'Anonymous trainer');

    return {
        name: displayName || fallbackName,
        email,
        userId: suggestion?.userId || '',
    };
};

const buildReplyTemplate = ({ suggestion, author, subject, message, background, t }) => {
    const logoUrl = brandLogoUrl();
    const backgroundUrl = makeAssetUrl(background?.url || SHARE_BACKGROUNDS[0]?.url || '');
    const authorName = author.name || 'Trainer';
    const reactionLabel = suggestion?.reaction ? t(`feedbackPulse.reactions.${suggestion.reaction}`) : '';
    const suggestionText = suggestion?.text || (reactionLabel ? `[${reactionLabel}]` : '');
    const pageLabel = suggestion?.pageTitle || suggestion?.page || 'PokemonBuilder';
    const defaultMsg = t ? t('admin.defaultMessage') : DEFAULT_REPLY_MESSAGE;
    const replyMessage = message.trim() || defaultMsg;

    const plainText = [
        t ? t('admin.emailGreeting', { name: authorName }) : `Hi ${authorName},`,
        '',
        t ? t('admin.emailThankYou') : 'Thank you for sending this suggestion to PokemonBuilder:',
        `"${suggestionText}"`,
        '',
        replyMessage,
        '',
        `${t ? t('admin.suggestionLabel') : 'Suggestion'} context: ${pageLabel}`,
        '',
        t ? t('admin.emailThanksAgain').replace('\\n', '\n') : 'Thanks again,\nEnzo',
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
                <img src="${escapeHtml(logoUrl)}" width="76" alt="PokemonBuilder" style="display:block;border:0;margin-bottom:18px;" />
                <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;opacity:0.86;">PokemonBuilder</div>
                <h1 style="margin:8px 0 0;font-size:28px;line-height:1.2;font-weight:800;">${t ? t('admin.emailThankYou') : 'Thanks for the suggestion'}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${t ? t('admin.emailGreeting', { name: authorName }) : `Hi ${authorName},`}</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${t ? t('admin.emailThankYou') : 'Thank you for sending this suggestion:'}</p>
                <div style="margin:0 0 20px;padding:16px 18px;border-left:4px solid #7d65e1;background:#f3f4f6;border-radius:10px;font-size:15px;line-height:1.6;color:#111827;">
                  ${escapeHtml(suggestionText)}
                </div>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;white-space:pre-line;">${escapeHtml(replyMessage)}</p>
                <p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#6b7280;">${t ? t('admin.suggestionLabel') : 'Suggestion'} context: ${escapeHtml(pageLabel)}</p>
                <p style="margin:0;font-size:16px;line-height:1.6;">${t ? t('admin.emailThanksAgain').replace(/\n/g, '<br />').replace('\\n', '<br />') : 'Thanks again,<br />Enzo'}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f9fafb;color:#6b7280;font-size:12px;line-height:1.5;">
                ${t ? t('admin.emailFooter') : 'You are receiving this because you sent feedback through PokemonBuilder.'}
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

const getBackgroundById = (id) => SHARE_BACKGROUNDS.find((background) => background.id === id) || SHARE_BACKGROUNDS[0];

const ReactionTag = ({ reaction, t }) => {
    if (!reaction || !FEEDBACK_REACTION_BY_ID[reaction]) return null;
    const meta = FEEDBACK_REACTION_BY_ID[reaction];
    const Icon = REACTION_ICONS[reaction];
    return (
        <span className="admin-rx-tag" style={{ '--rx-tone': meta.tone }}>
            <Icon aria-hidden="true" />
            <span>{t(`feedbackPulse.reactions.${reaction}`)}</span>
        </span>
    );
};

export function AdminDashboardView({ db, auth, isAdmin, showToast }) {
    const { t, language } = useTranslation();
    const [suggestions, setSuggestions] = useState([]);
    const [profileMap, setProfileMap] = useState({});
    const [selectedId, setSelectedId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('open');
    const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'pulse' | 'other'
    const [reactionFilter, setReactionFilter] = useState('all'); // 'all' | 'love' | 'like' | 'neutral' | 'dislike'
    const [detailTab, setDetailTab] = useState('reply'); // 'reply' | 'preview'
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [subject, setSubject] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [emailBackgroundId, setEmailBackgroundId] = useState(() => pickRandomBackgroundId());
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [isMarkingResponded, setIsMarkingResponded] = useState(false);

    useEffect(() => {
        if (!isAdmin) return undefined;
        // Allow headless UI verification scripts to seed mock items when no live admin auth is present.
        if (typeof window !== 'undefined' && Array.isArray(window.__PTB_ADMIN_PREVIEW_ITEMS__)) {
            setSuggestions(window.__PTB_ADMIN_PREVIEW_ITEMS__.map(normalizeSuggestion));
            setIsLoading(false);
            return undefined;
        }
        if (!db) return undefined;

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
                setError(t('admin.loadingError'));
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [db, isAdmin, t]);

    useEffect(() => {
        if (!db || suggestions.length === 0) return undefined;
        if (typeof window !== 'undefined' && Array.isArray(window.__PTB_ADMIN_PREVIEW_ITEMS__)) return undefined;
        const missingUserIds = Array.from(new Set(suggestions.map((suggestion) => suggestion.userId).filter(Boolean)))
            .filter((userId) => !profileMap[userId]);

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
            setProfileMap((prev) => entries.reduce((next, [userId, profile]) => ({ ...next, [userId]: profile }), prev));
        });

        return () => { cancelled = true; };
    }, [db, suggestions, profileMap]);

    const filteredSuggestions = useMemo(() => {
        const queryText = searchTerm.trim().toLowerCase();
        return suggestions.filter((suggestion) => {
            const isAnswered = Boolean(suggestion.respondedAt);
            if (statusFilter === 'open' && isAnswered) return false;
            if (statusFilter === 'answered' && !isAnswered) return false;
            if (sourceFilter === 'pulse' && suggestion.source !== 'pulse') return false;
            if (sourceFilter === 'other' && suggestion.source === 'pulse') return false;
            if (reactionFilter !== 'all' && suggestion.reaction !== reactionFilter) return false;
            if (!queryText) return true;

            const author = getAuthorInfo(suggestion, profileMap, language);
            return [
                suggestion.text,
                suggestion.reaction,
                suggestion.pageTitle,
                suggestion.page,
                author.name,
                author.email,
                author.userId,
            ].some((value) => String(value || '').toLowerCase().includes(queryText));
        });
    }, [profileMap, searchTerm, statusFilter, sourceFilter, reactionFilter, suggestions, language]);

    useEffect(() => {
        const firstId = filteredSuggestions[0]?.id || null;
        if (!selectedId || !filteredSuggestions.some((suggestion) => suggestion.id === selectedId)) {
            setSelectedId(firstId);
        }
    }, [filteredSuggestions, selectedId]);

    useEffect(() => {
        if (!selectedId) return;
        setSubject(t('admin.defaultSubject'));
        setCustomMessage(t('admin.defaultMessage'));
        setEmailBackgroundId(pickRandomBackgroundId());
    }, [selectedId, language, t]);

    const selectedSuggestion = useMemo(
        () => suggestions.find((suggestion) => suggestion.id === selectedId) || null,
        [selectedId, suggestions]
    );

    const selectedAuthor = useMemo(
        () => getAuthorInfo(selectedSuggestion, profileMap, language),
        [profileMap, selectedSuggestion, language]
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
            t,
        });
    }, [customMessage, selectedAuthor, selectedBackground, selectedSuggestion, subject, t]);

    const plainTextEmail = emailTemplate?.plainText || '';
    const htmlEmail = emailTemplate?.html || '';
    const hasRecipientEmail = Boolean(selectedAuthor.email);

    const stats = useMemo(() => {
        const answered = suggestions.filter((suggestion) => suggestion.respondedAt).length;
        const withEmail = suggestions.filter((suggestion) => getAuthorInfo(suggestion, profileMap, language).email).length;
        return {
            total: suggestions.length,
            open: suggestions.length - answered,
            answered,
            withEmail,
        };
    }, [profileMap, suggestions, language]);

    const pulseSummary = useMemo(() => summarizeFeedbackReactions(suggestions), [suggestions]);

    const copyToClipboard = useCallback(async (value, successMessage) => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            showToast?.(successMessage, 'success');
        } catch (_) {
            showToast?.(t('admin.copiedError'), 'error');
        }
    }, [showToast, t]);

    const markSuggestionResponded = useCallback(async (channel = 'manual') => {
        if (!db || !selectedSuggestion || isMarkingResponded) return;
        setIsMarkingResponded(true);
        try {
            const defaultSub = t('admin.defaultSubject');
            await updateDoc(doc(db, `artifacts/${appId}/suggestions`, selectedSuggestion.id), {
                respondedAt: serverTimestamp(),
                responseSubject: subject.trim() || defaultSub,
                responseMessage: customMessage.trim(),
                responseRecipientEmail: selectedAuthor.email || null,
                responseBackgroundId: selectedBackground?.id || null,
                responseChannel: channel,
            });
            showToast?.(t('admin.markAnsweredSuccess'), 'success');
        } catch (err) {
            console.error('Failed to mark suggestion as answered:', err);
            showToast?.(t('admin.markAnsweredError'), 'error');
        } finally {
            setIsMarkingResponded(false);
        }
    }, [customMessage, db, isMarkingResponded, selectedAuthor.email, selectedBackground?.id, selectedSuggestion, showToast, subject, t]);

    const handleOpenMailDraft = useCallback(() => {
        if (!selectedSuggestion || !selectedAuthor.email) {
            showToast?.(t('admin.noEmailToast'), 'warning');
            return;
        }
        const defaultSub = t('admin.defaultSubject');
        const mailtoUrl = `mailto:${encodeURIComponent(selectedAuthor.email)}?subject=${encodeURIComponent(subject.trim() || defaultSub)}&body=${encodeURIComponent(plainTextEmail)}`;
        window.location.href = mailtoUrl;
    }, [plainTextEmail, selectedAuthor.email, selectedSuggestion, showToast, subject, t]);

    const handleSendEmail = useCallback(async () => {
        if (!ADMIN_EMAIL_ENDPOINT) {
            handleOpenMailDraft();
            return;
        }
        if (!selectedSuggestion || !selectedAuthor.email || !emailTemplate || isSendingEmail) {
            showToast?.(t('admin.pickSuggestionToast'), 'warning');
            return;
        }

        setIsSendingEmail(true);
        try {
            const token = await auth?.currentUser?.getIdToken?.();
            const defaultSub = t('admin.defaultSubject');
            const response = await fetch(ADMIN_EMAIL_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    appId,
                    to: selectedAuthor.email,
                    subject: subject.trim() || defaultSub,
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
            showToast?.(t('admin.emailSentSuccess'), 'success');
        } catch (err) {
            console.error('Failed to send email:', err);
            showToast?.(err.message || t('admin.emailSentError'), 'error');
        } finally {
            setIsSendingEmail(false);
        }
    }, [auth, customMessage, emailTemplate, handleOpenMailDraft, isSendingEmail, markSuggestionResponded, selectedAuthor.email, selectedBackground?.id, selectedSuggestion, showToast, subject, t]);

    if (!isAdmin) {
        return (
            <div className="admin-denied">
                <p>{t('admin.accessUnavailable')}</p>
            </div>
        );
    }

    return (
        <div className="admin-view">
            <header className="admin-hero">
                <div className="admin-hero__top">
                    <div className="admin-hero__id">
                        <span className="admin-hero__icon" aria-hidden="true">
                            <ChartColumnIcon />
                        </span>
                        <div>
                            <p className="admin-hero__eyebrow">{t('admin.ownerPanel')}</p>
                            <h2 className="admin-hero__title">{t('admin.suggestionInbox')}</h2>
                            <p className="admin-hero__sub">{t('admin.subtitle')}</p>
                        </div>
                    </div>

                    <div className="admin-hero__tools">
                        <span className="admin-live-pill">
                            <span className="live-dot" aria-hidden="true" />
                            <span>{t('admin.live')}</span>
                        </span>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => useFeedbackPulseStore.getState().open('manual')}
                        >
                            <MessageSquareHeart aria-hidden="true" />
                            {t('admin.previewModalBtn')}
                        </button>
                    </div>
                </div>

                <dl className="admin-stats">
                    {[
                        [t('admin.total'), stats.total],
                        [t('admin.open'), stats.open],
                        [t('admin.answered'), stats.answered],
                        [t('admin.email'), stats.withEmail],
                    ].map(([label, value]) => (
                        <div key={label} className="admin-stat">
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                </dl>
            </header>

            <section className="admin-pulse" aria-label={t('admin.pulseSummaryTitle')}>
                <div className="admin-pulse__head">
                    <h3 className="admin-pulse__title">{t('admin.pulseSummaryTitle')}</h3>
                    <div className="admin-pulse__meta">
                        <span className="admin-pulse__positive">
                            {t('admin.positiveShare', { pct: pulseSummary.positivePct })}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{t('admin.reactionsCount', { n: pulseSummary.withReaction })}</span>
                    </div>
                </div>

                <div className="admin-pulse__bar" aria-hidden="true">
                    {pulseSummary.breakdown.map((entry) => {
                        if (entry.count === 0) return null;
                        const meta = FEEDBACK_REACTION_BY_ID[entry.id];
                        return (
                            <span
                                key={entry.id}
                                className="admin-pulse__seg"
                                style={{
                                    width: `${entry.pct}%`,
                                    '--rx-tone': meta.tone,
                                }}
                            />
                        );
                    })}
                </div>

                <div className="admin-pulse__pills">
                    {FEEDBACK_REACTIONS.map((meta) => {
                        const Icon = REACTION_ICONS[meta.id];
                        const count = pulseSummary.counts[meta.id] || 0;
                        const pct = pulseSummary.withReaction > 0
                            ? Math.round((count / pulseSummary.withReaction) * 100)
                            : 0;
                        const active = reactionFilter === meta.id;
                        return (
                            <button
                                key={meta.id}
                                type="button"
                                className={`admin-rx-pill ${active ? 'is-active' : ''}`}
                                style={{ '--rx-tone': meta.tone }}
                                aria-pressed={active}
                                onClick={() => setReactionFilter((prev) => (prev === meta.id ? 'all' : meta.id))}
                            >
                                <span className="admin-rx-pill__lead">
                                    <span className="admin-rx-pill__icon" aria-hidden="true">
                                        <Icon />
                                    </span>
                                    <span className="admin-rx-pill__label">
                                        {t(`feedbackPulse.reactions.${meta.id}`)}
                                    </span>
                                </span>
                                <span className="admin-rx-pill__count">
                                    {count} ({pct}%)
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            <div className="admin-workspace">
                <section className="admin-inbox" aria-label={t('admin.suggestions')}>
                    <div className="admin-inbox__head">
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder={t('admin.searchPlaceholder')}
                            className="admin-search"
                        />

                        <div className="segmented segmented--sm segmented--block" role="group">
                            {[
                                ['open', t('admin.open')],
                                ['answered', t('admin.answered')],
                                ['all', t('common.all')],
                            ].map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={statusFilter === value}
                                    onClick={() => setStatusFilter(value)}
                                    className="segmented__item"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="admin-chips" role="group">
                            {[
                                ['all', t('admin.sourceAll')],
                                ['pulse', t('admin.sourcePulse')],
                                ['other', t('admin.sourceOther')],
                            ].map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    className={`admin-chip ${sourceFilter === value ? 'is-active' : ''}`}
                                    aria-pressed={sourceFilter === value}
                                    onClick={() => setSourceFilter(value)}
                                >
                                    {label}
                                </button>
                            ))}
                            {reactionFilter !== 'all' && (
                                <button
                                    type="button"
                                    className="admin-chip is-active"
                                    onClick={() => setReactionFilter('all')}
                                >
                                    {t('admin.reactionAll')} ×
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="admin-inbox__list custom-scrollbar">
                        {isLoading && (
                            <p className="admin-note">{t('admin.loading')}</p>
                        )}
                        {error && (
                            <div className="admin-error">{error}</div>
                        )}
                        {!isLoading && !error && filteredSuggestions.length === 0 && (
                            <div className="admin-empty">
                                <p className="admin-empty__sub">{t('admin.noSuggestions')}</p>
                            </div>
                        )}
                        {filteredSuggestions.map((suggestion) => {
                            const author = getAuthorInfo(suggestion, profileMap, language);
                            const active = selectedId === suggestion.id;
                            const answered = Boolean(suggestion.respondedAt);
                            const hasText = Boolean(suggestion.text && suggestion.text.trim());
                            return (
                                <button
                                    key={suggestion.id}
                                    type="button"
                                    onClick={() => setSelectedId(suggestion.id)}
                                    className={`admin-item ${active ? 'is-active' : ''}`}
                                >
                                    <div className="admin-item__top">
                                        <div className="admin-item__author">
                                            <p className="admin-item__name">{author.name}</p>
                                            <p className="admin-item__email">
                                                {author.email || t('admin.noEmailCaptured')}
                                            </p>
                                        </div>
                                        <span className={`admin-status ${answered ? 'is-answered' : 'is-open'}`}>
                                            {answered ? t('admin.answered') : t('admin.open')}
                                        </span>
                                    </div>

                                    {(suggestion.reaction || suggestion.source === 'pulse') && (
                                        <div className="admin-item__badges">
                                            <ReactionTag reaction={suggestion.reaction} t={t} />
                                            <span className="admin-source-tag">
                                                {suggestion.source === 'pulse'
                                                    ? t('admin.sourceBadgePulse')
                                                    : t('admin.sourceBadgeFooter')}
                                            </span>
                                        </div>
                                    )}

                                    <p className={`admin-item__text ${hasText ? '' : 'is-empty'}`}>
                                        {hasText ? suggestion.text : t('admin.reactionOnly')}
                                    </p>

                                    <div className="admin-item__foot">
                                        <span>{suggestion.pageTitle || suggestion.page}</span>
                                        <span>{formatDate(suggestion.createdAt, language)}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="admin-detail">
                    {selectedSuggestion ? (
                        <>
                            <header className="admin-detail__head">
                                <div className="admin-detail__author">
                                    <span className="admin-detail__avatar" aria-hidden="true">
                                        <AccountIcon />
                                    </span>
                                    <div>
                                        <h3 className="admin-detail__name">{selectedAuthor.name}</h3>
                                        <p className="admin-detail__meta">
                                            {selectedAuthor.email || t('admin.noEmailAvailable')}
                                            {selectedAuthor.userId ? ` · #${selectedAuthor.userId.slice(0, 8)}` : ''}
                                        </p>
                                    </div>
                                </div>

                                <div className="admin-detail__right">
                                    <div className="admin-item__badges">
                                        <ReactionTag reaction={selectedSuggestion.reaction} t={t} />
                                        <span className="admin-source-tag">
                                            {selectedSuggestion.source === 'pulse'
                                                ? t('admin.sourceBadgePulse')
                                                : (selectedSuggestion.pageTitle || selectedSuggestion.page)}
                                        </span>
                                    </div>
                                    <span>{formatDate(selectedSuggestion.createdAt, language)}</span>
                                    {selectedSuggestion.respondedAt && (
                                        <span>{t('admin.answeredAt', { date: formatDate(selectedSuggestion.respondedAt, language) })}</span>
                                    )}
                                </div>
                            </header>

                            <div className="admin-detail__body">
                                <div className="admin-quote">
                                    <div className="admin-quote__head">
                                        <span className="admin-quote__label">
                                            <InfoIcon aria-hidden="true" />
                                            <span>{t('admin.suggestionLabel')}</span>
                                        </span>
                                        <ReactionTag reaction={selectedSuggestion.reaction} t={t} />
                                    </div>
                                    <p className={`admin-quote__text ${selectedSuggestion.text?.trim() ? '' : 'is-empty'}`}>
                                        {selectedSuggestion.text?.trim() || t('admin.reactionOnly')}
                                    </p>
                                </div>

                                <div className="admin-studio-bar">
                                    <div className="segmented segmented--sm" role="tablist">
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={detailTab === 'reply'}
                                            className="segmented__item"
                                            onClick={() => setDetailTab('reply')}
                                        >
                                            {t('admin.tabReply')}
                                        </button>
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={detailTab === 'preview'}
                                            className="segmented__item"
                                            onClick={() => setDetailTab('preview')}
                                        >
                                            {t('admin.tabPreview')}
                                        </button>
                                    </div>

                                    {detailTab === 'preview' && (
                                        <button
                                            type="button"
                                            onClick={() => setEmailBackgroundId(pickRandomBackgroundId())}
                                            className="btn btn-secondary btn-sm"
                                        >
                                            <RefreshIcon className="w-3.5 h-3.5" />
                                            {t('admin.shuffle')}
                                        </button>
                                    )}
                                </div>

                                {detailTab === 'reply' ? (
                                    <div className="admin-form">
                                        <label className="admin-field">
                                            <span className="admin-field__label">{t('admin.subjectLabel')}</span>
                                            <input
                                                value={subject}
                                                onChange={(event) => setSubject(event.target.value.slice(0, 120))}
                                                className="admin-input"
                                            />
                                        </label>

                                        <label className="admin-field">
                                            <span className="admin-field__label">{t('admin.messageLabel')}</span>
                                            <textarea
                                                value={customMessage}
                                                onChange={(event) => setCustomMessage(event.target.value.slice(0, 1500))}
                                                rows={6}
                                                className="admin-textarea"
                                            />
                                        </label>

                                        <div className="admin-actions">
                                            <button
                                                type="button"
                                                onClick={handleSendEmail}
                                                disabled={!hasRecipientEmail || isSendingEmail}
                                                className="btn btn-primary btn-sm"
                                            >
                                                <ShareIcon />
                                                {ADMIN_EMAIL_ENDPOINT
                                                    ? (isSendingEmail ? t('admin.sending') : t('admin.sendEmail'))
                                                    : t('admin.openDraft')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(htmlEmail, t('admin.copyHtmlSuccess'))}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                <SparklesIcon />
                                                {t('admin.copyHtml')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(plainTextEmail, t('admin.copyTextSuccess'))}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                {t('admin.copyText')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => markSuggestionResponded('manual')}
                                                disabled={isMarkingResponded}
                                                className="btn btn-secondary btn-sm"
                                            >
                                                <SaveIcon />
                                                {isMarkingResponded ? t('admin.saving') : t('admin.markAnswered')}
                                            </button>
                                        </div>

                                        {!hasRecipientEmail && (
                                            <p className="admin-note admin-note--warning">
                                                {t('admin.noCapturedEmailWarning')}
                                            </p>
                                        )}
                                        {!ADMIN_EMAIL_ENDPOINT && hasRecipientEmail && (
                                            <p className="admin-note">
                                                {t('admin.directSendingNote')}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="admin-email-paper">
                                        <div
                                            className="admin-email-paper__hero"
                                            style={{
                                                backgroundImage: `linear-gradient(135deg, rgba(17, 24, 39, 0.34), rgba(17, 24, 39, 0.78)), url(${selectedBackground?.url})`,
                                            }}
                                        >
                                            <img src={brandLogoUrl()} alt="PokemonBuilder" width={56} height={56} />
                                            <strong>{t('admin.emailThankYou')}</strong>
                                        </div>
                                        <div className="admin-email-paper__body">
                                            <p>{t('admin.emailGreeting', { name: selectedAuthor.name })}</p>
                                            <div className="admin-email-paper__quote">
                                                {selectedSuggestion.text?.trim() || t('admin.reactionOnly')}
                                            </div>
                                            <p>{customMessage.trim() || t('admin.defaultMessage')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="admin-empty">
                            <span className="admin-hero__icon" aria-hidden="true">
                                <ChartColumnIcon />
                            </span>
                            <p className="admin-empty__title">{t('admin.noSuggestionSelected')}</p>
                            <p className="admin-empty__sub">{t('admin.chooseSuggestion')}</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default AdminDashboardView;
