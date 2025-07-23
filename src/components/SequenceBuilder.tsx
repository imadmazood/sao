import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Phone, MessageSquare, Mail, Clock, Save, Crown, Zap } from 'lucide-react';

interface SequenceStep {
  id?: string;
  step_number: number;
  message_type: 'call' | 'sms' | 'whatsapp' | 'email';
  message_content: string;
  delay_hours: number;
  conditions?: string;
}

interface SequenceBuilderProps {
  campaignId: string;
  onSave?: () => void;
}

export function SequenceBuilder({ campaignId, onSave }: SequenceBuilderProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [steps, setSteps] = useState<SequenceStep[]>([
    {
      step_number: 1,
      message_type: 'call',
      message_content: '',
      delay_hours: 0,
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (campaignId) {
      fetchSequence();
    }
  }, [campaignId]);

  const fetchSequence = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_sequences')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('step_number');

      if (error) throw error;

      if (data && data.length > 0) {
        setSteps(data.map(step => ({
          id: step.id,
          step_number: step.step_number,
          message_type: step.message_type,
          message_content: step.message_content || '',
          delay_hours: step.delay_hours,
          conditions: step.conditions || undefined,
        })));
      }
    } catch (error) {
      console.error('Error fetching sequence:', error);
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    const newStep: SequenceStep = {
      step_number: steps.length + 1,
      message_type: 'sms',
      message_content: '',
      delay_hours: 24,
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Renumber steps
    const renumberedSteps = newSteps.map((step, i) => ({
      ...step,
      step_number: i + 1,
    }));
    setSteps(renumberedSteps);
  };

  const updateStep = (index: number, field: keyof SequenceStep, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const saveSequence = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Delete existing steps
      await supabase
        .from('campaign_sequences')
        .delete()
        .eq('campaign_id', campaignId);

      // Insert new steps
      const stepsToInsert = steps.map(step => ({
        campaign_id: campaignId,
        step_number: step.step_number,
        message_type: step.message_type,
        message_content: step.message_content,
        delay_hours: step.delay_hours,
        conditions: step.conditions || null,
      }));

      const { error } = await supabase
        .from('campaign_sequences')
        .insert(stepsToInsert);

      if (error) throw error;

      onSave?.();
    } catch (error) {
      console.error('Error saving sequence:', error);
    } finally {
      setSaving(false);
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'call':
        return Phone;
      case 'sms':
      case 'whatsapp':
        return MessageSquare;
      case 'email':
        return Mail;
      default:
        return MessageSquare;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className={`animate-spin rounded-full h-12 w-12 border-4 border-transparent ${
            theme === 'gold'
              ? 'border-t-yellow-400 border-r-yellow-500'
              : 'border-t-blue-600 border-r-blue-500'
          }`}></div>
          {theme === 'gold' ? (
            <Crown className="absolute inset-0 m-auto h-4 w-4 text-yellow-400" />
          ) : (
            <Zap className="absolute inset-0 m-auto h-4 w-4 text-blue-600" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${
            theme === 'gold' ? 'text-gray-200' : 'text-gray-900'
          }`}>
            Campaign Sequence
          </h3>
          <p className={`text-sm ${
            theme === 'gold' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Define the automated follow-up sequence for this campaign
          </p>
        </div>
        <button
          onClick={saveSequence}
          disabled={saving}
          className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            theme === 'gold'
              ? 'gold-gradient text-black hover-gold'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50`}
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Sequence
        </button>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = getMessageTypeIcon(step.message_type);
          return (
            <div
              key={index}
              className={`p-6 rounded-lg border ${
                theme === 'gold'
                  ? 'border-yellow-400/20 bg-black/20'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    theme === 'gold' ? 'gold-gradient text-black' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {step.step_number}
                  </div>
                  <div className={`p-2 rounded-lg ${
                    theme === 'gold' ? 'bg-yellow-400/10' : 'bg-white'
                  }`}>
                    <Icon className={`h-4 w-4 ${
                      theme === 'gold' ? 'text-yellow-400' : 'text-gray-600'
                    }`} />
                  </div>
                  <span className={`font-medium ${
                    theme === 'gold' ? 'text-gray-200' : 'text-gray-900'
                  }`}>
                    Step {step.step_number}
                  </span>
                </div>
                {steps.length > 1 && (
                  <button
                    onClick={() => removeStep(index)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'gold'
                        ? 'text-red-400 hover:bg-red-400/10'
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'gold' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Message Type
                  </label>
                  <select
                    value={step.message_type}
                    onChange={(e) => updateStep(index, 'message_type', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      theme === 'gold'
                        ? 'border-yellow-400/30 bg-black/50 text-gray-200 focus:ring-yellow-400'
                        : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
                    }`}
                  >
                    <option value="call">Phone Call</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'gold' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Delay (Hours)
                  </label>
                  <div className="relative">
                    <Clock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                      theme === 'gold' ? 'text-yellow-400' : 'text-gray-400'
                    }`} />
                    <input
                      type="number"
                      min="0"
                      value={step.delay_hours}
                      onChange={(e) => updateStep(index, 'delay_hours', parseInt(e.target.value) || 0)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        theme === 'gold'
                          ? 'border-yellow-400/30 bg-black/50 text-gray-200 focus:ring-yellow-400'
                          : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
                      }`}
                      placeholder="24"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'gold' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Message Content
                </label>
                <textarea
                  value={step.message_content}
                  onChange={(e) => updateStep(index, 'message_content', e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    theme === 'gold'
                      ? 'border-yellow-400/30 bg-black/50 text-gray-200 placeholder-gray-500 focus:ring-yellow-400'
                      : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
                  }`}
                  placeholder={`Enter your ${step.message_type} message content...`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={addStep}
        className={`w-full py-3 border-2 border-dashed rounded-lg transition-colors ${
          theme === 'gold'
            ? 'border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/5'
            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Plus className="h-5 w-5 mx-auto mb-1" />
        Add Step
      </button>
    </div>
  );
}