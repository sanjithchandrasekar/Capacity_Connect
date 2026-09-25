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
  Loader2,
  Sliders,
  Eye,
  Check
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
    toast.success('Added new featured program card');
  };

  const handleDeleteProgramCard = (index: number) => {
    if ((formData.featured_programs_items || []).length <= 1) {
      toast.error('You must keep at least 1 featured program card.');
      return;
    }
    const updated = (formData.featured_programs_items || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, featured_programs_items: updated }));
    toast.info('Program card removed');
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
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          handleProgramItemChange(index, 'thumbnail_url', dataUrl);
        };
        reader.readAsDataURL(file);
        toast.info('Image loaded as local preview.');
      } else {
        const { data: urlData } = supabase.storage
          .from('Homepage')
          .getPublicUrl(filePath);

        handleProgramItemChange(index, 'thumbnail_url', urlData.publicUrl);
        toast.success('Thumbnail uploaded successfully!');
      }
    } catch (err: any) {
      console.error('Upload exception:', err);
      toast.error('Failed to upload thumbnail.');
    } finally {
      setUploadingIndex(null);
    }
  };

  // Announcements Marquee Updaters
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
      tag: 'NEW NOTICE',
      tag_color: 'cyan',
      title: 'New MoES Training Protocol Announcement Live for Trainees',
      link: '/courses',
    };
    setFormData((prev) => ({
      ...prev,
      announcements_items: [...(prev.announcements_items || []), newItem],
    }));
    toast.success('Added new announcement item');
  };

  const handleDeleteAnnouncement = (index: number) => {
    if ((formData.announcements_items || []).length <= 1) {
      toast.error('You must keep at least 1 announcement item in the marquee.');
      return;
    }
    const updated = (formData.announcements_items || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, announcements_items: updated }));
    toast.info('Announcement item removed');
  };

  // Upcoming Tracks Updaters
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
      title: 'Satellite Telemetry & Numerical Weather Modeling',
      desc: 'Master observational frameworks, polarimetric radar algorithms, and real-time computing pipelines.',
      date: 'Starts Next Month',
      duration: '4 Weeks',
      status: 'Pre-Registration Open',
      status_color: 'cyan',
      level: 'Advanced Track',
      format: 'Online & Lab Synchronous',
      key_skills: 'Satellite Data, Numerical Modeling, Doppler Radar',
      btn_text: 'Pre-Register Cohort',
      link: '/register',
    };
    setFormData((prev) => ({
      ...prev,
      upcoming_tracks_items: [...(prev.upcoming_tracks_items || []), newTrack],
    }));
    toast.success('Added new specialized track card');
  };

  const handleDeleteTrack = (index: number) => {
    if ((formData.upcoming_tracks_items || []).length <= 1) {
      toast.error('You must keep at least 1 specialized track card.');
      return;
    }
    const updated = (formData.upcoming_tracks_items || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, upcoming_tracks_items: updated }));
    toast.info('Track card removed');
  };

  // Save Settings
  const handleSave = async () => {
    try {
      await updateSettings(formData);
      toast.success('Landing page settings published successfully!');
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save settings.');
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all landing page sections to default content? Unsaved edits will be lost.')) {
      setFormData(defaultHomePageSettings);
      toast.info('Reset to default template settings. Click Save to publish.');
    }
  };

  const activeCount = [
    formData.featured_programs_enabled,
    formData.announcements_bar_enabled,
    formData.upcoming_tracks_enabled,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* ─── Hero Customizer Header (Midnight Governance Aesthetic) ─── */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#040814] via-[#07132a] to-[#0a1e3f] text-white shadow-xl border border-cyan-500/30 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-cyan-300 text-xs font-semibold mb-3 border border-white/15">
              <Globe className="w-3.5 h-3.5" />
              <span>Public Landing Page Customizer</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Home Page Detailed Customizer
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Configure, publish, and fine-tune the 3 live landing page sections: Featured Learning Programs, Announcements Marquee Ticker, and Specialized Tracks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all shadow-sm"
            >
              <span>Preview Live Site</span>
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            </a>
            <Button
              onClick={handleSave}
              disabled={isUpdating}
              size="sm"
              className="bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:opacity-95 text-white font-extrabold text-xs h-10 px-5 rounded-xl shadow-lg shadow-cyan-500/30 cursor-pointer"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {isUpdating ? 'Publishing...' : 'Save & Publish'}
            </Button>
          </div>
        </div>

        {/* Quick Summary Pill Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-white font-bold bg-white/10 px-3 py-1 rounded-lg border border-white/10">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>{activeCount} of 3 Sections Active</span>
            </span>
            <span className="text-emerald-300 flex items-center gap-1 font-bold bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Instant Live Sync
            </span>
          </div>

          <button
            onClick={handleReset}
            className="text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* ─── Section Navigation Tabs ─── */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/90 gap-1.5 overflow-x-auto shadow-2xs">
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
              className={`flex-1 min-w-[200px] flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white text-cyan-900 shadow-sm border border-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <tab.icon className={`w-4 h-4 ${isSelected ? 'text-cyan-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                tab.enabled 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-slate-200 text-slate-500 border-slate-300'
              }`}>
                {tab.enabled ? 'Live' : 'Hidden'}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: FEATURED LEARNING PROGRAMS ─── */}
      {activeSectionTab === 'programs' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Main Controls Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span>Section 1: Featured Learning Programs</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">Configure the top 3 course cards displayed prominently near the top of the landing page.</p>
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">
                  {formData.featured_programs_enabled ? 'Section is Live' : 'Section is Hidden'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggle('featured_programs_enabled')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    formData.featured_programs_enabled ? 'bg-cyan-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    formData.featured_programs_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Eyebrow Tag Pill</label>
                <input
                  type="text"
                  value={formData.featured_programs_tag}
                  onChange={(e) => handleInputChange('featured_programs_tag', e.target.value)}
                  placeholder="Top Certified Tracks"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Main Section Heading</label>
                <input
                  type="text"
                  value={formData.featured_programs_title}
                  onChange={(e) => handleInputChange('featured_programs_title', e.target.value)}
                  placeholder="Featured Learning Programs"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Header Button Label</label>
                <input
                  type="text"
                  value={formData.featured_programs_btn_text}
                  onChange={(e) => handleInputChange('featured_programs_btn_text', e.target.value)}
                  placeholder="Explore All Courses"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Section Description / Subtitle</label>
                <textarea
                  rows={2}
                  value={formData.featured_programs_subtitle}
                  onChange={(e) => handleInputChange('featured_programs_subtitle', e.target.value)}
                  placeholder="Explore government-certified, high-impact earth science training tracks..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Featured Cards Customizer */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-600" />
                  <span>Featured Program Cards ({formData.featured_programs_items?.length || 0} Cards)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customize course titles, images, descriptions, and metadata displayed in the card grid.
                </p>
              </div>

              <Button
                onClick={handleAddProgramCard}
                size="sm"
                className="bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-800 text-xs font-bold rounded-xl h-9 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Program Card</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(formData.featured_programs_items || []).map((prog, idx) => (
                <div key={prog.id || idx} className="p-5 rounded-2xl bg-slate-50/70 hover:bg-white border border-slate-200/90 hover:border-cyan-300 hover:shadow-md transition-all space-y-3.5 relative group">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                        Card #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={prog.badge}
                        onChange={(e) => handleProgramItemChange(idx, 'badge', e.target.value)}
                        placeholder="Badge (e.g. Top Rated)"
                        className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-center w-28 focus:outline-none focus:bg-white"
                      />
                    </div>

                    <button
                      onClick={() => handleDeleteProgramCard(idx)}
                      title="Delete card"
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Thumbnail Image Picker & Preview */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-700">Card Photo <span className="font-normal text-slate-400">(800x400, 2:1 ratio)</span></label>
                      {prog.thumbnail_url && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Uploaded</span>
                      )}
                    </div>
                    {prog.thumbnail_url ? (
                      <div className="relative h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group/thumb shadow-xs">
                        <img
                          src={prog.thumbnail_url}
                          alt={prog.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 shadow-md">
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
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-200 hover:border-cyan-400 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 bg-white hover:bg-cyan-50/30 cursor-pointer transition-all">
                        {uploadingIndex === idx ? (
                          <div className="flex items-center gap-2 text-cyan-600 text-xs py-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Uploading image...</span>
                          </div>
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-slate-700">Upload Card Photo</span>
                            <span className="text-[10px] text-slate-400">PNG, JPG, WEBP</span>
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
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Course Title</label>
                    <input
                      type="text"
                      value={prog.title}
                      onChange={(e) => handleProgramItemChange(idx, 'title', e.target.value)}
                      placeholder="e.g. Ocean Observation and Marine Data Analysis"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 shadow-2xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={prog.description}
                      onChange={(e) => handleProgramItemChange(idx, 'description', e.target.value)}
                      placeholder="Brief overview of the program curriculum..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-cyan-500 resize-none shadow-2xs leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Department / Org</label>
                      <input
                        type="text"
                        value={prog.department}
                        onChange={(e) => handleProgramItemChange(idx, 'department', e.target.value)}
                        placeholder="e.g. INCOIS, MoES"
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Duration (Hours)</label>
                      <input
                        type="number"
                        value={prog.duration_hours}
                        onChange={(e) => handleProgramItemChange(idx, 'duration_hours', parseInt(e.target.value) || 60)}
                        placeholder="e.g. 80"
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Trainer / Faculty</label>
                      <input
                        type="text"
                        value={prog.trainer_name}
                        onChange={(e) => handleProgramItemChange(idx, 'trainer_name', e.target.value)}
                        placeholder="e.g. Dr. V. Ramakrishnan"
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Destination Link</label>
                      <input
                        type="text"
                        value={prog.link || '/courses'}
                        onChange={(e) => handleProgramItemChange(idx, 'link', e.target.value)}
                        placeholder="/courses"
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-cyan-700 font-mono focus:outline-none focus:border-cyan-500 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── TAB 2: ANNOUNCEMENTS MARQUEE BAR ─── */}
      {activeSectionTab === 'announcements' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-200">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <span>Section 2: Horizontal Announcement Bar Controls</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">Continuous infinite live announcements ticker situated between Platform Stats and Stakeholder Workspaces.</p>
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">
                  {formData.announcements_bar_enabled ? 'Marquee is Live' : 'Marquee is Hidden'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggle('announcements_bar_enabled')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    formData.announcements_bar_enabled ? 'bg-cyan-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    formData.announcements_bar_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Left Fixed Pill Label</label>
                <input
                  type="text"
                  value={formData.announcements_bar_label}
                  onChange={(e) => handleInputChange('announcements_bar_label', e.target.value)}
                  placeholder="Announcements"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">Scrolling Flow Speed</label>
                  <span className="text-[11px] font-mono text-cyan-800 font-bold bg-cyan-50 px-2.5 py-0.5 rounded-md border border-cyan-200">
                    {formData.announcements_bar_speed || 24}s / cycle
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={[35, 65, 90].includes(formData.announcements_bar_speed) ? formData.announcements_bar_speed : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        handleInputChange('announcements_bar_speed', parseInt(e.target.value) || 65);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-cyan-500 font-medium"
                  >
                    <option value={35}>Brisk (35s cycle)</option>
                    <option value={65}>Comfortable / Slow (65s cycle - Recommended)</option>
                    <option value={90}>Very Slow / Relaxed (90s cycle)</option>
                    <option value="custom">Custom (Enter Seconds)</option>
                  </select>

                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min={4}
                      max={300}
                      value={formData.announcements_bar_speed || 65}
                      onChange={(e) => handleInputChange('announcements_bar_speed', Math.max(1, parseInt(e.target.value) || 65))}
                      placeholder="Custom seconds..."
                      className="w-full pl-3 pr-12 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-none focus:bg-white focus:border-cyan-500"
                    />
                    <span className="absolute right-3 text-xs text-slate-400 pointer-events-none font-bold">sec</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">Lower seconds = faster scroll, higher seconds = slower, more readable cycle.</p>
              </div>
            </div>
          </div>

          {/* Live Items Manager */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-cyan-600" />
                  <span>Custom Live Announcement Items ({(formData.announcements_items || []).length})</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Manage the live messages that cycle continuously in the ticker.</p>
              </div>

              <Button
                onClick={handleAddAnnouncement}
                size="sm"
                className="bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs font-bold rounded-xl h-9 px-3.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {(formData.announcements_items || []).map((item, idx) => (
                <div key={item.id || idx} className="p-4 rounded-2xl bg-slate-50/80 hover:bg-white border border-slate-200/90 hover:border-cyan-300 hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <span className="text-xs font-mono font-bold text-slate-400 shrink-0">#{idx + 1}</span>

                  <div className="w-36 shrink-0">
                    <input
                      type="text"
                      value={item.tag}
                      onChange={(e) => handleAnnouncementItemChange(idx, 'tag', e.target.value)}
                      placeholder="Tag (e.g. MOES LIVE)"
                      className="w-full px-3 py-2 text-[11px] font-extrabold rounded-xl bg-white border border-slate-200 text-cyan-800 uppercase focus:outline-none focus:border-cyan-500 text-center shadow-2xs"
                    />
                  </div>

                  <div className="w-32 shrink-0">
                    <select
                      value={item.tag_color || 'cyan'}
                      onChange={(e) => handleAnnouncementItemChange(idx, 'tag_color', e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:border-cyan-500 shadow-2xs"
                    >
                      <option value="cyan">Cyan Accent</option>
                      <option value="amber">Amber Accent</option>
                      <option value="emerald">Emerald Accent</option>
                      <option value="sky">Sky Accent</option>
                      <option value="purple">Purple Accent</option>
                    </select>
                  </div>

                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleAnnouncementItemChange(idx, 'title', e.target.value)}
                      placeholder="Announcement headline text..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 shadow-2xs font-medium"
                    />
                  </div>

                  <div className="w-32 shrink-0">
                    <input
                      type="text"
                      value={item.link || '/courses'}
                      onChange={(e) => handleAnnouncementItemChange(idx, 'link', e.target.value)}
                      placeholder="Link (/courses)"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-cyan-700 font-mono focus:outline-none focus:border-cyan-500 shadow-2xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteAnnouncement(idx)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shrink-0 cursor-pointer"
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

      {/* ─── TAB 3: SPECIALIZED EARTH SCIENCES TRACKS ─── */}
      {activeSectionTab === 'tracks' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200">
                    <Radio className="w-4 h-4" />
                  </div>
                  <span>Section 3: Specialized Earth Sciences Tracks</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">Upcoming announcements, pre-registration cohorts, and masterclasses preview cards.</p>
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">
                  {formData.upcoming_tracks_enabled ? 'Section is Live' : 'Section is Hidden'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggle('upcoming_tracks_enabled')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    formData.upcoming_tracks_enabled ? 'bg-cyan-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    formData.upcoming_tracks_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Eyebrow Tag Pill</label>
                <input
                  type="text"
                  value={formData.upcoming_tracks_tag}
                  onChange={(e) => handleInputChange('upcoming_tracks_tag', e.target.value)}
                  placeholder="Upcoming Announcements"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Main Section Heading</label>
                <input
                  type="text"
                  value={formData.upcoming_tracks_title}
                  onChange={(e) => handleInputChange('upcoming_tracks_title', e.target.value)}
                  placeholder="Specialized Earth Sciences Tracks."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Catalog Button Text</label>
                <input
                  type="text"
                  value={formData.upcoming_tracks_btn_text}
                  onChange={(e) => handleInputChange('upcoming_tracks_btn_text', e.target.value)}
                  placeholder="View Complete Catalog"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Section Subtitle / Description</label>
                <input
                  type="text"
                  value={formData.upcoming_tracks_subtitle}
                  onChange={(e) => handleInputChange('upcoming_tracks_subtitle', e.target.value)}
                  placeholder="Pre-register for next-generation cohorts and masterclasses."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Individual Track Cards Editor */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-sky-600" />
                  <span>Upcoming Track Cards ({(formData.upcoming_tracks_items || []).length})</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Edit dates, skill tags, format, and pre-registration links for each upcoming cohort card.</p>
              </div>

              <Button
                onClick={handleAddTrack}
                size="sm"
                className="bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs font-bold rounded-xl h-9 px-3.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Track Card
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {(formData.upcoming_tracks_items || []).map((track, idx) => (
                <div key={track.id || idx} className="p-5 rounded-2xl bg-slate-50/70 hover:bg-white border border-slate-200/90 hover:border-cyan-300 hover:shadow-md transition-all space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                      <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200">
                        Track #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTrack(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete track"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Track Title</label>
                      <input
                        type="text"
                        value={track.title}
                        onChange={(e) => handleTrackItemChange(idx, 'title', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-cyan-500 shadow-2xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Pill</label>
                        <input
                          type="text"
                          value={track.status}
                          onChange={(e) => handleTrackItemChange(idx, 'status', e.target.value)}
                          placeholder="Pre-Registration Open"
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 shadow-2xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Level Tag</label>
                        <input
                          type="text"
                          value={track.level}
                          onChange={(e) => handleTrackItemChange(idx, 'level', e.target.value)}
                          placeholder="Advanced Specialist"
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 shadow-2xs font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Start Date</label>
                        <input
                          type="text"
                          value={track.date}
                          onChange={(e) => handleTrackItemChange(idx, 'date', e.target.value)}
                          placeholder="Starts Oct 15, 2026"
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 shadow-2xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Duration</label>
                        <input
                          type="text"
                          value={track.duration}
                          onChange={(e) => handleTrackItemChange(idx, 'duration', e.target.value)}
                          placeholder="4 Weeks"
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 shadow-2xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={track.desc}
                        onChange={(e) => handleTrackItemChange(idx, 'desc', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-cyan-500 resize-none shadow-2xs leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Key Skills (comma-separated)</label>
                      <input
                        type="text"
                        value={track.key_skills}
                        onChange={(e) => handleTrackItemChange(idx, 'key_skills', e.target.value)}
                        placeholder="Polarimetric Refl., Mesocyclone Detection"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Button Text & Link</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={track.btn_text || 'Pre-Register Cohort'}
                        onChange={(e) => handleTrackItemChange(idx, 'btn_text', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-cyan-500 shadow-2xs font-semibold"
                      />
                      <input
                        type="text"
                        value={track.link || '/register'}
                        onChange={(e) => handleTrackItemChange(idx, 'link', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white border border-slate-200 text-cyan-700 font-mono focus:outline-none focus:border-cyan-500 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Bottom Floating Save Action Bar ─── */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-slate-500 font-medium">
          All changes save directly to the platform database and immediately update live for all landing page visitors.
        </p>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={handleReset}
            variant="outline"
            className="border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold h-10 px-4 cursor-pointer"
          >
            Reset Defaults
          </Button>

          <Button
            onClick={handleSave}
            disabled={isUpdating}
            className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:opacity-95 text-white font-extrabold text-xs h-10 px-6 rounded-xl shadow-md shadow-cyan-600/20 cursor-pointer"
          >
            {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
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
