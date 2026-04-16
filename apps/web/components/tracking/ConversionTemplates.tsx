'use client';

import { useState } from 'react';
import { Plus, Target, ShoppingCart, UserPlus, MessageSquare, FileDown, Zap, Trash2, X } from 'lucide-react';
import {
  useConversionTemplates,
  createConversionTemplate,
  deleteConversionTemplate,
  type ConversionTemplate,
} from '@/lib/hooks/useApi';

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  lead: <Target size={20} />,
  purchase: <ShoppingCart size={20} />,
  signup: <UserPlus size={20} />,
  demo: <MessageSquare size={20} />,
  download: <FileDown size={20} />,
  custom: <Zap size={20} />,
};

const TEMPLATE_COLORS: Record<string, string> = {
  lead: '#3B82F6',
  purchase: '#10B981',
  signup: '#8B5CF6',
  demo: '#F59E0B',
  download: '#EC4899',
  custom: '#6B7280',
};

interface ConversionTemplatesProps {
  onSelectTemplate: (template: ConversionTemplate) => void;
  selectedTemplateId?: string;
  showCreateButton?: boolean;
}

export default function ConversionTemplates({
  onSelectTemplate,
  selectedTemplateId,
  showCreateButton = true,
}: ConversionTemplatesProps) {
  const { data: templates, loading, refetch } = useConversionTemplates();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    conversion_type: 'lead',
    default_value: '',
    currency: 'USD',
  });

  const getIcon = (template: ConversionTemplate) => {
    const name = template.name.toLowerCase();
    if (name.includes('lead')) return TEMPLATE_ICONS.lead;
    if (name.includes('purchase')) return TEMPLATE_ICONS.purchase;
    if (name.includes('sign') || name.includes('signup')) return TEMPLATE_ICONS.signup;
    if (name.includes('demo')) return TEMPLATE_ICONS.demo;
    if (name.includes('download')) return TEMPLATE_ICONS.download;
    return TEMPLATE_ICONS[template.conversion_type] || TEMPLATE_ICONS.custom;
  };

  const getColor = (template: ConversionTemplate) => {
    const name = template.name.toLowerCase();
    if (name.includes('lead')) return TEMPLATE_COLORS.lead;
    if (name.includes('purchase')) return TEMPLATE_COLORS.purchase;
    if (name.includes('sign') || name.includes('signup')) return TEMPLATE_COLORS.signup;
    if (name.includes('demo')) return TEMPLATE_COLORS.demo;
    if (name.includes('download')) return TEMPLATE_COLORS.download;
    return TEMPLATE_COLORS[template.conversion_type] || TEMPLATE_COLORS.custom;
  };

  const handleCreate = async () => {
    if (!newTemplate.name.trim()) return;

    setCreating(true);
    try {
      const created = await createConversionTemplate({
        name: newTemplate.name,
        description: newTemplate.description || undefined,
        conversion_type: newTemplate.conversion_type,
        default_value: newTemplate.default_value ? parseFloat(newTemplate.default_value) : undefined,
        currency: newTemplate.currency,
      });

      await refetch();
      setShowCreateModal(false);
      setNewTemplate({ name: '', description: '', conversion_type: 'lead', default_value: '', currency: 'USD' });
      onSelectTemplate(created);
    } catch (error) {
      console.error('Failed to create template:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      await deleteConversionTemplate(templateId);
      await refetch();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: '100px',
              background: 'var(--surface-subtle)',
              borderRadius: '12px',
              animation: 'pulse 1.5s infinite',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
        {templates?.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          const color = getColor(template);

          return (
            <div
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              style={{
                padding: '16px',
                background: isSelected ? `${color}15` : 'var(--surface-card)',
                border: `2px solid ${isSelected ? color : 'var(--border-default)'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = color;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                }
              }}
            >
              {/* Delete button for non-default templates */}
              {!template.is_default && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(template.id);
                  }}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                  title="Delete template"
                >
                  <Trash2 size={14} />
                </button>
              )}

              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: `${color}20`,
                  color: color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                {getIcon(template)}
              </div>

              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                {template.name}
              </div>

              {template.description && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                  {template.description.slice(0, 50)}
                  {template.description.length > 50 && '...'}
                </div>
              )}

              {template.default_value && (
                <div style={{ fontSize: '12px', color: color, marginTop: '8px', fontWeight: '500' }}>
                  Default: ${(template.default_value / 1_000_000).toFixed(0)}
                </div>
              )}
            </div>
          );
        })}

        {/* Create New Template Card */}
        {showCreateButton && (
          <div
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '16px',
              background: 'var(--surface-subtle)',
              border: '2px dashed var(--border-default)',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '120px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'var(--surface-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px',
              }}
            >
              <Plus size={20} />
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Create Template
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="card"
            style={{ width: '400px', maxWidth: '90vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3>Create Template</h3>
              <button
                className="btn btn-ghost"
                onClick={() => setShowCreateModal(false)}
                style={{ padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px' }}>Name *</label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Qualified Lead"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px' }}>Description</label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Optional description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px' }}>Type</label>
                <select
                  className="select"
                  style={{ width: '100%' }}
                  value={newTemplate.conversion_type}
                  onChange={(e) => setNewTemplate({ ...newTemplate, conversion_type: e.target.value })}
                >
                  <option value="lead">Lead</option>
                  <option value="purchase">Purchase</option>
                  <option value="signup">Sign Up</option>
                  <option value="add_to_cart">Add to Cart</option>
                  <option value="initiate_checkout">Checkout</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px' }}>Default Value ($)</label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  type="number"
                  placeholder="Optional default value"
                  value={newTemplate.default_value}
                  onChange={(e) => setNewTemplate({ ...newTemplate, default_value: e.target.value })}
                />
              </div>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={creating || !newTemplate.name.trim()}
              >
                {creating ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="card"
            style={{ width: '350px', maxWidth: '90vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <h3>Delete Template?</h3>
            </div>
            <div className="card-body">
              <p style={{ color: 'var(--text-secondary)' }}>
                Are you sure you want to delete this template? This action cannot be undone.
              </p>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </button>
              <button
                className="btn"
                style={{ background: '#EF4444', color: 'white' }}
                onClick={() => handleDelete(deleteConfirmId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </>
  );
}

// Export a simpler version for the new conversion page
export function TemplateSelector({
  onSelect,
}: {
  onSelect: (template: ConversionTemplate) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const handleSelect = (template: ConversionTemplate) => {
    setSelectedId(template.id);
    onSelect(template);
  };

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
        Choose a template
      </h3>
      <ConversionTemplates
        onSelectTemplate={handleSelect}
        selectedTemplateId={selectedId}
        showCreateButton={true}
      />
    </div>
  );
}
