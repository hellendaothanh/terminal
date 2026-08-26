#!/usr/bin/env node
/**
 * Changelog generator for OmniTerminal.
 *
 * Generates English release notes from Conventional Commits between git tags.
 *
 * Usage:
 *   node scripts/generate-changelog.mjs --full [--out CHANGELOG.md]
 *       Regenerate the entire CHANGELOG.md from all v* tags (oldest first).
 *
 *   node scripts/generate-changelog.mjs --latest [--tag vX.Y.Z] [--out FILE]
 *       Print/write the section for a single tag (defaults to the newest tag,
 *       or GITHUB_REF_NAME when running inside GitHub Actions).
 *
 * Commit mapping (Conventional Commits):
 *   feat              -> Features
 *   fix               -> Bug Fixes
 *   perf              -> Performance Improvements
 *   security          -> Security
 *   docs              -> Documentation
 *   refactor          -> Code Refactoring
 *   test              -> Tests
 *   chore(deps)/deps  -> Dependency Updates
 *   chore/build/ci    -> Chores & CI
 *   everything else   -> Other Changes
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

/* ------------------------------ git helpers ------------------------------ */

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function getRepoSlug() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  try {
    const url = git(['remote', 'get-url', 'origin']).trim().replace(/\.git$/i, '');
    // Handles https://github.com/owner/repo, git@github.com:owner/repo, etc.
    const match = url.match(/([^/:]+)[/:]([^/:]+)$/);
    if (match) return `${match[1]}/${match[2]}`;
  } catch {
    /* no origin remote */
  }
  return null;
}

function listVersionTags() {
  const out = git(['tag', '--list', 'v*']);
  if (!out) return [];
  const parse = (t) => t.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  return out
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean)
    .sort((a, b) => {
      const pa = parse(a);
      const pb = parse(b);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] || 0) - (pb[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });
}

function tagDate(tag) {
  try {
    return git(['log', '-1', '--format=%cd', '--date=short', tag]);
  } catch {
    return '';
  }
}

/**
 * @returns {Array<{ hash: string, subject: string }>}
 */
function commitsInRange(fromRef, toRef) {
  const range = fromRef ? `${fromRef}..${toRef}` : toRef;
  let out = '';
  try {
    out = git(['log', '--no-merges', '--format=%h%x1f%s', range]);
  } catch {
    return [];
  }
  if (!out) return [];
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, subject] = line.split('\x1f');
      return { hash, subject };
    })
    .filter(({ subject }) => !isNoise(subject));
}

/** Skip version-bump / housekeeping commits that add nothing to release notes. */
function isNoise(subject) {
  return (
    /^v?\d+\.\d+\.\d+$/.test(subject.trim()) ||
    /^\d+\.\d+\.\d+\s*$/.test(subject) ||
    subject.includes('[skip changelog]')
  );
}

/* -------------------------------- parsing -------------------------------- */

const CATEGORY_ORDER = [
  { key: 'feat', title: 'Features' },
  { key: 'fix', title: 'Bug Fixes' },
  { key: 'perf', title: 'Performance Improvements' },
  { key: 'security', title: 'Security' },
  { key: 'docs', title: 'Documentation' },
  { key: 'refactor', title: 'Code Refactoring' },
  { key: 'test', title: 'Tests' },
  { key: 'deps', title: 'Dependency Updates' },
  { key: 'chore', title: 'Chores & CI' }
];

/** @returns {{ type: string, scope: string|null, subject: string }} */
function parseCommitSubject(raw) {
  const match = raw.match(/^([a-zA-Z]+)(?:\(([^)]*)\))?!?:\s*(.+)$/);
  if (!match) return { type: 'other', scope: null, subject: raw };
  let [, type, scope, subject] = match;
  type = type.toLowerCase();
  // Group dependency bumps together regardless of tooling (dependabot, npm, ...)
  if ((type === 'chore' || type === 'build') && scope && /^(deps|deps-dev|dependencies)$/i.test(scope)) {
    type = 'deps';
    scope = null;
  }
  if (/^revert$/i.test(type)) {
    return { type: 'fix', scope, subject: `Revert: ${subject}` };
  }
  return { type, scope, subject };
}

