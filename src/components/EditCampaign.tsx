import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, Upload, MessageCircle, CheckCircle, XCircle, AlertCircle, Eye, ArrowRight, ArrowDown } from 'lucide-react';
import { AITrainer } from './AITrainer';
import { CampaignAnalytics } from './CampaignAnalytics';
import { UploadLeadsTab } from './UploadLeadsTab';

interface Campaign {
  id: string;
  avatar: string | null;
  offer: string | null;
  calendar_url: string | null;
  goal: string | null;
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
  [dbColumn: string]: string; // Maps database column to CSV column
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

export function EditCampaign() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'leads' | 'details' | 'training' | 'schedule'>('analytics');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    offer: '',
    calendar_url: '',
    goal: '',
    status: 'draft',
  });

  useEffect(() => {
    if (id && user) {
      fetchCampaign();
    }
  }, [id, user]);

  const fetchCampaign = async () => {
    if (!id || !user) return;

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setCampaign(data);
        setFormData({
          offer: data.offer || '',
          calendar_url: data.calendar_url || '',
          goal: data.goal || '',
          status: data.status || 'draft',
        });
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update(formData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setUploadResult({
        success: true,
        message: 'Campaign updated successfully!'
      });
    } catch (error) {
      console.error('Error updating campaign:', error);
      setUploadResult({
        success: false,
        message: 'Error updating campaign. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!id || !user) return;

    setPublishing(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: 'active' })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setCampaign(prev => prev ? { ...prev, status: 'active' } : null);
      setFormData(prev => ({ ...prev, status: 'active' }));

      setUploadResult({
        success: true,
        message: 'Campaign published successfully!'
      });
    } catch (error) {
      console.error('Error publishing campaign:', error);
      setUploadResult({
        success: false,
        message: 'Error publishing campaign. Please try again.'
      });
    } finally {
      setPublishing(false);
    }
  };

  const parseCSVForPreview = (csvText: string): CSVPreview => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [], totalRows: 0 };

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1, 6).map(line => // Show first 5 rows for preview
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

      // Auto-suggest column mappings based on common patterns
      const autoMapping: ColumnMapping = {};
      
      DATABASE_COLUMNS.forEach(dbCol => {
        const matchingHeader = preview.headers.find(header => {
          const lowerHeader = header.toLowerCase();
          const lowerDbKey = dbCol.key.toLowerCase();
          
          // Direct matches
          if (lowerHeader === lowerDbKey) return true;
          
          // Pattern matching
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

      // Map values based on column mapping
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
    if (!csvFile || !user || !campaign) return;

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

      // Always save leads to database first
      const leadsToInsert = leads.map(lead => ({
        user_id: user.id,
        campaign_id: campaign.id,
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

      // Database save successful - now try N8N webhook (optional)
      let webhookSuccess = false;
      let webhookError = null;

      try {
        const formData = new FormData();
        formData.append('user_id', user.id);
        formData.append('campaign', JSON.stringify(campaign));
        formData.append('csv', csvFile);

        const response = await fetch('https://mazirhx.app.n8n.cloud/webhook/start-campaign-upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          webhookSuccess = true;
        } else {
          webhookError = `Webhook failed with status: ${response.status}`;
        }
      } catch (error) {
        webhookError = `Webhook error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Set success result with webhook status
      setUploadResult({
        success: true,
        message: `Successfully uploaded ${leads.length} leads to the database!`,
        leadsCount: leads.length,
        errors: webhookSuccess ? [] : [
          'Note: Leads saved to database successfully, but automation webhook failed.',
          webhookError || 'Webhook connection failed'
        ]
      });

      // Reset form
      setCsvFile(null);
      setCsvPreview(null);
      setShowPreview(false);
      setColumnMapping({});
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setUploadResult({
        success: false,
        message: 'Failed to upload leads to database.',
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      });
    } finally {
      setUploadLoading(false);
    }
  };

  const triggerChannelsEngine = async () => {
    if (!campaign || !user) return;

    try {
      const response = await fetch('https://mazirhx.app.n8n.cloud/webhook/channels-engine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          campaign_id: campaign.id,
          trigger_type: 'manual',
        }),
      });

      if (response.ok) {
        setUploadResult({
          success: true,
          message: 'Channels engine triggered successfully!'
        });
      } else {
        throw new Error('Failed to trigger channels engine');
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: 'Failed to trigger channels engine. Please try again.'
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const clearUploadResult = () => {
    setUploadResult(null);
  };

  const resetUpload = () => {
    setCsvFile(null);
    setCsvPreview(null);
    setShowPreview(false);
    setColumnMapping({});
    setUploadResult(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Campaign not found
        </h3>
        <Link
          to="/campaigns"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaigns
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link
            to="/campaigns"
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{campaign.offer || 'Untitled Campaign'}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Campaign ID: {campaign.id}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            campaign.status === 'active'
              ? 'bg-green-100 text-green-800'
              : campaign.status === 'paused'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {campaign.status || 'Draft'}
          </span>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </button>
          {campaign?.status === 'draft' && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {publishing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Publish Campaign
            </button>
          )}
        </div>
      </div>

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
              {uploadResult.leadsCount && (
                <p className="text-sm text-green-700 mt-1">
                  {uploadResult.leadsCount} leads have been added to your database and are ready for outreach.
                </p>
              )}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mr-1" />
                    <span className="text-sm font-medium text-yellow-800">Additional Information:</span>
                  </div>
                  <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                    {uploadResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={clearUploadResult}
              className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto px-4 sm:px-6">
            {[
              { key: 'analytics', label: 'Campaign Analytics' },
              { key: 'leads', label: 'Upload Leads' },
              { key: 'details', label: 'Campaign Details' },
              { key: 'training', label: 'AI Training' },
              { key: 'schedule', label: 'Schedule' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {/* Campaign Details Tab */}
          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="offer" className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Offer *
                  </label>
                  <input
                    type="text"
                    id="offer"
                    name="offer"
                    value={formData.offer}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Free consultation call"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="goal"
                  name="goal"
                  value={formData.goal}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your campaign objectives..."
                />
              </div>

              <div>
                <label htmlFor="calendar_url" className="block text-sm font-medium text-gray-700 mb-2">
                  Calendar URL *
                </label>
                <input
                  type="url"
                  id="calendar_url"
                  name="calendar_url"
                  value={formData.calendar_url}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://calendly.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Goal
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                  <option>100</option>
                </select>
              </div>
            </form>
          )}

          {/* Campaign Analytics Tab */}
          {activeTab === 'analytics' && campaign && (
            <CampaignAnalytics campaignId={campaign.id} />
          )}

          {/* Upload Leads Tab */}
          {activeTab === 'leads' && campaign && (
            <UploadLeadsTab campaignId={campaign.id} />
          )}

          {/* AI Training Tab */}
          {activeTab === 'training' && campaign && (
            <AITrainer campaignId={campaign.id} />
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Campaign Schedule</h3>
                <button
                  onClick={triggerChannelsEngine}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Trigger Channels Engine
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Limit
                  </label>
                  <input
                    type="number"
                    defaultValue="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum number of contacts per day</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>UTC</option>
                    <option>EST</option>
                    <option>PST</option>
                    <option>CST</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Working Hours Start
                  </label>
                  <input
                    type="time"
                    defaultValue="09:00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Working Hours End
                  </label>
                  <input
                    type="time"
                    defaultValue="17:00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Working Days
                </label>
                <div className="flex flex-wrap gap-3">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <label key={day} className="flex items-center">
                      <input
                        type="checkbox"
                        defaultChecked={day !== 'Sat' && day !== 'Sun'}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Schedule Summary</h4>
                <p className="text-sm text-blue-700">
                  Campaign will start on TBD at TBD. Up to 50 contacts will be reached per day during working hours (09:00 - 17:00) on Monday, Tuesday, Wednesday, Thursday, Friday.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}