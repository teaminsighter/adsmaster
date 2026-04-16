'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, ArrowLeft, Download, RefreshCw, Settings, ChevronRight } from 'lucide-react';
import {
  previewCSVImport,
  executeCSVImport,
  getImportSampleCSVUrl,
  useImportHistory,
  type ImportPreviewResponse,
  type ImportConfig,
  type ImportResult,
} from '@/lib/hooks/useApi';

type ImportStep = 'upload' | 'preview' | 'mapping' | 'importing' | 'complete';

const TARGET_FIELDS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'value', label: 'Value ($)' },
  { value: 'conversion_type', label: 'Conversion Type' },
  { value: 'occurred_at', label: 'Date/Time' },
  { value: 'gclid', label: 'Google Click ID' },
  { value: 'fbclid', label: 'Meta Click ID' },
  { value: 'utm_source', label: 'UTM Source' },
  { value: 'utm_medium', label: 'UTM Medium' },
  { value: 'utm_campaign', label: 'UTM Campaign' },
  { value: 'order_id', label: 'Order ID' },
  { value: 'external_id', label: 'External ID' },
  { value: 'conversion_name', label: 'Conversion Name' },
  { value: '', label: '(Skip this column)' },
];

const DATE_FORMATS = [
  { value: '%Y-%m-%d %H:%M:%S', label: '2024-01-15 10:30:00' },
  { value: '%m/%d/%Y %H:%M', label: '01/15/2024 10:30' },
  { value: '%d/%m/%Y %H:%M', label: '15/01/2024 10:30' },
  { value: '%Y-%m-%dT%H:%M:%S', label: 'ISO 8601 (2024-01-15T10:30:00)' },
  { value: '%Y-%m-%d', label: '2024-01-15' },
  { value: '%m/%d/%Y', label: '01/15/2024' },
];