function categoryFor(type) {
  if (CATEGORY_ORDER.some((c) => c.key === type)) return type;
  if (type === 'build' || type === 'ci') return 'chore';
  return 'other';
}

/* ------------------------------- rendering ------------------------------- */

function commitLink(hash, slug) {
  if (!slug) return `\`${hash}\``;
  return `[\`${hash}\`](https://github.com/${slug}/commit/${hash})`;
}

/**
 * Render one release section ("## [v1.2.3](compare-url) - date").
 */
function renderSection({ tag, previousTag, commits, slug, date }) {
  const compareUrl =
    slug && previousTag
      ? `https://github.com/${slug}/compare/${previousTag}...${tag}`
      : null;
  const headingBase = compareUrl ? `[${tag}](${compareUrl})` : tag;
  const heading = date ? `## ${headingBase} - ${date}` : `## ${headingBase}`;

  const groups = new Map();
  for (const { hash, subject } of commits) {
    const { type, scope, subject: text } = parseCommitSubject(subject);
    const cat = categoryFor(type);
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push({ scope, text, hash });
  }

  let body = '';
  for (const cat of [...CATEGORY_ORDER.map((c) => c.key), 'other']) {
    const items = groups.get(cat);
    if (!items || items.length === 0) continue;
    body += `\n### ${CATEGORY_ORDER.find((c) => c.key === cat)?.title ?? 'Other Changes'}\n\n`;
    for (const item of items) {
      const prefix = item.scope ? `**${item.scope}:** ` : '';
      body += `- ${prefix}${item.text} (${commitLink(item.hash, slug)})\n`;
    }
  }

  if (!body.trim()) {
    body = `\n_Maintenance release with internal improvements._\n`;
  }

  return `${heading}\n${body}`;
}

/* --------------------------------- main ---------------------------------- */

function buildFullChangelog(outFile) {
  const slug = getRepoSlug();
  const tags = listVersionTags();
  if (tags.length === 0) {
    console.error('No v* tags found.');
    process.exit(1);
  }

  const sections = [];
  tags.forEach((tag, i) => {
    const previousTag = i > 0 ? tags[i - 1] : null;
    const commits = commitsInRange(previousTag, tag);
    sections.push(renderSection({ tag, previousTag, commits, slug, date: tagDate(tag) }));
  });

  const content = [
    '# Changelog',
    '',
    'All notable changes to **OmniTerminal** are documented in this file.',
    '',
    'This changelog is auto-generated from [Conventional Commits](https://www.conventionalcommits.org/) by `scripts/generate-changelog.mjs` on every release.',
    '',
    sections.reverse().join('\n'),
    ''
  ].join('\n');

  fs.writeFileSync(path.join(ROOT, outFile), content, 'utf8');
  console.log(`CHANGELOG written to ${outFile} (${tags.length} releases).`);
}

function buildLatestSection(tagArg, outFile) {
  const slug = getRepoSlug() ?? undefined;
  const tags = listVersionTags();
  const tag = tagArg || process.env.GITHUB_REF_NAME || tags[tags.length - 1];
  if (!tag) {
    console.error('No tag specified and no v* tags found.');
    process.exit(1);
  }
  const idx = tags.indexOf(tag);
  const previousTag = idx > 0 ? tags[idx - 1] : null;
  const section = renderSection({
    tag,
    previousTag,
    commits: commitsInRange(previousTag, tag),
    slug,
    date: tagDate(tag)
  });

  if (outFile) {
    fs.writeFileSync(path.isAbsolute(outFile) ? outFile : path.join(ROOT, outFile), section + '\n', 'utf8');
    console.log(`Release notes for ${tag} written to ${outFile}.`);
  } else {
    console.log(section);
  }
}

function main() {
  const args = process.argv.slice(2);
  const getFlagValue = (name) => {
    const i = args.indexOf(name);
    return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : undefined;
  };

  if (args.includes('--latest')) {
    buildLatestSection(getFlagValue('--tag'), getFlagValue('--out'));
  } else {
    buildFullChangelog(getFlagValue('--out') || 'CHANGELOG.md');
  }
}

main();
