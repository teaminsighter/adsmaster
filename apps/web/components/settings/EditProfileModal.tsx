'use client';

import { useState, useEffect, useRef } from 'react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; email: string; avatar_url?: string }) => Promise<void>;
  initialData: {
    name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
}

export default function EditProfileModal({ isOpen, onClose, onSave, initialData }: EditProfileModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setAvatarPreview(initialData.avatar_url || null);
    }
  }, [initialData]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setAvatarPreview(initialData.avatar_url || null);
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Image must be less than 2MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Valid email is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        email: email.trim(),
        avatar_url: avatarPreview || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Get initials for avatar fallback
  const getInitials = () => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
        }}
        onClick={onClose}
      />

      {/* Slide-in Panel */}
      <div
        className="slide-panel"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '450px',
          maxWidth: '100vw',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Edit Profile</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  marginBottom: '20px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--error)',
                  color: 'var(--error)',
                  fontSize: '13px',
                }}
              >
                {error}
              </div>
            )}

            {/* Avatar Upload */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '40px',
                    fontWeight: 700,
                    color: 'white',
                    overflow: 'hidden',
                  }}
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    getInitials()
                  )}
                </div>

                {/* Upload/Edit Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--surface-primary)',
                    border: '2px solid var(--border-default)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                  }}
                  title="Upload image"
                >
                  📷
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />

              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Photo
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleRemoveImage}
                    style={{ color: 'var(--error)' }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                JPG, PNG or GIF. Max 2MB.
              </div>
            </div>

            {/* Name Field */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontWeight: 500,
                  marginBottom: '8px',
                  fontSize: '14px',
                }}
              >
                Full Name *
              </label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                style={{ width: '100%' }}
                disabled={saving}
              />
            </div>

            {/* Email Field */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontWeight: 500,
                  marginBottom: '8px',
                  fontSize: '14px',
                }}
              >
                Email Address *
              </label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                style={{ width: '100%' }}
                disabled={saving}
              />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                This email is used for login and notifications
              </div>
            </div>

            {/* Password Change Link */}
            <div
              style={{
                padding: '16px',
                background: 'var(--surface-secondary)',
                borderRadius: '8px',
                marginTop: '24px',
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>Change Password</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Update your password for security
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => alert('Password change is not available in demo mode.')}
              >
                Change Password
              </button>
            </div>
          </div>

          {/* Footer - with padding to avoid chat bot overlap */}
          <div
            style={{
              padding: '16px 24px',
              paddingRight: '90px',
              borderTop: '1px solid var(--border-default)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

    </>
  );
}
