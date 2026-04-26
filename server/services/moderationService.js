const crypto = require('crypto');
const OpenAI = require('openai');
const ModerationLog = require('../models/ModerationLog');
const logger = require('../utils/logger');

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /(?:(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?){1}\d{3}[\s.-]?\d{4})/g;
const URL_REGEX = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const SOCIAL_PLATFORM_REGEX = /\b(?:discord(?:app)?\.com|discord\.gg|t\.me|telegram\.me|telegram\.org|wa\.me|whatsapp\.com|snapchat\.com|instagram\.com|tiktok\.com|facebook\.com|fb\.me|x\.com|twitter\.com|reddit\.com|youtube\.com|youtu\.be)\b/gi;

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const REDACTION_PATTERNS = [
  { regex: EMAIL_REGEX, replacement: '[REDACTED_EMAIL]' },
  { regex: PHONE_REGEX, replacement: '[REDACTED_PHONE]' },
  { regex: URL_REGEX, replacement: '[REDACTED_URL]' },
];

const CRITICAL_CATEGORY_PREFIXES = ['self-harm', 'sexual/minors'];

const toHash = (value) =>
  crypto.createHash('sha256').update(value, 'utf8').digest('hex');

const redactText = (text) => {
  let redacted = text;
  for (const { regex, replacement } of REDACTION_PATTERNS) {
    redacted = redacted.replace(regex, replacement);
  }
  return redacted.slice(0, 500);
};

const extractRegexFlags = (text) => {
  const flags = [];

  if (EMAIL_REGEX.test(text)) flags.push('pii:email');
  if (PHONE_REGEX.test(text)) flags.push('pii:phone');
  if (URL_REGEX.test(text)) flags.push('pii:url');
  if (SOCIAL_PLATFORM_REGEX.test(text)) flags.push('off_platform:social_or_chat_link');

  return flags;
};

const extractOpenAIFlags = (moderationResult) => {
  const flags = [];
  const categories = moderationResult?.categories || {};

  for (const [category, flagged] of Object.entries(categories)) {
    if (flagged === true) {
      flags.push(`openai:${category}`);
    }
  }

  return flags;
};

const hasCriticalFlags = (flags) =>
  flags.some((flag) =>
    CRITICAL_CATEGORY_PREFIXES.some((prefix) => flag.startsWith(`openai:${prefix}`))
  );

const moderateText = async (text, userId = null, context = 'unspecified') => {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return { allowed: true, flags: [] };
  }

  const normalizedText = text.trim();
  const flags = extractRegexFlags(normalizedText);
  let openaiModerationResult = null;

  if (openaiClient) {
    try {
      const moderationResponse = await openaiClient.moderations.create({
        model: 'omni-moderation-latest',
        input: normalizedText,
      });
      openaiModerationResult = moderationResponse?.results?.[0] || null;
      flags.push(...extractOpenAIFlags(openaiModerationResult));
    } catch (error) {
      logger.error('OpenAI moderation request failed', {
        error: error.message,
        userId: userId || null,
        context,
      });
      flags.push('openai:request_failed');
    }
  } else {
    flags.push('openai:api_key_missing');
  }

  const uniqueFlags = [...new Set(flags)];
  const allowed = !hasCriticalFlags(uniqueFlags);

  if (uniqueFlags.length > 0) {
    try {
      await ModerationLog.create({
        user: userId || null,
        context,
        flags: uniqueFlags,
        allowed,
        textHash: toHash(normalizedText),
        redactedExcerpt: redactText(normalizedText),
        metadata: {
          openaiFlagged: openaiModerationResult?.flagged ?? null,
          openaiCategoryScores: openaiModerationResult?.category_scores || {},
        },
      });
    } catch (logError) {
      logger.error('Failed to persist moderation log entry', {
        error: logError.message,
        userId: userId || null,
        context,
      });
    }
  }

  return { allowed, flags: uniqueFlags };
};

module.exports = {
  moderateText,
};
