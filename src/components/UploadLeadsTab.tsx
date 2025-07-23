import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Upload, User, Phone, Mail, Building, Briefcase, CheckCircle, XCircle, AlertCircle, Eye, ArrowRight, ArrowDown, Trash2 } from 'lucide-react';

interface UploadedLead {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  company_name: string | null;
  job_title: string | null;
  status: string | null;
  created_at: string;
}

interface UploadResult {
  success: boolean;
  message: string;
  leadsCount?: number;
  errors?: string[];
}

interface CSVPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

interface ColumnMapping {
  [dbColumn: string]: string;
}

const DATABASE_COLUMNS = [
  { key: 'name', label: 'Name', description: 'Contact\'s full name', required: false },
  { key: 'phone', label: 'Phone Number', description: 'Contact phone number', required: false },
  { key: 'email', label: 'Email Address', description: 'Contact email address', required: false },
  { key: 'company_name', label: 'Company Name', description: 'Company or organization name', required: false },
  { key: 'job_title', label: 'Job Title', description: 'Contact\'s position or role', required: false },
  { key: 'source_url', label: 'Source URL', description: 'Website or profile URL', required: false },
  { key: 'source_platform', label: 'Source Platform', description: 'Platform where contact was found', required: false },
];

interface UploadLeadsTabProps {
  campaignId: string;
}

