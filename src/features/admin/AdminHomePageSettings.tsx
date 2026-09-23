import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Sparkles,
  Megaphone,
  Radio,
  Save,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Layers,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  Tag,
  BookOpen,
  Calendar,
  Compass,
  UploadCloud,
  Image as ImageIcon,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageCropperModal } from '@/components/ui/ImageCropperModal';
import { supabase } from '@/lib/supabase';
import {
  useHomePageSettings,
  defaultHomePageSettings,
  HomePageSettings,
  FeaturedProgramItem,
  AnnouncementItem,
  UpcomingTrackItem
} from '@/hooks/useHomePageSettings';
import { toast } from 'sonner';

export function AdminHomePageSettings() {
  const { settings, updateSettings, isUpdating } = useHomePageSettings();
  const [formData, setFormData] = useState<HomePageSettings>(settings);
  const [activeSectionTab, setActiveSectionTab] = useState<'programs' | 'announcements' | 'tracks'>('programs');
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [rawImageFile, setRawImageFile] = useState<File | null>(null);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleToggle = (key: keyof HomePageSettings) => {
    setFormData((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleInputChange = (key: keyof HomePageSettings, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Program Card Updaters
  const handleProgramItemChange = (index: number, field: keyof FeaturedProgramItem, value: any) => {
    const updated = [...(formData.featured_programs_items || [])];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: value };
      setFormData((prev) => ({ ...prev, featured_programs_items: updated }));
    }
  };

  const handleAddProgramCard = () => {
    const newProg: FeaturedProgramItem = {
      id: `prog-${Date.now()}`,
      title: 'New Specialized Earth Science Program',
      description: 'Master operational techniques, observational frameworks, and scientific methodologies with MoES accredited certification.',
      department: 'IMD / INCOIS, MoES',
      badge: 'Featured',
      duration_hours: 60,
      trainer_name: 'Lead Scientist',
      link: '/courses',
    };
    setFormData((prev) => ({
      ...prev,
      featured_programs_items: [...(prev.featured_programs_items || []), newProg],
    }));
  };

  const handleDeleteProgramCard = (index: number) => {
    if ((formData.featured_programs_items || []).length <= 1) {
      toast.error('You must keep at least 1 featured program card.');
      return;
    }
    const updated = (formData.featured_programs_items || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, featured_programs_items: updated }));
  };

  const handleThumbnailUpload = async (index: number, file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP, etc.)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size exceeds 10MB limit.');
      return;
    }

    setUploadingIndex(index);
    const prog = formData.featured_programs_items?.[index];
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `featured_${prog?.id || index}_${Date.now()}.${fileExt}`;
    const filePath = `thumbnails/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('Homepage')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.warn('Storage upload note:', uploadError.message);
        // Fallback: load as data URL so user can preview and save immediately
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          handleProgramItemChange(index, 'thumbnail_url', dataUrl);
        };
        reader.readAsDataURL(file);
        toast.info('Image loaded. Remember to create the "Homepage" storage bucket if not already configured.');
      } else {
        const { data: urlData } = supabase.storage
          .from('Homepage')
          .getPublicUrl(filePath);

        handleProgramItemChange(index, 'thumbnail_url', urlData.publicUrl);
        toast.success('Thumbnail uploaded successfully to Homepage bucket!');
      }
    } catch (err: any) {
      console.error('Upload exception:', err);
      toast.error('Failed to upload thumbnail');
    } finally {
      setUploadingIndex(null);
    }
  };

  // Announcement Item Updaters
  const handleAnnouncementItemChange = (index: number, field: keyof AnnouncementItem, value: any) => {
    const updated = [...(formData.announcements_items || [])];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: value };
      setFormData((prev) => ({ ...prev, announcements_items: updated }));
    }
  };

  const handleAddAnnouncement = () => {
    const newItem: AnnouncementItem = {
      id: `ann-${Date.now()}`,
      tag: 'New Update',
      tag_color: 'cyan',
      title: 'New ministry announcement regarding atmospheric observations',
      link: '/courses',
    };
    setFormData((prev) => ({
      ...prev,
      announcements_items: [...(prev.announcements_items || []), newItem],
    }));
  };

  const handleDeleteAnnouncement = (index: number) => {
    const updated = (formData.announcements_items || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, announcements_items: updated }));
  };

  // Upcoming Track Updaters
  const handleTrackItemChange = (index: number, field: keyof UpcomingTrackItem, value: any) => {
    const updated = [...(formData.upcoming_tracks_items || [])];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: value };
      setFormData((prev) => ({ ...prev, upcoming_tracks_items: updated }));
    }
  };

  const handleAddTrack = () => {
    const newTrack: UpcomingTrackItem = {
      id: `track-${Date.now()}`,
      title: 'New Specialized Earth Science Program',
      status: 'Pre-Registration Open',
      status_color: 'emerald',
      level: 'Specialist Track',
      date: 'Starts Next Month',
      duration: '4 Weeks',
      format: 'Live Telemetry Labs',
      desc: 'Hands-on operational training with official government certification upon completion.',
      key_skills: 'Remote Sensing, Data Interpretation, Quality Control',
      btn_text: 'Pre-Register Cohort',
      link: '/register',
    };
    setFormData((prev) => ({
      ...prev,
      upcoming_tracks_items: [...(prev.upcoming_tracks_items || []), newTrack],
    }));
  };

  const handleDeleteTrack = (index: number) => {
    if ((formData.upcoming_tracks_items || []).length <= 1) {
      toast.error('You must keep at least 1 track card in the list.');
      return;
    }
    const updated = (formData.upcoming_tracks_items || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, upcoming_tracks_items: updated }));
  };

  const handleSave = () => {
    updateSettings(formData);
  };

  const handleReset = () => {
    setFormData(defaultHomePageSettings);
    toast.info('Form reset to default values. Click "Save & Publish" to apply.');
  };

  const activeCount = [
    formData.featured_programs_enabled,
    formData.announcements_bar_enabled,
    formData.upcoming_tracks_enabled,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#070E20]/90 border border-cyan-500/30 shadow-xl shadow-cyan-950/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Public Landing Page Customizer</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Home Page Detailed Customizer
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              In-depth controls for publishing, toggling, and fine-tuning the 3 core landing page sections: Featured Programs, Horizontal Announcements Marquee, and Specialized Tracks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/15 bg-[#040814]/80 hover:bg-[#070E20] text-slate-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
            >
              <span>Preview Live Site</span>
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            </a>
          </div>
        </div>

        {/* Quick Summary Pill Bar */}
        <div className="mt-6 pt-5 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>{activeCount} of 3 Sections Active</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Instant Live Sync
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleReset}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white text-xs h-8 px-3"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={isUpdating}
              size="sm"
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs h-8 px-4 rounded-lg shadow-md shadow-cyan-500/20"
            >
              <Save className="w-3 h-3 mr-1.5" />
              {isUpdating ? 'Saving...' : 'Save & Publish'}
            </Button>
          </div>
        </div>
      </div>

      {/* Section Navigation Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {[
          { key: 'programs', label: '1. Featured Programs', icon: Sparkles, count: formData.featured_programs_items?.length || 3, enabled: formData.featured_programs_enabled },
          { key: 'announcements', label: '2. Announcements Marquee', icon: Megaphone, count: formData.announcements_items?.length || 5, enabled: formData.announcements_bar_enabled },
          { key: 'tracks', label: '3. Specialized Tracks', icon: Radio, count: formData.upcoming_tracks_items?.length || 3, enabled: formData.upcoming_tracks_enabled },
        ].map((tab) => {
          const isSelected = activeSectionTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSectionTab(tab.key as any)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/10 border border-cyan-400 text-white shadow-lg shadow-cyan-950/40'
                  : 'bg-[#070E20]/90 border border-white/10 text-slate-400 hover:text-white hover:border-cyan-500/30'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                tab.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
              }`}>
                {tab.enabled ? 'Live' : 'Off'}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: FEATURED LEARNING PROGRAMS */}
      {activeSectionTab === 'programs' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Main Controls */}
          <div className="p-6 rounded-3xl bg-[#070E20]/90 border border-cyan-500/30 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Section 1: Featured Learning Programs Controls</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Top 3 course cards grid displayed near the top of the landing page.</p>
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-300">
                  {formData.featured_programs_enabled ? 'Section is Published' : 'Section is Hidden'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggle('featured_programs_enabled')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    formData.featured_programs_enabled ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    formData.featured_programs_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Eyebrow Tag Pill</label>
                <input
                  type="text"
                  value={formData.featured_programs_tag}
                  onChange={(e) => handleInputChange('featured_programs_tag', e.target.value)}
                  placeholder="Top Certified Tracks"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Main Section Heading</label>
                <input
                  type="text"
                  value={formData.featured_programs_title}
                  onChange={(e) => handleInputChange('featured_programs_title', e.target.value)}
                  placeholder="Featured Learning Programs"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Header Button Label</label>
                <input
                  type="text"
                  value={formData.featured_programs_btn_text}
                  onChange={(e) => handleInputChange('featured_programs_btn_text', e.target.value)}
                  placeholder="Explore All Courses"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Section Description / Subtitle</label>
                <textarea
                  rows={2}
                  value={formData.featured_programs_subtitle}
                  onChange={(e) => handleInputChange('featured_programs_subtitle', e.target.value)}
                  placeholder="Explore government-certified, high-impact earth science..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Featured Cards Customizer */}
          <div className="p-6 rounded-3xl bg-[#070E20]/90 border border-cyan-500/30 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span>Featured Program Cards Customizer ({formData.featured_programs_items?.length || 0} Cards)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Add, customize, or remove featured course cards displayed on the landing page.
                </p>
              </div>

              <Button
                onClick={handleAddProgramCard}
                size="sm"
                className="bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-semibold rounded-xl h-8 px-3 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Program Card</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(formData.featured_programs_items || []).map((prog, idx) => (
                <div key={prog.id || idx} className="p-4 rounded-2xl bg-[#040814] border border-cyan-500/20 space-y-3 relative group">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-cyan-400">Card #{idx + 1}</span>
                      <input
                        type="text"
                        value={prog.badge}
                        onChange={(e) => handleProgramItemChange(idx, 'badge', e.target.value)}
                        placeholder="Badge (e.g. Top Rated)"
                        className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-center w-24 focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={() => handleDeleteProgramCard(idx)}
                      title="Delete card"
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Thumbnail Image Picker & Preview */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-semibold text-slate-400">Card Thumbnail Photo <span className="font-normal text-slate-500">(Recommended: 800x400 pixels, 2:1 ratio)</span></label>
                      {prog.thumbnail_url && (
                        <span className="text-[9px] font-mono text-emerald-400">Linked to Storage</span>
                      )}
                    </div>
                    {prog.thumbnail_url ? (
                      <div className="relative h-28 rounded-xl overflow-hidden border border-cyan-500/30 bg-slate-950 group/thumb">
                        <img
                          src={prog.thumbnail_url}
                          alt={prog.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <label className="cursor-pointer px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-md">
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Change</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  setRawImageFile(e.target.files[0]);
                                  setCroppingIndex(idx);
                                  setIsCropperOpen(true);
                                  e.target.value = '';
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleProgramItemChange(idx, 'thumbnail_url', null)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-semibold flex items-center gap-1 shadow-md"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/60 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 bg-cyan-950/20 hover:bg-cyan-950/40 cursor-pointer transition-all">
                        {uploadingIndex === idx ? (
                          <div className="flex items-center gap-2 text-cyan-400 text-xs py-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Uploading to Homepage bucket...</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                            <span className="text-[11px] font-semibold text-cyan-300">Upload Card Photo</span>
                            <span className="text-[9px] text-slate-500">PNG, JPG, WEBP (Bucket: Homepage)</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  setRawImageFile(e.target.files[0]);
                                  setCroppingIndex(idx);
                                  setIsCropperOpen(true);
                                  e.target.value = '';
                                }
                              }}
                            />
                          </>
                        )}
                      </label>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Course Title</label>
                    <input
                      type="text"
                      value={prog.title}
                      onChange={(e) => handleProgramItemChange(idx, 'title', e.target.value)}
                      placeholder="e.g. Ocean Observation and Marine Data Analysis"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={prog.description}
                      onChange={(e) => handleProgramItemChange(idx, 'description', e.target.value)}
                      placeholder="Brief overview of the program curriculum..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-white focus:outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Department / Org</label>
                      <input
                        type="text"
                        value={prog.department}
                        onChange={(e) => handleProgramItemChange(idx, 'department', e.target.value)}
                        placeholder="e.g. INCOIS, MoES"
                        className="w-full px-2 py-1 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Duration (Hours)</label>
                      <input
                        type="number"
                        value={prog.duration_hours}
                        onChange={(e) => handleProgramItemChange(idx, 'duration_hours', parseInt(e.target.value) || 60)}
                        placeholder="e.g. 80"
                        className="w-full px-2 py-1 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Trainer / Faculty</label>
                      <input
                        type="text"
                        value={prog.trainer_name}
                        onChange={(e) => handleProgramItemChange(idx, 'trainer_name', e.target.value)}
                        placeholder="e.g. Dr. V. Ramakrishnan"
                        className="w-full px-2 py-1 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Destination Link</label>
                      <input
                        type="text"
                        value={prog.link || '/courses'}
                        onChange={(e) => handleProgramItemChange(idx, 'link', e.target.value)}
                        placeholder="/courses"
                        className="w-full px-2 py-1 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: ANNOUNCEMENTS MARQUEE BAR */}
      {activeSectionTab === 'announcements' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#070E20]/90 border border-cyan-500/30 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-cyan-400" />
                  <span>Section 2: Horizontal Announcement Bar Controls</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Continuous infinite live announcements ticker situated between Stats and Stakeholder Workspaces.</p>
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-300">
                  {formData.announcements_bar_enabled ? 'Marquee is Published' : 'Marquee is Hidden'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggle('announcements_bar_enabled')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    formData.announcements_bar_enabled ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    formData.announcements_bar_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Left Fixed Pill Label</label>
                <input
                  type="text"
                  value={formData.announcements_bar_label}
                  onChange={(e) => handleInputChange('announcements_bar_label', e.target.value)}
                  placeholder="Announcements"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Scrolling Flow Speed</label>
                  <span className="text-[11px] font-mono text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-500/30">
                    {formData.announcements_bar_speed || 24}s / cycle
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={[16, 24, 45].includes(formData.announcements_bar_speed) ? formData.announcements_bar_speed : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        handleInputChange('announcements_bar_speed', parseInt(e.target.value) || 24);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value={16} className="bg-slate-900 text-white">Fast (16s cycle)</option>
                    <option value={24} className="bg-slate-900 text-white">Medium / Balanced (24s cycle)</option>
                    <option value={45} className="bg-slate-900 text-white">Smooth / Calm (45s cycle)</option>
                    <option value="custom" className="bg-slate-900 text-cyan-300">Custom (Enter Seconds)</option>
                  </select>

                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min={4}
                      max={300}
                      value={formData.announcements_bar_speed || 24}
                      onChange={(e) => handleInputChange('announcements_bar_speed', Math.max(1, parseInt(e.target.value) || 24))}
                      placeholder="Custom seconds..."
                      className="w-full pl-3 pr-12 py-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                    />
                    <span className="absolute right-3 text-xs text-slate-400 pointer-events-none font-semibold">sec</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Select a preset or enter any exact number of seconds (lower = faster, higher = slower).</p>
              </div>
            </div>
          </div>

          {/* Live Items Manager */}
          <div className="p-6 rounded-3xl bg-[#070E20]/90 border border-cyan-500/30 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-cyan-400" />
                  <span>Custom Live Announcement Items ({(formData.announcements_items || []).length})</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Manage the stream of messages that cycle continuously in the ticker.</p>
              </div>

              <Button
                onClick={handleAddAnnouncement}
                size="sm"
                className="bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-xs font-semibold rounded-xl h-8 px-3"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {(formData.announcements_items || []).map((item, idx) => (
                <div key={item.id || idx} className="p-4 rounded-2xl bg-[#040814] border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <span className="text-xs font-mono text-slate-500 shrink-0">#{idx + 1}</span>

                  <div className="w-36 shrink-0">
                    <input
                      type="text"
                      value={item.tag}
                      onChange={(e) => handleAnnouncementItemChange(idx, 'tag', e.target.value)}
                      placeholder="Tag (e.g. MoES Live)"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 focus:outline-none font-bold uppercase text-[10px]"
                    />
                  </div>

                  <div className="w-28 shrink-0">
                    <select
                      value={item.tag_color || 'cyan'}
                      onChange={(e) => handleAnnouncementItemChange(idx, 'tag_color', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-white focus:outline-none"
                    >
                      <option value="cyan" className="bg-slate-900">Cyan</option>
                      <option value="amber" className="bg-slate-900">Amber</option>
                      <option value="emerald" className="bg-slate-900">Emerald</option>
                      <option value="sky" className="bg-slate-900">Sky</option>
                      <option value="purple" className="bg-slate-900">Purple</option>
                    </select>
                  </div>

                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleAnnouncementItemChange(idx, 'title', e.target.value)}
                      placeholder="Announcement headline text..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-white focus:outline-none"
                    />
                  </div>

                  <div className="w-28 shrink-0">
                    <input
                      type="text"
                      value={item.link || '/courses'}
                      onChange={(e) => handleAnnouncementItemChange(idx, 'link', e.target.value)}
                      placeholder="Link (/courses)"
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-slate-300 focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteAnnouncement(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-all shrink-0"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 3: SPECIALIZED EARTH SCIENCES TRACKS */}
      {activeSectionTab === 'tracks' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#070E20]/90 border border-cyan-500/30 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-sky-400" />
                  <span>Section 3: Specialized Earth Sciences Tracks Controls</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Upcoming announcements, pre-registration cohorts, and masterclasses preview section.</p>
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-300">
                  {formData.upcoming_tracks_enabled ? 'Section is Published' : 'Section is Hidden'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggle('upcoming_tracks_enabled')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    formData.upcoming_tracks_enabled ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    formData.upcoming_tracks_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Eyebrow Tag Pill</label>
                <input
                  type="text"
                  value={formData.upcoming_tracks_tag}
                  onChange={(e) => handleInputChange('upcoming_tracks_tag', e.target.value)}
                  placeholder="Upcoming Announcements"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Main Section Heading</label>
                <input
                  type="text"
                  value={formData.upcoming_tracks_title}
                  onChange={(e) => handleInputChange('upcoming_tracks_title', e.target.value)}
                  placeholder="Specialized Earth Sciences Tracks."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Catalog Button Text</label>
                <input
                  type="text"
                  value={formData.upcoming_tracks_btn_text}
                  onChange={(e) => handleInputChange('upcoming_tracks_btn_text', e.target.value)}
                  placeholder="View Complete Catalog"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Section Subtitle / Description</label>
                <input
                  type="text"
                  value={formData.upcoming_tracks_subtitle}
                  onChange={(e) => handleInputChange('upcoming_tracks_subtitle', e.target.value)}
                  placeholder="Pre-register for next-generation cohorts and masterclasses."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Individual Track Cards Editor */}
          <div className="p-6 rounded-3xl bg-[#070E20]/90 border border-cyan-500/30 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-sky-400" />
                  <span>Upcoming Track Cards ({(formData.upcoming_tracks_items || []).length})</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Edit dates, skill tags, format, and pre-registration links for each upcoming cohort card.</p>
              </div>

              <Button
                onClick={handleAddTrack}
                size="sm"
                className="bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-xs font-semibold rounded-xl h-8 px-3"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Track Card
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {(formData.upcoming_tracks_items || []).map((track, idx) => (
                <div key={track.id || idx} className="p-5 rounded-2xl bg-[#040814] border border-cyan-500/20 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-xs font-bold text-sky-400">Track #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTrack(idx)}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete track"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Track Title</label>
                      <input
                        type="text"
                        value={track.title}
                        onChange={(e) => handleTrackItemChange(idx, 'title', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-white focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Status Pill</label>
                        <input
                          type="text"
                          value={track.status}
                          onChange={(e) => handleTrackItemChange(idx, 'status', e.target.value)}
                          placeholder="Pre-Registration Open"
                          className="w-full px-2 py-1 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Level Tag</label>
                        <input
                          type="text"
                          value={track.level}
                          onChange={(e) => handleTrackItemChange(idx, 'level', e.target.value)}
                          placeholder="Advanced Specialist"
                          className="w-full px-2 py-1 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Start Date</label>
                        <input
                          type="text"
                          value={track.date}
                          onChange={(e) => handleTrackItemChange(idx, 'date', e.target.value)}
                          placeholder="Starts Oct 15, 2026"
                          className="w-full px-2 py-1 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Duration</label>
                        <input
                          type="text"
                          value={track.duration}
                          onChange={(e) => handleTrackItemChange(idx, 'duration', e.target.value)}
                          placeholder="4 Weeks"
                          className="w-full px-2 py-1 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={track.desc}
                        onChange={(e) => handleTrackItemChange(idx, 'desc', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-white focus:outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Key Skills (comma-separated)</label>
                      <input
                        type="text"
                        value={track.key_skills}
                        onChange={(e) => handleTrackItemChange(idx, 'key_skills', e.target.value)}
                        placeholder="Polarimetric Refl., Mesocyclone Detection"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Button Text & Link</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={track.btn_text || 'Pre-Register Cohort'}
                        onChange={(e) => handleTrackItemChange(idx, 'btn_text', e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-white focus:outline-none"
                      />
                      <input
                        type="text"
                        value={track.link || '/register'}
                        onChange={(e) => handleTrackItemChange(idx, 'link', e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-slate-300 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Floating Save Action Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20">
        <p className="text-xs text-slate-400">
          All modifications save instantly to your active settings and sync across all landing page visitors.
        </p>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleReset}
            variant="outline"
            className="border-white/20 bg-transparent text-slate-300 hover:text-white rounded-xl text-xs font-semibold h-10 px-4"
          >
            Reset All to Defaults
          </Button>

          <Button
            onClick={handleSave}
            disabled={isUpdating}
            className="bg-gradient-to-r from-cyan-500 via-blue-600 to-amber-500 hover:opacity-95 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-lg shadow-cyan-500/20"
          >
            <Save className="w-4 h-4 mr-2" />
            {isUpdating ? 'Saving...' : 'Save & Publish Changes'}
          </Button>
        </div>
      </div>

      <ImageCropperModal
        isOpen={isCropperOpen}
        imageFile={rawImageFile}
        aspectRatio={2 / 1}
        onClose={() => {
          setIsCropperOpen(false);
          setRawImageFile(null);
          setCroppingIndex(null);
        }}
        onCropComplete={(croppedFile) => {
          setIsCropperOpen(false);
          setRawImageFile(null);
          if (croppingIndex !== null) {
            handleThumbnailUpload(croppingIndex, croppedFile);
          }
        }}
      />
    </div>
  );
}