export default function CSVImportPage() {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [dateFormat, setDateFormat] = useState('%Y-%m-%d %H:%M:%S');
  const [defaultType, setDefaultType] = useState('lead');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: historyData } = useImportHistory(5);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setLoading(true);

    try {
      const previewData = await previewCSVImport(selectedFile, skipDuplicates);
      setPreview(previewData);
      setMappings(previewData.suggested_mappings);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview file');
    } finally {
      setLoading(false);
    }
  }, [skipDuplicates]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      handleFileSelect(droppedFile);
    } else {
      setError('Please upload a CSV file');
    }
  }, [handleFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file || !preview) return;

    setStep('importing');
    setLoading(true);
    setError(null);

    const config: ImportConfig = {
      column_mappings: Object.entries(mappings)
        .filter(([, target]) => target !== '')
        .map(([csv_column, target_field]) => ({ csv_column, target_field })),
      date_format: dateFormat,
      skip_duplicates: skipDuplicates,
      duplicate_check_fields: ['email', 'occurred_at', 'conversion_type'],
      default_conversion_type: defaultType,
      default_source: 'csv',
      default_currency: 'USD',
    };

    try {
      const importResult = await executeCSVImport(file, config);
      setResult(importResult);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('mapping');
    } finally {
      setLoading(false);
    }
  };

  const resetImport = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setMappings({});
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/tracking/conversions" className="btn btn-ghost" style={{ padding: '8px' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="page-title">Import Conversions</h1>
            <p className="text-secondary">Upload a CSV file to bulk import offline conversions</p>
          </div>
        </div>
        <a
          href={getImportSampleCSVUrl()}
          download="sample_conversions.csv"
          className="btn btn-secondary"
        >
          <Download size={16} />
          Sample CSV
        </a>
      </div>

      {/* Progress Steps */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {['Upload', 'Preview', 'Map Fields', 'Import'].map((label, i) => {
              const steps: ImportStep[] = ['upload', 'preview', 'mapping', 'importing'];
              const currentIndex = steps.indexOf(step === 'complete' ? 'importing' : step);
              const isActive = i === currentIndex;
              const isComplete = i < currentIndex || step === 'complete';

              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '600',
                      background: isComplete ? 'var(--primary)' : isActive ? 'var(--primary)' : 'var(--surface-subtle)',
                      color: isComplete || isActive ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    {isComplete ? <CheckCircle size={18} /> : i + 1}
                  </div>
                  <span
                    style={{
                      marginLeft: '8px',
                      fontSize: '14px',
                      fontWeight: isActive ? '600' : '400',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {label}
                  </span>
                  {i < 3 && (
                    <ChevronRight
                      size={16}
                      style={{ margin: '0 12px', color: 'var(--text-secondary)', flexShrink: 0 }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card mb-4" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#EF4444' }}>
            <XCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="card">
          <div
            className="card-body"
            style={{
              padding: '60px',
              textAlign: 'center',
              border: '2px dashed var(--border-default)',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {loading ? (
              <>
                <RefreshCw size={48} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Analyzing your file...</h3>
              </>
            ) : (
              <>
                <Upload size={48} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Drop your CSV file here</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  or click to browse
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Supports: email, phone, name, value, date, click IDs, UTM parameters
                </p>
              </>
            )}
          </div>

          {/* Recent Imports */}
          {historyData?.imports && historyData.imports.length > 0 && (
            <div className="card-footer">
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Recent Imports</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {historyData.imports.map((imp, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={14} />
                      {imp.filename}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {imp.count} records • {new Date(imp.last_import).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && preview && (
        <div className="card">
          <div className="card-header">
            <h3>Preview: {file?.name}</h3>
          </div>
          <div className="card-body">
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ textAlign: 'center', padding: '16px', background: 'var(--surface-subtle)', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>{preview.total_rows}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Rows</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>{preview.valid_rows}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Valid</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#F59E0B' }}>{preview.duplicate_rows}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Duplicates</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#EF4444' }}>{preview.error_rows}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Errors</div>
              </div>
            </div>

            {/* Detected Columns */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Detected Columns</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {preview.detected_columns.map((col) => (
                  <span
                    key={col}
                    style={{
                      padding: '4px 12px',
                      background: preview.suggested_mappings[col] ? 'var(--primary)' : 'var(--surface-subtle)',
                      color: preview.suggested_mappings[col] ? 'white' : 'var(--text-primary)',
                      borderRadius: '16px',
                      fontSize: '13px',
                    }}
                  >
                    {col}
                    {preview.suggested_mappings[col] && (
                      <span style={{ opacity: 0.8 }}> → {preview.suggested_mappings[col]}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Preview Table */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>First {preview.preview.length} Rows</h4>
              <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th style={{ width: '80px' }}>Status</th>
                      {preview.detected_columns.slice(0, 6).map((col) => (
                        <th key={col} style={{ maxWidth: '150px' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.map((row) => (
                      <tr key={row.row_number}>
                        <td>{row.row_number}</td>
                        <td>
                          {row.is_duplicate ? (
                            <span className="badge badge-warning" title={row.duplicate_reason || ''}>Dup</span>
                          ) : row.validation_errors.length > 0 ? (
                            <span className="badge badge-danger" title={row.validation_errors.join(', ')}>Error</span>
                          ) : (
                            <span className="badge badge-success">OK</span>
                          )}
                        </td>
                        {preview.detected_columns.slice(0, 6).map((col) => (
                          <td key={col} style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {String(row.data[col] ?? row.data[preview.suggested_mappings[col]] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                />
                Skip duplicates ({preview.duplicate_rows} found)
              </label>
            </div>
          </div>

          <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={resetImport}>
              <ArrowLeft size={16} /> Start Over
            </button>
            <button className="btn btn-primary" onClick={() => setStep('mapping')}>
              Configure Mapping <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Mapping Step */}
      {step === 'mapping' && preview && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={20} />
              <h3>Field Mapping</h3>
            </div>
          </div>
          <div className="card-body">
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Map your CSV columns to conversion fields. Auto-detected mappings are pre-filled.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {preview.detected_columns.map((col) => (
                <div key={col} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>{col}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>→</span>
                  <select
                    className="select"
                    style={{ flex: 1 }}
                    value={mappings[col] || ''}
                    onChange={(e) => setMappings({ ...mappings, [col]: e.target.value })}
                  >
                    <option value="">Skip this column</option>
                    {TARGET_FIELDS.map((field) => (
                      <option key={field.value} value={field.value}>{field.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <hr style={{ margin: '24px 0', borderColor: 'var(--border-default)' }} />

            {/* Import Options */}
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Import Options</h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Date Format
                </label>
                <select
                  className="select"
                  style={{ width: '100%' }}
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                >
                  {DATE_FORMATS.map((fmt) => (
                    <option key={fmt.value} value={fmt.value}>{fmt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Default Conversion Type
                </label>
                <select
                  className="select"
                  style={{ width: '100%' }}
                  value={defaultType}
                  onChange={(e) => setDefaultType(e.target.value)}
                >
                  <option value="lead">Lead</option>
                  <option value="purchase">Purchase</option>
                  <option value="signup">Sign Up</option>
                  <option value="add_to_cart">Add to Cart</option>
                  <option value="initiate_checkout">Checkout</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => setStep('preview')}>
              <ArrowLeft size={16} /> Back
            </button>
            <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Importing...
                </>
              ) : (
                <>
                  Import {preview.valid_rows} Conversions <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Importing Step */}
      {step === 'importing' && (
        <div className="card">
          <div className="card-body" style={{ padding: '60px', textAlign: 'center' }}>
            <RefreshCw size={48} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Importing your conversions...</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              This may take a moment for large files.
            </p>
          </div>
        </div>
      )}

      {/* Complete Step */}
      {step === 'complete' && result && (
        <div className="card">
          <div className="card-body" style={{ padding: '40px', textAlign: 'center' }}>
            <CheckCircle size={64} style={{ color: '#10B981', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>Import Complete!</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Successfully imported {result.imported} conversions
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
              <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#10B981' }}>{result.imported}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Imported</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#F59E0B' }}>{result.skipped_duplicates}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Skipped</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#EF4444' }}>{result.failed}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Failed</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                  <AlertTriangle size={16} style={{ color: '#EF4444', marginRight: '6px' }} />
                  Errors ({result.errors.length})
                </h4>
                <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'var(--surface-subtle)', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                  {result.errors.slice(0, 10).map((err, i) => (
                    <div key={i} style={{ marginBottom: '4px' }}>
                      Row {err.row}: {err.error}
                    </div>
                  ))}
                  {result.errors.length > 10 && (
                    <div style={{ color: 'var(--text-secondary)' }}>
                      ...and {result.errors.length - 10} more errors
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <Link href="/tracking/conversions" className="btn btn-primary">
                View Conversions
              </Link>
              <button className="btn btn-secondary" onClick={resetImport}>
                Import Another File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