export function UploadLeadsTab({ campaignId }: UploadLeadsTabProps) {
  const { user } = useAuth();
  const [existingLeads, setExistingLeads] = useState<UploadedLead[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (campaignId) {
      fetchExistingLeads();
    }
  }, [campaignId]);

  const fetchExistingLeads = async () => {
    if (!campaignId || !user) return;

    try {
      const { data, error } = await supabase
        .from('uploaded_leads')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExistingLeads(data || []);
    } catch (error) {
      console.error('Error fetching existing leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseCSVForPreview = (csvText: string): CSVPreview => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [], totalRows: 0 };

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1, 6).map(line =>
      line.split(',').map(cell => cell.trim().replace(/"/g, ''))
    );

    return {
      headers,
      rows,
      totalRows: lines.length - 1
    };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setUploadResult(null);
    setShowPreview(false);

    try {
      const csvText = await file.text();
      const preview = parseCSVForPreview(csvText);
      setCsvPreview(preview);

      // Auto-suggest column mappings
      const autoMapping: ColumnMapping = {};
      
      DATABASE_COLUMNS.forEach(dbCol => {
        const matchingHeader = preview.headers.find(header => {
          const lowerHeader = header.toLowerCase();
          const lowerDbKey = dbCol.key.toLowerCase();
          
          if (lowerHeader === lowerDbKey) return true;
          
          switch (dbCol.key) {
            case 'name':
              return lowerHeader.includes('name') || lowerHeader.includes('full_name') || lowerHeader.includes('first_name');
            case 'phone':
              return lowerHeader.includes('phone') || lowerHeader.includes('mobile') || lowerHeader.includes('number') || lowerHeader === 'tel';
            case 'email':
              return lowerHeader.includes('email') || lowerHeader.includes('mail') || lowerHeader === 'e-mail';
            case 'company_name':
              return lowerHeader.includes('company') || lowerHeader.includes('organization') || lowerHeader.includes('org');
            case 'job_title':
              return lowerHeader.includes('title') || lowerHeader.includes('position') || lowerHeader.includes('job') || lowerHeader.includes('role');
            case 'source_url':
              return lowerHeader.includes('url') || lowerHeader.includes('website') || lowerHeader.includes('link');
            case 'source_platform':
              return lowerHeader.includes('platform') || lowerHeader.includes('source') || lowerHeader.includes('site');
            default:
              return false;
          }
        });
        
        if (matchingHeader) {
          autoMapping[dbCol.key] = matchingHeader;
        }
      });

      setColumnMapping(autoMapping);
      setShowPreview(true);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      setUploadResult({
        success: false,
        message: 'Error reading CSV file. Please check the file format.',
        errors: ['Make sure the file is a valid CSV with comma-separated values']
      });
    }
  };

  const handleColumnMappingChange = (dbColumn: string, csvColumn: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [dbColumn]: csvColumn === 'none' ? '' : csvColumn
    }));
  };

  const processCSVWithMapping = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return { leads: [], errors: [] };

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const leads = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const lead: any = {};

      Object.entries(columnMapping).forEach(([dbColumn, csvColumn]) => {
        if (csvColumn) {
          const csvIndex = headers.indexOf(csvColumn);
          if (csvIndex !== -1 && values[csvIndex]) {
            lead[dbColumn] = values[csvIndex];
          }
        }
      });

      if (lead.name || lead.phone || lead.email) {
        leads.push(lead);
      } else {
        errors.push(`Row ${i + 1}: Missing required data (name, phone, or email)`);
      }
    }

    return { leads, errors };
  };

  const handleFileUpload = async () => {
    if (!csvFile || !user || !campaignId) return;

    setUploadLoading(true);
    setUploadResult(null);

    try {
      const csvText = await csvFile.text();
      const { leads, errors } = processCSVWithMapping(csvText);

      if (leads.length === 0) {
        setUploadResult({
          success: false,
          message: 'No valid leads found in CSV file.',
          errors: ['Please ensure at least one row has name, phone, or email data', ...errors]
        });
        return;
      }

      const leadsToInsert = leads.map(lead => ({
        user_id: user.id,
        campaign_id: campaignId,
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        company_name: lead.company_name || '',
        job_title: lead.job_title || '',
        source_url: lead.source_url || '',
        source_platform: lead.source_platform || '',
        status: 'pending'
      }));

      const { error: dbError } = await supabase
        .from('uploaded_leads')
        .insert(leadsToInsert);

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      setUploadResult({
        success: true,
        message: `Successfully uploaded ${leads.length} leads!`,
        leadsCount: leads.length,
      });

      // Reset form and refresh leads
      setCsvFile(null);
      setCsvPreview(null);
      setShowPreview(false);
      setColumnMapping({});
      fetchExistingLeads();
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setUploadResult({
        success: false,
        message: 'Failed to upload leads.',
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      });
    } finally {
      setUploadLoading(false);
    }
  };

  const deleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      const { error } = await supabase
        .from('uploaded_leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
      fetchExistingLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  const resetUpload = () => {
    setCsvFile(null);
    setCsvPreview(null);
    setShowPreview(false);
    setColumnMapping({});
    setUploadResult(null);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'called':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-purple-100 text-purple-800';
      case 'booked':
        return 'bg-green-100 text-green-800';
      case 'not_interested':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Result Message */}
      {uploadResult && (
        <div className={`rounded-lg border p-4 ${
          uploadResult.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {uploadResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-medium ${
                uploadResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {uploadResult.message}
              </h3>
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                  {uploadResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={() => setUploadResult(null)}
              className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Upload Section */}
      {!showPreview ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Upload CSV File
          </h3>
          <p className="text-gray-600 mb-6">
            Upload a CSV file with your leads data. We'll help you map your columns to our database fields.
          </p>
          
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="mb-4"
          />
          
          <div className="text-xs text-gray-500 space-y-1">
            <p>• CSV files only with comma-separated values</p>
            <p>• First row should contain column headers</p>
            <p>• We support various column names and will help you map them</p>
          </div>
        </div>
      ) : (
        /* CSV Preview and Upload */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">CSV Preview & Column Mapping</h3>
              <p className="text-sm text-gray-600">
                {csvPreview?.totalRows} total rows found. Map our database fields to your CSV columns.
              </p>
            </div>
            <button
              onClick={resetUpload}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Choose Different File
            </button>
          </div>

          {/* Column Mapping */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <ArrowRight className="h-4 w-4 mr-2" />
              Column Mapping
            </h4>
            <div className="space-y-4">
              {DATABASE_COLUMNS.map((dbCol) => (
                <div key={dbCol.key} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-900">
                        {dbCol.label}
                      </label>
                      <p className="text-xs text-gray-500 mt-1">{dbCol.description}</p>
                    </div>
                    <div className="w-48">
                      <select
                        value={columnMapping[dbCol.key] || ''}
                        onChange={(e) => handleColumnMappingChange(dbCol.key, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select CSV column...</option>
                        {csvPreview?.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upload Actions */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {Object.values(columnMapping).filter(Boolean).length} fields mapped
            </div>
            <div className="flex space-x-3">
              <button
                onClick={resetUpload}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFileUpload}
                disabled={uploadLoading || Object.values(columnMapping).filter(Boolean).length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploadLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </div>
                ) : (
                  `Upload ${csvPreview?.totalRows} Leads`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Leads */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Uploaded Leads ({existingLeads.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : existingLeads.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No leads uploaded yet
            </h3>
            <p className="text-gray-600">
              Upload a CSV file to add leads to this campaign
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {existingLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {lead.name || 'No name'}
                        </div>
                        <div className="text-sm text-gray-500 space-y-1">
                          {lead.phone && (
                            <div className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {lead.phone}
                            </div>
                          )}
                          {lead.email && (
                            <div className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {lead.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {lead.company_name || '-'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {lead.job_title || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          lead.status
                        )}`}
                      >
                        {lead.status?.replace('_', ' ') || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => deleteLead(lead.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete lead"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}