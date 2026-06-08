import { useEffect, useMemo, useState } from 'react';
import { IconCheck } from '@tabler/icons-react';
import { Heading, Text, Field, Input, Button, Pill } from '../../components/ui';
import { AvatarUploader } from '../../components/settings/AvatarUploader';
import { useAuth } from '../../hooks/useAuth';
import { updateMe, type UpdateMeBody, type AuthUser } from '../../lib/api/auth';
import { ApiError } from '../../lib/api/client';
import { toast } from '../../lib/toast';
import styles from '@styles/components/settings/Profile.module.scss';

/* /settings/profile — feature-profile-settings V1.
   ────────────────────────────────────────────────
   3 cards: Identity / Contact / Account (read-only).
   Dirty tracking; Save button shows changed-field count.
   Refetches /me after save so topbar avatar + name update everywhere. */
export function Profile() {
  const { user, refetchMe } = useAuth();

  /* Form state — initialized from server user on mount + whenever
     user identity changes (refetchMe completes after save). */
  const [name,       setName]       = useState(user?.name      ?? '');
  const [avatarUrl,  setAvatarUrl]  = useState<string | null>(user?.avatarUrl ?? null);
  const [jobTitle,   setJobTitle]   = useState(user?.jobTitle  ?? '');
  const [bio,        setBio]        = useState(user?.bio       ?? '');
  const [phone,      setPhone]      = useState(user?.phone     ?? '');

  const [saving,     setSaving]     = useState(false);
  const [nameError,  setNameError]  = useState<string | null>(null);

  /* Reset form when user re-fetches (after save). Dependency on
     individual fields (not the user object) so re-fetches that
     return new strings sync the form even with same object shape.
     The setState-in-effect IS intentional here: we're syncing from
     external (server) state into local form state. */
  useEffect(() => {
    if (!user) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setName(user.name);
    setAvatarUrl(user.avatarUrl ?? null);
    setJobTitle(user.jobTitle ?? '');
    setBio(user.bio ?? '');
    setPhone(user.phone ?? '');
    setNameError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.avatarUrl, user?.name, user?.jobTitle, user?.bio, user?.phone]);

  /* Compute the partial PATCH body — only include fields that differ
     from server state. Empty string becomes null for optional fields. */
  const dirtyFields = useMemo(() => buildDirtyPatch(user, {
    name, avatarUrl, jobTitle, bio, phone,
  }), [user, name, avatarUrl, jobTitle, bio, phone]);

  const dirtyCount = Object.keys(dirtyFields).length;
  const isDirty    = dirtyCount > 0;

  const onCancel = () => {
    if (!user) return;
    setName(user.name);
    setAvatarUrl(user.avatarUrl ?? null);
    setJobTitle(user.jobTitle ?? '');
    setBio(user.bio ?? '');
    setPhone(user.phone ?? '');
    setNameError(null);
  };

  const onSave = async () => {
    if (!name.trim()) {
      setNameError('Name is required.');
      return;
    }
    setSaving(true);
    setNameError(null);
    try {
      await updateMe(dirtyFields);
      await refetchMe();
      toast.success('Profile updated');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message
                : err instanceof Error    ? err.message
                : 'Failed to save profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const initials = getInitials(user.name);

  return (
    <div className={styles.tabBody}>
      {/* ── Card 1: Identity ──────────────────────────────────────── */}
      <section className={styles.card}>
        <header className={styles.cardHead}>
          <Heading size="md">Identity</Heading>
          <Text tone="muted" size="sm" className={styles.cardSub}>
            Your name + avatar appear in the top bar, team views, and
            audit logs.
          </Text>
        </header>

        <div className={styles.identityRow}>
          <AvatarUploader
            currentUrl={avatarUrl}
            fallbackInitials={initials}
            onUpload={setAvatarUrl}
            onRemove={() => setAvatarUrl(null)}
            disabled={saving}
          />

          <div className={styles.identityFields}>
            <Field label="Display name" error={nameError ?? undefined}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sabitra Maharjan"
                maxLength={100}
                disabled={saving}
                invalid={!!nameError}
                required
              />
            </Field>

            <Field label="Job title" helper="Optional — shown in team views and invitations.">
              <Input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Marketing Lead"
                maxLength={80}
                disabled={saving}
              />
            </Field>
          </div>
        </div>

        <Field label="Bio" helper="Optional — a short blurb shown on team views.">
          <div className={styles.bioWrap}>
            <textarea
              className={styles.textarea}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 280))}
              placeholder="Coffee + cooking + ideas."
              maxLength={280}
              rows={3}
              disabled={saving}
            />
            <span className={styles.charCounter} aria-live="polite">
              {bio.length} / 280
            </span>
          </div>
        </Field>
      </section>

      {/* ── Card 2: Contact ───────────────────────────────────────── */}
      <section className={styles.card}>
        <header className={styles.cardHead}>
          <Heading size="md">Contact</Heading>
          <Text tone="muted" size="sm" className={styles.cardSub}>
            How we reach you. Email changes need verification — V2.
          </Text>
        </header>

        <Field
          label="Email"
          helper="To change your email, contact support."
        >
          <div className={styles.emailRow}>
            <code className={styles.emailValue}>{user.email}</code>
            {user.emailVerified ? (
              <Pill variant="green" dot>Verified</Pill>
            ) : (
              <Pill variant="amber" dot>Unverified</Pill>
            )}
          </div>
        </Field>

        <Field label="Phone" helper="Optional — for urgent team contact.">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+977 9800 000 000"
            maxLength={30}
            disabled={saving}
          />
        </Field>
      </section>

      {/* ── Card 3: Account info (read-only) ──────────────────────── */}
      <section className={styles.card}>
        <header className={styles.cardHead}>
          <Heading size="md">Account</Heading>
          <Text tone="muted" size="sm" className={styles.cardSub}>
            Set when your account was created. Contact your admin to change role.
          </Text>
        </header>

        <div className={styles.accountGrid}>
          <div className={styles.accountRow}>
            <span className={styles.accountLabel}>Role</span>
            <span className={styles.accountValue}>
              <Pill variant={roleVariant(user.role)} dot>{roleLabel(user.role)}</Pill>
              <Text tone="muted" size="xs" className={styles.accountHint}>
                {roleHint(user.role)}
              </Text>
            </span>
          </div>

          <div className={styles.accountRow}>
            <span className={styles.accountLabel}>Member since</span>
            <span className={styles.accountValue}>
              {user.createdAt ? formatJoinDate(user.createdAt) : '—'}
            </span>
          </div>

          <div className={styles.accountRow}>
            <span className={styles.accountLabel}>Last login</span>
            <span className={styles.accountValue}>
              {user.lastLoginAt ? formatRelative(user.lastLoginAt) : '—'}
            </span>
          </div>
        </div>
      </section>

      {/* ── Save bar ──────────────────────────────────────────────── */}
      <div className={styles.saveBar}>
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={!isDirty || saving}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          leading={saving ? undefined : <IconCheck size={15} />}
          onClick={onSave}
          disabled={!isDirty || saving}
        >
          {saving
            ? 'Saving…'
            : isDirty
              ? `Save changes (${dirtyCount})`
              : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

interface FormState {
  name:      string;
  avatarUrl: string | null;
  jobTitle:  string;
  bio:       string;
  phone:     string;
}

/* Build the partial PATCH body — only changed fields, with empty
   optional strings coerced to null. */
function buildDirtyPatch(user: AuthUser | null | undefined, form: FormState): UpdateMeBody {
  if (!user) return {};
  const out: UpdateMeBody = {};

  if (form.name !== user.name)                                out.name      = form.name;
  if ((form.avatarUrl ?? null) !== (user.avatarUrl ?? null))  out.avatarUrl = form.avatarUrl;
  if (form.jobTitle !== (user.jobTitle ?? ''))                out.jobTitle  = form.jobTitle === '' ? null : form.jobTitle;
  if (form.bio      !== (user.bio      ?? ''))                out.bio       = form.bio      === '' ? null : form.bio;
  if (form.phone    !== (user.phone    ?? ''))                out.phone     = form.phone    === '' ? null : form.phone;

  return out;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function roleLabel(role: AuthUser['role']): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function roleVariant(role: AuthUser['role']): 'green' | 'indigo' | 'amber' | 'gray' {
  if (role === 'owner')  return 'indigo';
  if (role === 'admin')  return 'green';
  if (role === 'member') return 'amber';
  return 'gray';
}

function roleHint(role: AuthUser['role']): string {
  if (role === 'owner')  return 'Full access including billing + agency settings';
  if (role === 'admin')  return 'Full access to all clients + team';
  if (role === 'member') return 'Access to assigned clients only';
  return 'Read-only access';
}

function formatJoinDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long', year: 'numeric',
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

