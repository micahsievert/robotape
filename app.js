/**
 * VEX V5 Match Reviewer & Maneuver Tagger
 * High-precision video analysis, interval tagging, rating, match metadata & autonomous breakdown.
 * Supports real-time auto-saving and fully customizable activities & success scales.
 */

(function () {
  'use strict';

  // ==========================================================================
  // Default Data & Constants
  // ==========================================================================

  const STORAGE_KEY_PROJECT = 'vex_reviewer_project_v1';
  const STORAGE_KEY_ACTIVITIES = 'vex_reviewer_activities_v1';
  const STORAGE_KEY_RATINGS = 'vex_reviewer_ratings_v1';
  const STORAGE_KEY_RATING_PRESET = 'vex_reviewer_preset_v1';
  const STORAGE_KEY_DRAFT = 'vex_reviewer_active_draft_v1';

  const DEFAULT_ACTIVITIES = [
    { id: 'act_auton', name: 'Autonomous Routine', color: '#8b5cf6' },
    { id: 'act_intake', name: 'Intake / Collection', color: '#06b6d4' },
    { id: 'act_score_ring', name: 'Ring / Triball Scoring', color: '#10b981' },
    { id: 'act_score_stake', name: 'High Stake / Goal Scoring', color: '#3b82f6' },
    { id: 'act_descore', name: 'Descore / Disruption', color: '#f59e0b' },
    { id: 'act_defense', name: 'Defensive Pin / Block', color: '#ec4899' },
    { id: 'act_maneuver', name: 'Driver Maneuver / Evasion', color: '#6366f1' },
    { id: 'act_climb', name: 'Endgame / Climb / Hang', color: '#eab308' },
    { id: 'act_jam', name: 'Jam / Mechanical Issue', color: '#ef4444' },
    { id: 'act_foul', name: 'Foul / Rule Violation', color: '#dc2626' }
  ];

  const RATING_PRESETS = {
    '5-tier': [
      { id: 'rate_full', label: 'Full Success', color: '#2ea043', weight: 1.0 },
      { id: 'rate_partial', label: 'Partial Success', color: '#d29922', weight: 0.5 },
      { id: 'rate_neutral', label: 'Neutral / Inconsequential', color: '#8b949e', weight: 0.5 },
      { id: 'rate_failed', label: 'Failed / Missed', color: '#db6d28', weight: 0.0 },
      { id: 'rate_disaster', label: 'Disaster / Penalty', color: '#f85149', weight: 0.0 }
    ],
    '3-tier': [
      { id: 'rate_success', label: 'Success', color: '#2ea043', weight: 1.0 },
      { id: 'rate_partial', label: 'Partial', color: '#d29922', weight: 0.5 },
      { id: 'rate_fail', label: 'Failure', color: '#f85149', weight: 0.0 }
    ],
    '1-5-numeric': [
      { id: 'rate_5', label: '5 - Flawless', color: '#2ea043', weight: 1.0 },
      { id: 'rate_4', label: '4 - Good', color: '#388bfd', weight: 0.8 },
      { id: 'rate_3', label: '3 - Average', color: '#d29922', weight: 0.6 },
      { id: 'rate_2', label: '2 - Poor', color: '#db6d28', weight: 0.3 },
      { id: 'rate_1', label: '1 - Critical Fail', color: '#f85149', weight: 0.0 }
    ],
    'binary': [
      { id: 'rate_pass', label: 'Pass / Success', color: '#2ea043', weight: 1.0 },
      { id: 'rate_fail', label: 'Fail / Missed', color: '#f85149', weight: 0.0 }
    ]
  };

  // ==========================================================================
  // Application State
  // ==========================================================================

  const state = {
    matches: [],
    activeMatchId: null,
    activities: [],
    ratings: [],
    activeRatingPreset: '5-tier',
    selectedRating: null,
    currentIn: null,        // Start time in seconds
    currentOut: null,       // End time in seconds
    fps: 30,
    videoDuration: 0,
    videoLoaded: false,
    activeLoopInterval: null,
    previewingActionId: null
  };

  // ==========================================================================
  // DOM Elements
  // ==========================================================================

  const DOM = {
    // Header
    matchSelect: document.getElementById('matchSelect'),
    matchNameInput: document.getElementById('matchNameInput'),
    matchMetaBtn: document.getElementById('matchMetaBtn'),
    autonReviewBtn: document.getElementById('autonReviewBtn'),
    newMatchBtn: document.getElementById('newMatchBtn'),
    deleteMatchBtn: document.getElementById('deleteMatchBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    exportAllCsvBtn: document.getElementById('exportAllCsvBtn'),
    exportMatchSummaryCsvBtn: document.getElementById('exportMatchSummaryCsvBtn'),
    importCsvHeaderInput: document.getElementById('importCsvHeaderInput'),
    importCsvMenuInput: document.getElementById('importCsvMenuInput'),
    importCsvSettingsInput: document.getElementById('importCsvSettingsInput'),
    importCsvDropInput: document.getElementById('importCsvDropInput'),
    exportJsonBtn: document.getElementById('exportJsonBtn'),
    importJsonInput: document.getElementById('importJsonInput'),
    shortcutsBtn: document.getElementById('shortcutsBtn'),
    moreActionsBtn: document.getElementById('moreActionsBtn'),
    moreActionsMenu: document.getElementById('moreActionsMenu'),
    settingsBtn: document.getElementById('settingsBtn'),
    menuSettingsBtn: document.getElementById('menuSettingsBtn'),
    clearMatchDataBtn: document.getElementById('clearMatchDataBtn'),

    // Auto-save badge
    autoSaveBadge: document.getElementById('autoSaveBadge'),
    autoSaveDot: document.getElementById('autoSaveDot'),
    autoSaveText: document.getElementById('autoSaveText'),

    // Match Meta Banner
    matchMetaBanner: document.getElementById('matchMetaBanner'),
    metaBannerResultPill: document.getElementById('metaBannerResultPill'),
    metaBannerResultVal: document.getElementById('metaBannerResultVal'),
    metaBannerAutonPill: document.getElementById('metaBannerAutonPill'),
    metaBannerAutonVal: document.getElementById('metaBannerAutonVal'),
    metaBannerAlliancePill: document.getElementById('metaBannerAlliancePill'),
    metaBannerAllianceVal: document.getElementById('metaBannerAllianceVal'),

    // Video & Drop zone
    videoDropZone: document.getElementById('videoDropZone'),
    emptyDropPrompt: document.getElementById('emptyDropPrompt'),
    videoFileInput: document.getElementById('videoFileInput'),
    switchVideoInput: document.getElementById('switchVideoInput'),
    videoPlayer: document.getElementById('videoPlayer'),
    videoFileInfo: document.getElementById('videoFileInfo'),
    videoFileName: document.getElementById('videoFileName'),

    // Readout & Timeline
    currentTimeDisplay: document.getElementById('currentTimeDisplay'),
    durationDisplay: document.getElementById('durationDisplay'),
    currentFrameDisplay: document.getElementById('currentFrameDisplay'),
    fpsSelect: document.getElementById('fpsSelect'),
    timelineTrackWrapper: document.getElementById('timelineTrackWrapper'),
    timelineTrack: document.getElementById('timelineTrack'),
    timelinePlayhead: document.getElementById('timelinePlayhead'),
    timelineActionsOverlay: document.getElementById('timelineActionsOverlay'),
    timelineRangeHighlight: document.getElementById('timelineRangeHighlight'),
    timelineInMarker: document.getElementById('timelineInMarker'),
    timelineOutMarker: document.getElementById('timelineOutMarker'),
    timelineTooltip: document.getElementById('timelineTooltip'),

    // Transport controls
    playPauseBtn: document.getElementById('playPauseBtn'),
    playPauseIcon: document.getElementById('playPauseIcon'),
    stepBackFrameBtn: document.getElementById('stepBackFrameBtn'),
    stepForwardFrameBtn: document.getElementById('stepForwardFrameBtn'),
    jumpBack1sBtn: document.getElementById('jumpBack1sBtn'),
    jumpFwd1sBtn: document.getElementById('jumpFwd1sBtn'),
    jumpBack5sBtn: document.getElementById('jumpBack5sBtn'),
    jumpFwd5sBtn: document.getElementById('jumpFwd5sBtn'),
    setInBtn: document.getElementById('setInBtn'),
    setOutBtn: document.getElementById('setOutBtn'),
    previewSegmentBtn: document.getElementById('previewSegmentBtn'),
    clearMarkersBtn: document.getElementById('clearMarkersBtn'),
    speedButtons: document.querySelectorAll('.btn-speed'),

    // Tagging form
    currentIntervalBadge: document.getElementById('currentIntervalBadge'),
    actionForm: document.getElementById('actionForm'),
    startTimeInput: document.getElementById('startTimeInput'),
    endTimeInput: document.getElementById('endTimeInput'),
    intervalDurationDisplay: document.getElementById('intervalDurationDisplay'),
    useCurrentAsStartBtn: document.getElementById('useCurrentAsStartBtn'),
    useCurrentAsEndBtn: document.getElementById('useCurrentAsEndBtn'),
    seekStartBtn: document.getElementById('seekStartBtn'),
    seekEndBtn: document.getElementById('seekEndBtn'),
    activitySelect: document.getElementById('activitySelect'),
    openActivityModalBtn: document.getElementById('openActivityModalBtn'),
    openRatingSettingsBtn: document.getElementById('openRatingSettingsBtn'),
    ratingButtonGroup: document.getElementById('ratingButtonGroup'),
    ratingSelect: document.getElementById('ratingSelect'),
    notesInput: document.getElementById('notesInput'),
    quickTagsContainer: document.getElementById('quickTagsContainer'),
    saveActionBtn: document.getElementById('saveActionBtn'),
    resetFormBtn: document.getElementById('resetFormBtn'),

    // Table & stats
    actionsTable: document.getElementById('actionsTable'),
    actionsTableBody: document.getElementById('actionsTableBody'),
    actionsCountBadge: document.getElementById('actionsCountBadge'),
    emptyTableMessage: document.getElementById('emptyTableMessage'),
    filterActivitySelect: document.getElementById('filterActivitySelect'),
    filterRatingSelect: document.getElementById('filterRatingSelect'),
    searchNotesInput: document.getElementById('searchNotesInput'),
    statTotalCount: document.getElementById('statTotalCount'),
    statSuccessRate: document.getElementById('statSuccessRate'),
    statTotalDuration: document.getElementById('statTotalDuration'),
    statTopActivity: document.getElementById('statTopActivity'),
    statsMatchName: document.getElementById('statsMatchName'),
    activityDistributionBar: document.getElementById('activityDistributionBar'),

    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    settingsActivityCount: document.getElementById('settingsActivityCount'),
    settingsRatingCount: document.getElementById('settingsRatingCount'),
    newActivityNameInput: document.getElementById('newActivityNameInput'),
    newActivityColorInput: document.getElementById('newActivityColorInput'),
    addActivityBtn: document.getElementById('addActivityBtn'),
    activityListContainer: document.getElementById('activityListContainer'),
    restoreDefaultActivitiesBtn: document.getElementById('restoreDefaultActivitiesBtn'),

    ratingTierListContainer: document.getElementById('ratingTierListContainer'),
    newRatingLabelInput: document.getElementById('newRatingLabelInput'),
    newRatingColorInput: document.getElementById('newRatingColorInput'),
    newRatingWeightSelect: document.getElementById('newRatingWeightSelect'),
    addRatingTierBtn: document.getElementById('addRatingTierBtn'),
    restoreDefaultRatingsBtn: document.getElementById('restoreDefaultRatingsBtn'),

    storageMatchCount: document.getElementById('storageMatchCount'),
    storageActionCount: document.getElementById('storageActionCount'),
    storageDraftStatus: document.getElementById('storageDraftStatus'),
    storageSizeEstimate: document.getElementById('storageSizeEstimate'),
    backupJsonSettingsBtn: document.getElementById('backupJsonSettingsBtn'),
    importJsonSettingsInput: document.getElementById('importJsonSettingsInput'),
    clearAllProjectDataBtn: document.getElementById('clearAllProjectDataBtn'),

    // Match Metadata Modal
    matchMetaModal: document.getElementById('matchMetaModal'),
    metaAllianceRedBtn: document.getElementById('metaAllianceRedBtn'),
    metaAllianceBlueBtn: document.getElementById('metaAllianceBlueBtn'),
    metaOutcomeWinBtn: document.getElementById('metaOutcomeWinBtn'),
    metaOutcomeLossBtn: document.getElementById('metaOutcomeLossBtn'),
    metaOutcomeTieBtn: document.getElementById('metaOutcomeTieBtn'),
    metaOurScoreInput: document.getElementById('metaOurScoreInput'),
    metaOppScoreInput: document.getElementById('metaOppScoreInput'),
    metaAutonWinnerSelect: document.getElementById('metaAutonWinnerSelect'),
    metaAwpCheckbox: document.getElementById('metaAwpCheckbox'),
    metaPartnerNumberInput: document.getElementById('metaPartnerNumberInput'),
    metaPartnerRankInput: document.getElementById('metaPartnerRankInput'),
    metaPartnerWpInput: document.getElementById('metaPartnerWpInput'),
    metaPartnerApInput: document.getElementById('metaPartnerApInput'),
    metaPartnerSpInput: document.getElementById('metaPartnerSpInput'),
    metaPartnerNotesInput: document.getElementById('metaPartnerNotesInput'),
    metaOpp1NumberInput: document.getElementById('metaOpp1NumberInput'),
    metaOpp1RankInput: document.getElementById('metaOpp1RankInput'),
    metaOpp1WpInput: document.getElementById('metaOpp1WpInput'),
    metaOpp1ApInput: document.getElementById('metaOpp1ApInput'),
    metaOpp1SpInput: document.getElementById('metaOpp1SpInput'),
    metaOpp1NotesInput: document.getElementById('metaOpp1NotesInput'),
    metaOpp2NumberInput: document.getElementById('metaOpp2NumberInput'),
    metaOpp2RankInput: document.getElementById('metaOpp2RankInput'),
    metaOpp2WpInput: document.getElementById('metaOpp2WpInput'),
    metaOpp2ApInput: document.getElementById('metaOpp2ApInput'),
    metaOpp2SpInput: document.getElementById('metaOpp2SpInput'),
    metaOpp2NotesInput: document.getElementById('metaOpp2NotesInput'),
    metaGeneralNotesInput: document.getElementById('metaGeneralNotesInput'),

    // Autonomous Review Modal
    autonReviewModal: document.getElementById('autonReviewModal'),
    autonEfficiencyDisplay: document.getElementById('autonEfficiencyDisplay'),
    autonPointsBreakdownDisplay: document.getElementById('autonPointsBreakdownDisplay'),
    autonBonusStatusPill: document.getElementById('autonBonusStatusPill'),
    autonProgressBar: document.getElementById('autonProgressBar'),
    autonRoutineNameInput: document.getElementById('autonRoutineNameInput'),
    autonStartPositionSelect: document.getElementById('autonStartPositionSelect'),
    autonCodedMaxInput: document.getElementById('autonCodedMaxInput'),
    autonActualPointsInput: document.getElementById('autonActualPointsInput'),
    autonBonusWonSelect: document.getElementById('autonBonusWonSelect'),
    autonAwpCheckbox: document.getElementById('autonAwpCheckbox'),
    autonIssueTagsContainer: document.getElementById('autonIssueTagsContainer'),
    autonNotesInput: document.getElementById('autonNotesInput'),

    // Edit Modal
    editActionModal: document.getElementById('editActionModal'),
    editActionForm: document.getElementById('editActionForm'),
    editActionId: document.getElementById('editActionId'),
    editStartTimeInput: document.getElementById('editStartTimeInput'),
    editEndTimeInput: document.getElementById('editEndTimeInput'),
    editActivitySelect: document.getElementById('editActivitySelect'),
    editRatingSelect: document.getElementById('editRatingSelect'),
    editNotesInput: document.getElementById('editNotesInput'),

    // Shortcuts Modal
    shortcutsModal: document.getElementById('shortcutsModal')
  };

  // ==========================================================================
  // Real-Time Auto-Save Indicator
  // ==========================================================================

  let autoSaveTimer = null;

  function triggerAutoSaveIndicator(detail = 'Auto-saved') {
    if (!DOM.autoSaveDot || !DOM.autoSaveText) return;

    DOM.autoSaveDot.classList.add('saving');
    DOM.autoSaveText.textContent = 'Saving...';

    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      DOM.autoSaveDot.classList.remove('saving');
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      DOM.autoSaveText.textContent = `Auto-saved (${timeStr})`;
      if (DOM.autoSaveBadge) {
        DOM.autoSaveBadge.title = `All changes automatically saved to local storage at ${timeStr}`;
      }
      updateStorageStats();
    }, 280);
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  function init() {
    loadActivities();
    loadRatings();
    loadProject();
    setupEventListeners();
    updateUI();
    restoreDraft();
    triggerAutoSaveIndicator('Loaded project');
  }

  // ==========================================================================
  // Persistence & State Management
  // ==========================================================================

  function loadActivities() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
      if (stored) {
        state.activities = JSON.parse(stored);
      } else {
        state.activities = [...DEFAULT_ACTIVITIES];
        saveActivities(false);
      }
    } catch (e) {
      console.error('Failed to load activities', e);
      state.activities = [...DEFAULT_ACTIVITIES];
    }
  }

  function saveActivities(triggerIndicator = true) {
    localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(state.activities));
    if (triggerIndicator) triggerAutoSaveIndicator('Saved activities');
    updateCounts();
  }

  function loadRatings() {
    try {
      const storedPreset = localStorage.getItem(STORAGE_KEY_RATING_PRESET);
      if (storedPreset) state.activeRatingPreset = storedPreset;

      const stored = localStorage.getItem(STORAGE_KEY_RATINGS);
      if (stored) {
        state.ratings = JSON.parse(stored);
      } else {
        state.ratings = JSON.parse(JSON.stringify(RATING_PRESETS['5-tier']));
        saveRatings(false);
      }
    } catch (e) {
      console.error('Failed to load ratings', e);
      state.ratings = JSON.parse(JSON.stringify(RATING_PRESETS['5-tier']));
    }

    if (!state.selectedRating && state.ratings.length > 0) {
      state.selectedRating = state.ratings[0].label;
    }
  }

  function saveRatings(triggerIndicator = true) {
    localStorage.setItem(STORAGE_KEY_RATINGS, JSON.stringify(state.ratings));
    localStorage.setItem(STORAGE_KEY_RATING_PRESET, state.activeRatingPreset);
    if (triggerIndicator) triggerAutoSaveIndicator('Saved success scale');
    updateCounts();
  }

  function loadProject() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROJECT);
      if (stored) {
        const data = JSON.parse(stored);
        state.matches = data.matches || [];
        state.activeMatchId = data.activeMatchId || (state.matches[0] ? state.matches[0].id : null);
      }
    } catch (e) {
      console.error('Failed to load project from localStorage', e);
    }

    // Default to at least 1 match if none exist
    if (!state.matches || state.matches.length === 0) {
      const defaultMatch = createNewMatchObject('Match 1');
      state.matches = [defaultMatch];
      state.activeMatchId = defaultMatch.id;
      saveProject(false);
    }

    // Ensure all matches have meta and auton fields initialized
    state.matches.forEach(m => {
      ensureMatchFields(m);
    });

    if (!getActiveMatch()) {
      state.activeMatchId = state.matches[0].id;
    }
  }

  function ensureMatchFields(m) {
    if (!m.meta) {
      m.meta = {
        ourAlliance: 'Red',
        outcome: 'Unplayed',
        ourScore: '',
        opponentScore: '',
        autonWinner: 'None',
        awpEarned: false,
        partner: { number: '', rank: '', wp: '', ap: '', sp: '', notes: '' },
        opp1: { number: '', rank: '', wp: '', ap: '', sp: '', notes: '' },
        opp2: { number: '', rank: '', wp: '', ap: '', sp: '', notes: '' },
        generalNotes: ''
      };
    }
    if (!m.auton) {
      m.auton = {
        routineName: '',
        startPosition: 'Red Left',
        codedMaxPoints: '',
        actualPoints: '',
        bonusWon: 'None',
        awpSecured: false,
        issueTags: [],
        notes: ''
      };
    }
    if (!m.actions) m.actions = [];
  }

  function saveProject(triggerIndicator = true) {
    const data = {
      version: 1,
      matches: state.matches,
      activeMatchId: state.activeMatchId,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY_PROJECT, JSON.stringify(data));
    if (triggerIndicator) triggerAutoSaveIndicator('Saved project');
    updateStorageStats();
    updateMatchMetaBanner();
  }

  function createNewMatchObject(name) {
    return {
      id: 'match_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name || `Match ${state.matches.length + 1}`,
      videoFileName: '',
      fps: 30,
      meta: {
        ourAlliance: 'Red',
        outcome: 'Unplayed',
        ourScore: '',
        opponentScore: '',
        autonWinner: 'None',
        awpEarned: false,
        partner: { number: '', rank: '', wp: '', ap: '', sp: '', notes: '' },
        opp1: { number: '', rank: '', wp: '', ap: '', sp: '', notes: '' },
        opp2: { number: '', rank: '', wp: '', ap: '', sp: '', notes: '' },
        generalNotes: ''
      },
      auton: {
        routineName: '',
        startPosition: 'Red Left',
        codedMaxPoints: '',
        actualPoints: '',
        bonusWon: 'None',
        awpSecured: false,
        issueTags: [],
        notes: ''
      },
      actions: []
    };
  }

  function getActiveMatch() {
    return state.matches.find(m => m.id === state.activeMatchId) || state.matches[0];
  }

  // ==========================================================================
  // Draft Auto-Saving (Preserves incomplete in-point/out-point/notes on reload)
  // ==========================================================================

  function saveDraft() {
    const startVal = DOM.startTimeInput.value;
    const endVal = DOM.endTimeInput.value;
    const notesVal = DOM.notesInput.value;

    if (state.currentIn !== null || state.currentOut !== null || notesVal.trim()) {
      const draft = {
        matchId: state.activeMatchId,
        startTime: startVal,
        endTime: endVal,
        currentIn: state.currentIn,
        currentOut: state.currentOut,
        activity: DOM.activitySelect.value,
        rating: state.selectedRating,
        notes: notesVal,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(draft));
      triggerAutoSaveIndicator('Draft autosaved');
    } else {
      clearDraft();
    }
  }

  function restoreDraft() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DRAFT);
      if (!stored) return;
      const draft = JSON.parse(stored);
      if (draft && draft.matchId === state.activeMatchId) {
        if (draft.startTime) DOM.startTimeInput.value = draft.startTime;
        if (draft.endTime) DOM.endTimeInput.value = draft.endTime;
        if (draft.currentIn !== undefined) state.currentIn = draft.currentIn;
        if (draft.currentOut !== undefined) state.currentOut = draft.currentOut;
        if (draft.activity) DOM.activitySelect.value = draft.activity;
        if (draft.rating) selectRating(draft.rating);
        if (draft.notes) DOM.notesInput.value = draft.notes;

        updateIntervalDurationDisplay();
        updateTimelineMarkers();
      }
    } catch (e) {
      console.error('Failed to restore draft', e);
    }
  }

  function clearDraft() {
    localStorage.removeItem(STORAGE_KEY_DRAFT);
  }

  // ==========================================================================
  // Time & String Formatting Utilities
  // ==========================================================================

  function formatTime(seconds, includeMillis = true) {
    if (isNaN(seconds) || seconds === null || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    const minStr = String(mins).padStart(2, '0');
    const secStr = String(secs).padStart(2, '0');
    const msStr = String(ms).padStart(3, '0');

    return includeMillis ? `${minStr}:${secStr}.${msStr}` : `${minStr}:${secStr}`;
  }

  function parseTime(str) {
    if (typeof str === 'number') return str;
    if (!str || typeof str !== 'string') return 0;
    str = str.trim();

    if (str.includes(':')) {
      const parts = str.split(':');
      if (parts.length === 2) {
        const mins = parseFloat(parts[0]) || 0;
        const secs = parseFloat(parts[1]) || 0;
        return mins * 60 + secs;
      } else if (parts.length === 3) {
        const hrs = parseFloat(parts[0]) || 0;
        const mins = parseFloat(parts[1]) || 0;
        const secs = parseFloat(parts[2]) || 0;
        return hrs * 3600 + mins * 60 + secs;
      }
    }
    return parseFloat(str) || 0;
  }

  function escapeCsvValue(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  // ==========================================================================
  // Video Player Controls
  // ==========================================================================

  function loadVideoFile(file) {
    if (!file) return;
    const fileUrl = URL.createObjectURL(file);
    DOM.videoPlayer.src = fileUrl;
    DOM.videoPlayer.classList.remove('hidden');
    DOM.emptyDropPrompt.classList.add('hidden');
    DOM.videoFileInfo.classList.remove('hidden');
    DOM.videoFileName.textContent = file.name;

    const currentMatch = getActiveMatch();
    if (currentMatch) {
      currentMatch.videoFileName = file.name;
      saveProject();
    }

    state.videoLoaded = true;
    DOM.videoPlayer.load();

    DOM.videoPlayer.onloadedmetadata = () => {
      state.videoDuration = DOM.videoPlayer.duration;
      DOM.durationDisplay.textContent = formatTime(state.videoDuration);
      updateTimelinePlayhead();
      renderTimelineActions();
      updateStats();
    };
  }

  function togglePlayPause() {
    if (!state.videoLoaded) return;
    if (DOM.videoPlayer.paused) {
      stopLooping();
      DOM.videoPlayer.play();
      DOM.playPauseIcon.textContent = '⏸';
    } else {
      DOM.videoPlayer.pause();
      DOM.playPauseIcon.textContent = '▶';
    }
  }

  function stepFrame(frames) {
    if (!state.videoLoaded) return;
    DOM.videoPlayer.pause();
    DOM.playPauseIcon.textContent = '▶';
    stopLooping();

    const frameDuration = 1 / state.fps;
    const newTime = DOM.videoPlayer.currentTime + (frames * frameDuration);
    DOM.videoPlayer.currentTime = Math.max(0, Math.min(state.videoDuration, newTime));
  }

  function jumpSeconds(delta) {
    if (!state.videoLoaded) return;
    stopLooping();
    const newTime = DOM.videoPlayer.currentTime + delta;
    DOM.videoPlayer.currentTime = Math.max(0, Math.min(state.videoDuration, newTime));
  }

  function setPlaybackRate(rate) {
    DOM.videoPlayer.playbackRate = rate;
    DOM.speedButtons.forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.speed) === rate);
    });
  }

  function stopLooping() {
    if (state.activeLoopInterval) {
      clearInterval(state.activeLoopInterval);
      state.activeLoopInterval = null;
    }
    state.previewingActionId = null;
    document.querySelectorAll('.actions-table tr').forEach(r => r.classList.remove('active-row'));
  }

  function playSegment(startTime, endTime, loop = false, actionId = null) {
    if (!state.videoLoaded) return;
    stopLooping();

    if (actionId) {
      state.previewingActionId = actionId;
      highlightTableRow(actionId);
    }

    DOM.videoPlayer.currentTime = Math.max(0, startTime);
    DOM.videoPlayer.play();
    DOM.playPauseIcon.textContent = '⏸';

    const checkInterval = setInterval(() => {
      if (DOM.videoPlayer.currentTime >= endTime || DOM.videoPlayer.paused) {
        if (loop && !DOM.videoPlayer.paused) {
          DOM.videoPlayer.currentTime = startTime;
        } else {
          DOM.videoPlayer.pause();
          DOM.playPauseIcon.textContent = '▶';
          clearInterval(checkInterval);
          state.activeLoopInterval = null;
        }
      }
    }, 25);

    state.activeLoopInterval = checkInterval;
  }

  // ==========================================================================
  // Timeline Scrubber & Marker Visuals
  // ==========================================================================

  function updateTimelinePlayhead() {
    if (!state.videoDuration) return;
    const currentTime = DOM.videoPlayer.currentTime;
    const pct = (currentTime / state.videoDuration) * 100;
    DOM.timelinePlayhead.style.left = `${pct}%`;

    DOM.currentTimeDisplay.textContent = formatTime(currentTime);
    const currentFrame = Math.floor(currentTime * state.fps);
    DOM.currentFrameDisplay.textContent = currentFrame;
  }

  function updateTimelineMarkers() {
    if (!state.videoDuration) {
      DOM.timelineInMarker.classList.add('hidden');
      DOM.timelineOutMarker.classList.add('hidden');
      DOM.timelineRangeHighlight.classList.add('hidden');
      return;
    }

    if (state.currentIn !== null) {
      const inPct = (state.currentIn / state.videoDuration) * 100;
      DOM.timelineInMarker.style.left = `${inPct}%`;
      DOM.timelineInMarker.classList.remove('hidden');
    } else {
      DOM.timelineInMarker.classList.add('hidden');
    }

    if (state.currentOut !== null) {
      const outPct = (state.currentOut / state.videoDuration) * 100;
      DOM.timelineOutMarker.style.left = `${outPct}%`;
      DOM.timelineOutMarker.classList.remove('hidden');
    } else {
      DOM.timelineOutMarker.classList.add('hidden');
    }

    if (state.currentIn !== null && state.currentOut !== null && state.currentOut >= state.currentIn) {
      const inPct = (state.currentIn / state.videoDuration) * 100;
      const outPct = (state.currentOut / state.videoDuration) * 100;
      const widthPct = outPct - inPct;

      DOM.timelineRangeHighlight.style.left = `${inPct}%`;
      DOM.timelineRangeHighlight.style.width = `${widthPct}%`;
      DOM.timelineRangeHighlight.classList.remove('hidden');

      const dur = (state.currentOut - state.currentIn).toFixed(2);
      DOM.currentIntervalBadge.textContent = `${formatTime(state.currentIn)} → ${formatTime(state.currentOut)} (${dur}s)`;
    } else if (state.currentIn !== null) {
      DOM.timelineRangeHighlight.classList.add('hidden');
      DOM.currentIntervalBadge.textContent = `Start set: ${formatTime(state.currentIn)}`;
    } else {
      DOM.timelineRangeHighlight.classList.add('hidden');
      DOM.currentIntervalBadge.textContent = 'No Interval Selected';
    }
  }

  function renderTimelineActions() {
    DOM.timelineActionsOverlay.innerHTML = '';
    if (!state.videoDuration) return;

    const match = getActiveMatch();
    if (!match || !match.actions) return;

    match.actions.forEach(action => {
      const startPct = (action.startTime / state.videoDuration) * 100;
      const endPct = (action.endTime / state.videoDuration) * 100;
      const widthPct = Math.max(0.5, endPct - startPct);

      const block = document.createElement('div');
      block.className = 'timeline-action-block';
      block.style.left = `${startPct}%`;
      block.style.width = `${widthPct}%`;

      const activityDef = state.activities.find(a => a.name === action.activity);
      const color = activityDef ? activityDef.color : '#3b82f6';
      block.style.backgroundColor = color;

      block.title = `[#${action.index}] ${action.activity} (${action.rating})\nTime: ${formatTime(action.startTime)} - ${formatTime(action.endTime)}\nNotes: ${action.notes || 'none'}`;

      block.addEventListener('click', (e) => {
        e.stopPropagation();
        playSegment(action.startTime, action.endTime, false, action.id);
      });

      DOM.timelineActionsOverlay.appendChild(block);
    });
  }

  // ==========================================================================
  // In / Out Point Tagging Logic
  // ==========================================================================

  function setInPoint(time = null) {
    const t = (time !== null) ? time : DOM.videoPlayer.currentTime;
    state.currentIn = Math.max(0, t);
    DOM.startTimeInput.value = formatTime(state.currentIn);
    updateIntervalDurationDisplay();
    updateTimelineMarkers();
    saveDraft();
  }

  function setOutPoint(time = null) {
    const t = (time !== null) ? time : DOM.videoPlayer.currentTime;
    state.currentOut = Math.max(0, t);
    DOM.endTimeInput.value = formatTime(state.currentOut);
    updateIntervalDurationDisplay();
    updateTimelineMarkers();
    saveDraft();

    // Auto-focus notes input for frictionless workflow
    DOM.notesInput.focus();
  }

  function updateIntervalDurationDisplay() {
    const start = parseTime(DOM.startTimeInput.value);
    const end = parseTime(DOM.endTimeInput.value);

    if (start !== null && end !== null && end >= start) {
      const duration = (end - start).toFixed(2);
      DOM.intervalDurationDisplay.textContent = `${duration}s`;
    } else {
      DOM.intervalDurationDisplay.textContent = '0.00s';
    }
  }

  function clearMarkers() {
    state.currentIn = null;
    state.currentOut = null;
    DOM.startTimeInput.value = '';
    DOM.endTimeInput.value = '';
    DOM.intervalDurationDisplay.textContent = '0.00s';
    updateTimelineMarkers();
    clearDraft();
  }

  // ==========================================================================
  // Maneuver Logging & Form Handling
  // ==========================================================================

  function handleSaveAction(e) {
    if (e) e.preventDefault();

    const start = parseTime(DOM.startTimeInput.value);
    const end = parseTime(DOM.endTimeInput.value);

    if (isNaN(start) || isNaN(end) || end < start) {
      alert('Please set a valid Start and End time (End time must be after Start time).');
      return;
    }

    const activity = DOM.activitySelect.value;
    const rating = state.selectedRating || (state.ratings[0] ? state.ratings[0].label : 'Success');
    const notes = DOM.notesInput.value.trim();

    const match = getActiveMatch();
    const actionIndex = (match.actions.length || 0) + 1;

    const newAction = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      index: actionIndex,
      startTime: Number(start.toFixed(3)),
      endTime: Number(end.toFixed(3)),
      duration: Number((end - start).toFixed(3)),
      activity: activity,
      rating: rating,
      notes: notes,
      createdAt: new Date().toISOString()
    };

    match.actions.push(newAction);
    match.actions.sort((a, b) => a.startTime - b.startTime);
    match.actions.forEach((a, i) => a.index = i + 1);

    saveProject();
    clearDraft();

    // Reset tagging form fields for next action
    clearMarkers();
    DOM.notesInput.value = '';

    renderTable();
    renderTimelineActions();
    updateStats();

    // Flash success button feedback
    DOM.saveActionBtn.textContent = '✅ Saved!';
    setTimeout(() => {
      DOM.saveActionBtn.innerHTML = '💾 Save Maneuver <span class="kbd-hint">Enter</span>';
    }, 850);
  }

  function deleteAction(actionId) {
    const match = getActiveMatch();
    if (!match) return;

    if (!confirm('Are you sure you want to delete this logged maneuver?')) return;

    match.actions = match.actions.filter(a => a.id !== actionId);
    match.actions.forEach((a, i) => a.index = i + 1);
    saveProject();

    renderTable();
    renderTimelineActions();
    updateStats();
  }

  function openEditModal(actionId) {
    const match = getActiveMatch();
    const action = match.actions.find(a => a.id === actionId);
    if (!action) return;

    DOM.editActionId.value = action.id;
    DOM.editStartTimeInput.value = formatTime(action.startTime);
    DOM.editEndTimeInput.value = formatTime(action.endTime);

    populateActivitySelects();
    populateRatingSelects();

    DOM.editActivitySelect.value = action.activity;
    DOM.editRatingSelect.value = action.rating;
    DOM.editNotesInput.value = action.notes || '';

    DOM.editActionModal.classList.remove('hidden');
  }

  function handleSaveEdit(e) {
    e.preventDefault();
    const actionId = DOM.editActionId.value;
    const match = getActiveMatch();
    const action = match.actions.find(a => a.id === actionId);
    if (!action) return;

    const start = parseTime(DOM.editStartTimeInput.value);
    const end = parseTime(DOM.editEndTimeInput.value);

    if (isNaN(start) || isNaN(end) || end < start) {
      alert('End time must be after Start time.');
      return;
    }

    action.startTime = Number(start.toFixed(3));
    action.endTime = Number(end.toFixed(3));
    action.duration = Number((end - start).toFixed(3));
    action.activity = DOM.editActivitySelect.value;
    action.rating = DOM.editRatingSelect.value;
    action.notes = DOM.editNotesInput.value.trim();

    match.actions.sort((a, b) => a.startTime - b.startTime);
    match.actions.forEach((a, i) => a.index = i + 1);
    saveProject();

    DOM.editActionModal.classList.add('hidden');
    renderTable();
    renderTimelineActions();
    updateStats();
  }

  // ==========================================================================
  // Render Actions Table & Filtering
  // ==========================================================================

  function renderTable() {
    const match = getActiveMatch();
    const actions = match ? (match.actions || []) : [];

    DOM.actionsCountBadge.textContent = `${actions.length} action${actions.length === 1 ? '' : 's'}`;

    const filterActivity = DOM.filterActivitySelect.value;
    const filterRating = DOM.filterRatingSelect.value;
    const searchTerm = DOM.searchNotesInput.value.toLowerCase().trim();

    const filtered = actions.filter(action => {
      if (filterActivity !== 'ALL' && action.activity !== filterActivity) return false;
      if (filterRating !== 'ALL' && action.rating !== filterRating) return false;
      if (searchTerm && !action.notes.toLowerCase().includes(searchTerm)) return false;
      return true;
    });

    if (filtered.length === 0) {
      DOM.actionsTableBody.innerHTML = '';
      DOM.emptyTableMessage.classList.remove('hidden');
      if (actions.length > 0) {
        DOM.emptyTableMessage.innerHTML = '<p>No maneuvers match the active filter criteria.</p>';
      } else {
        DOM.emptyTableMessage.innerHTML = '<p>No maneuvers logged for this match yet.</p><p class="subtext">Use <kbd>[</kbd> to set start, <kbd>]</kbd> to set end, pick an activity, and press <kbd>Enter</kbd> to save!</p>';
      }
      return;
    }

    DOM.emptyTableMessage.classList.add('hidden');

    DOM.actionsTableBody.innerHTML = filtered.map(action => {
      const activityDef = state.activities.find(a => a.name === action.activity);
      const activityColor = activityDef ? activityDef.color : '#3b82f6';

      const ratingDef = state.ratings.find(r => r.label === action.rating);
      const ratingColor = ratingDef ? ratingDef.color : '#8b949e';

      return `
        <tr data-action-id="${action.id}" class="${state.previewingActionId === action.id ? 'active-row' : ''}">
          <td><strong>#${action.index}</strong></td>
          <td class="mono">
            <span class="clickable-time" onclick="window.seekToTime(${action.startTime})">${formatTime(action.startTime)}</span>
            <span class="text-dim">→</span>
            <span class="clickable-time" onclick="window.seekToTime(${action.endTime})">${formatTime(action.endTime)}</span>
          </td>
          <td class="mono text-muted">${action.duration.toFixed(1)}s</td>
          <td>
            <span class="action-badge" style="background-color: ${activityColor}25; color: ${activityColor}; border: 1px solid ${activityColor}60;">
              ${escapeHtml(action.activity)}
            </span>
          </td>
          <td>
            <span class="rating-pill" style="background-color: ${ratingColor}22; color: ${ratingColor}; border: 1px solid ${ratingColor}55;">
              ${escapeHtml(action.rating)}
            </span>
          </td>
          <td>${escapeHtml(action.notes || '—')}</td>
          <td class="text-right">
            <div class="table-row-actions">
              <button class="btn btn-ghost btn-xs" onclick="window.previewSegmentById('${action.id}')" title="Play / Loop Clip">▶️</button>
              <button class="btn btn-ghost btn-xs" onclick="window.openEditModalById('${action.id}')" title="Edit Maneuver">✏️</button>
              <button class="btn btn-ghost btn-xs text-danger" onclick="window.deleteActionById('${action.id}')" title="Delete Maneuver">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function highlightTableRow(actionId) {
    document.querySelectorAll('.actions-table tr').forEach(row => {
      row.classList.toggle('active-row', row.dataset.actionId === actionId);
    });
  }

  // Window bridges for inline onclick helpers
  window.seekToTime = (time) => {
    if (!state.videoLoaded) return;
    DOM.videoPlayer.currentTime = time;
  };

  window.previewSegmentById = (actionId) => {
    const match = getActiveMatch();
    const action = match.actions.find(a => a.id === actionId);
    if (action) {
      playSegment(action.startTime, action.endTime, false, action.id);
    }
  };

  window.openEditModalById = (actionId) => openEditModal(actionId);
  window.deleteActionById = (actionId) => deleteAction(actionId);

  // ==========================================================================
  // Statistics & Summary Calculation
  // ==========================================================================

  function updateStats() {
    const match = getActiveMatch();
    const actions = match ? (match.actions || []) : [];

    DOM.statsMatchName.textContent = match ? match.name : 'Match';
    DOM.statTotalCount.textContent = actions.length;

    if (actions.length === 0) {
      DOM.statSuccessRate.textContent = '0%';
      DOM.statTotalDuration.textContent = '0.0s';
      DOM.statTopActivity.textContent = '—';
      DOM.activityDistributionBar.innerHTML = '';
      return;
    }

    let totalScore = 0;
    let totalDuration = 0;
    const activityCounts = {};

    actions.forEach(a => {
      totalDuration += (a.duration || 0);

      const rDef = state.ratings.find(r => r.label === a.rating);
      const weight = (rDef && typeof rDef.weight === 'number') ? rDef.weight : 0.5;
      totalScore += weight;

      activityCounts[a.activity] = (activityCounts[a.activity] || 0) + 1;
    });

    const successPct = Math.round((totalScore / actions.length) * 100);
    DOM.statSuccessRate.textContent = `${successPct}%`;
    DOM.statTotalDuration.textContent = `${totalDuration.toFixed(1)}s`;

    let maxCount = 0;
    let topName = '—';
    for (const [name, count] of Object.entries(activityCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topName = `${name} (${count})`;
      }
    }
    DOM.statTopActivity.textContent = topName;

    DOM.activityDistributionBar.innerHTML = '';
    for (const [name, count] of Object.entries(activityCounts)) {
      const pct = (count / actions.length) * 100;
      const activityDef = state.activities.find(a => a.name === name);
      const color = activityDef ? activityDef.color : '#3b82f6';

      const seg = document.createElement('div');
      seg.className = 'distribution-segment';
      seg.style.width = `${pct}%`;
      seg.style.backgroundColor = color;
      seg.title = `${name}: ${count} (${Math.round(pct)}%)`;
      DOM.activityDistributionBar.appendChild(seg);
    }
  }

  // ==========================================================================
  // Rating Scale & Button Generation
  // ==========================================================================

  function renderRatingButtons() {
    DOM.ratingButtonGroup.innerHTML = '';

    state.ratings.forEach(rating => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-rating';
      btn.dataset.rating = rating.label;
      btn.textContent = rating.label;

      const isSelected = (state.selectedRating === rating.label);
      if (isSelected) {
        btn.classList.add('selected');
        btn.style.backgroundColor = rating.color;
        btn.style.color = '#fff';
        btn.style.borderColor = rating.color;
      } else {
        btn.style.borderColor = 'var(--border-color)';
      }

      btn.addEventListener('click', () => {
        selectRating(rating.label);
      });

      DOM.ratingButtonGroup.appendChild(btn);
    });

    populateRatingSelects();
  }

  function selectRating(ratingLabel) {
    state.selectedRating = ratingLabel;
    DOM.ratingSelect.value = ratingLabel;

    const allButtons = DOM.ratingButtonGroup.querySelectorAll('.btn-rating');
    allButtons.forEach(b => {
      const isSel = (b.dataset.rating === ratingLabel);
      b.classList.toggle('selected', isSel);

      const rDef = state.ratings.find(r => r.label === b.dataset.rating);
      if (isSel && rDef) {
        b.style.backgroundColor = rDef.color;
        b.style.color = '#fff';
        b.style.borderColor = rDef.color;
      } else {
        b.style.backgroundColor = 'var(--bg-surface)';
        b.style.color = 'var(--text-muted)';
        b.style.borderColor = 'var(--border-color)';
      }
    });

    saveDraft();
  }

  function populateRatingSelects() {
    const optionsHtml = state.ratings.map(r =>
      `<option value="${escapeHtml(r.label)}">${escapeHtml(r.label)}</option>`
    ).join('');

    DOM.ratingSelect.innerHTML = optionsHtml;
    DOM.editRatingSelect.innerHTML = optionsHtml;

    const currentFilter = DOM.filterRatingSelect.value;
    DOM.filterRatingSelect.innerHTML = '<option value="ALL">All Ratings</option>' + optionsHtml;
    DOM.filterRatingSelect.value = currentFilter;
  }

  // ==========================================================================
  // Match Metadata & Autonomous Breakdown Logic
  // ==========================================================================

  function updateMatchMetaBanner() {
    const match = getActiveMatch();
    if (!match || !match.meta || !match.auton) return;

    // 1. Result Pill
    const m = match.meta;
    let resultText = 'Not Recorded';
    if (m.outcome === 'Win') {
      resultText = `🏆 Win (${m.ourScore || 0} - ${m.oppScore || 0})`;
    } else if (m.outcome === 'Loss') {
      resultText = `❌ Loss (${m.ourScore || 0} - ${m.oppScore || 0})`;
    } else if (m.outcome === 'Tie') {
      resultText = `🤝 Tie (${m.ourScore || 0} - ${m.oppScore || 0})`;
    } else if (m.ourScore !== '' || m.oppScore !== '') {
      resultText = `Score: ${m.ourScore || 0} - ${m.oppScore || 0}`;
    }
    DOM.metaBannerResultVal.textContent = resultText;

    // 2. Auton Pill
    const a = match.auton;
    if (a.codedMaxPoints > 0 || a.actualPoints !== '') {
      const actual = Number(a.actualPoints) || 0;
      const max = Number(a.codedMaxPoints) || 0;
      const pct = max > 0 ? Math.round((actual / max) * 100) : 0;
      DOM.metaBannerAutonVal.textContent = `${actual}/${max} pts (${pct}%)`;
    } else {
      DOM.metaBannerAutonVal.textContent = 'Not Recorded';
    }

    // 3. Teams Pill
    const partnerNum = (m.partner && m.partner.number) ? m.partner.number.trim() : '';
    const opp1Num = (m.opp1 && m.opp1.number) ? m.opp1.number.trim() : '';
    const opp2Num = (m.opp2 && m.opp2.number) ? m.opp2.number.trim() : '';

    if (partnerNum || opp1Num || opp2Num) {
      let allianceStr = partnerNum ? `P: ${partnerNum}` : 'P: —';
      const opps = [opp1Num, opp2Num].filter(Boolean).join(', ');
      allianceStr += opps ? ` | Opp: ${opps}` : '';
      DOM.metaBannerAllianceVal.textContent = allianceStr;
    } else {
      DOM.metaBannerAllianceVal.textContent = '—';
    }
  }

  // Open Match Metadata Modal
  function openMatchMetaModal() {
    const match = getActiveMatch();
    ensureMatchFields(match);
    const m = match.meta;

    // Set Alliance toggle buttons
    setAllianceToggle(m.ourAlliance || 'Red');

    // Set Outcome buttons
    setOutcomeToggle(m.outcome || 'Unplayed');

    DOM.metaOurScoreInput.value = m.ourScore !== undefined ? m.ourScore : '';
    DOM.metaOppScoreInput.value = m.oppScore !== undefined ? m.oppScore : '';
    DOM.metaAutonWinnerSelect.value = m.autonWinner || 'None';
    DOM.metaAwpCheckbox.checked = !!m.awpEarned;

    // Partner
    DOM.metaPartnerNumberInput.value = m.partner.number || '';
    DOM.metaPartnerRankInput.value = m.partner.rank || '';
    DOM.metaPartnerWpInput.value = m.partner.wp || '';
    DOM.metaPartnerApInput.value = m.partner.ap || '';
    DOM.metaPartnerSpInput.value = m.partner.sp || '';
    DOM.metaPartnerNotesInput.value = m.partner.notes || '';

    // Opponent 1
    DOM.metaOpp1NumberInput.value = m.opp1.number || '';
    DOM.metaOpp1RankInput.value = m.opp1.rank || '';
    DOM.metaOpp1WpInput.value = m.opp1.wp || '';
    DOM.metaOpp1ApInput.value = m.opp1.ap || '';
    DOM.metaOpp1SpInput.value = m.opp1.sp || '';
    DOM.metaOpp1NotesInput.value = m.opp1.notes || '';

    // Opponent 2
    DOM.metaOpp2NumberInput.value = m.opp2.number || '';
    DOM.metaOpp2RankInput.value = m.opp2.rank || '';
    DOM.metaOpp2WpInput.value = m.opp2.wp || '';
    DOM.metaOpp2ApInput.value = m.opp2.ap || '';
    DOM.metaOpp2SpInput.value = m.opp2.sp || '';
    DOM.metaOpp2NotesInput.value = m.opp2.notes || '';

    // General Notes
    DOM.metaGeneralNotesInput.value = m.generalNotes || '';

    DOM.matchMetaModal.classList.remove('hidden');
  }

  function setAllianceToggle(color) {
    const isRed = (color === 'Red');
    DOM.metaAllianceRedBtn.classList.toggle('active-red', isRed);
    DOM.metaAllianceBlueBtn.classList.toggle('active-blue', !isRed);
  }

  function setOutcomeToggle(outcome) {
    DOM.metaOutcomeWinBtn.classList.toggle('active-win', outcome === 'Win');
    DOM.metaOutcomeLossBtn.classList.toggle('active-loss', outcome === 'Loss');
    DOM.metaOutcomeTieBtn.classList.toggle('active-tie', outcome === 'Tie');
  }

  function saveMatchMetaFromInputs() {
    const match = getActiveMatch();
    ensureMatchFields(match);
    const m = match.meta;

    m.ourScore = DOM.metaOurScoreInput.value.trim();
    m.oppScore = DOM.metaOppScoreInput.value.trim();
    m.autonWinner = DOM.metaAutonWinnerSelect.value;
    m.awpEarned = DOM.metaAwpCheckbox.checked;

    m.partner = {
      number: DOM.metaPartnerNumberInput.value.trim(),
      rank: DOM.metaPartnerRankInput.value.trim(),
      wp: DOM.metaPartnerWpInput.value.trim(),
      ap: DOM.metaPartnerApInput.value.trim(),
      sp: DOM.metaPartnerSpInput.value.trim(),
      notes: DOM.metaPartnerNotesInput.value.trim()
    };

    m.opp1 = {
      number: DOM.metaOpp1NumberInput.value.trim(),
      rank: DOM.metaOpp1RankInput.value.trim(),
      wp: DOM.metaOpp1WpInput.value.trim(),
      ap: DOM.metaOpp1ApInput.value.trim(),
      sp: DOM.metaOpp1SpInput.value.trim(),
      notes: DOM.metaOpp1NotesInput.value.trim()
    };

    m.opp2 = {
      number: DOM.metaOpp2NumberInput.value.trim(),
      rank: DOM.metaOpp2RankInput.value.trim(),
      wp: DOM.metaOpp2WpInput.value.trim(),
      ap: DOM.metaOpp2ApInput.value.trim(),
      sp: DOM.metaOpp2SpInput.value.trim(),
      notes: DOM.metaOpp2NotesInput.value.trim()
    };

    m.generalNotes = DOM.metaGeneralNotesInput.value.trim();

    saveProject();
  }

  // Open Autonomous Review Modal
  function openAutonReviewModal() {
    const match = getActiveMatch();
    ensureMatchFields(match);
    const a = match.auton;

    DOM.autonRoutineNameInput.value = a.routineName || '';
    DOM.autonStartPositionSelect.value = a.startPosition || 'Red Left';
    DOM.autonCodedMaxInput.value = a.codedMaxPoints !== undefined ? a.codedMaxPoints : '';
    DOM.autonActualPointsInput.value = a.actualPoints !== undefined ? a.actualPoints : '';
    DOM.autonBonusWonSelect.value = a.bonusWon || 'None';
    DOM.autonAwpCheckbox.checked = !!a.awpSecured;
    DOM.autonNotesInput.value = a.notes || '';

    // Issue tags
    const activeTags = a.issueTags || [];
    DOM.autonIssueTagsContainer.querySelectorAll('.btn-issue-tag').forEach(btn => {
      btn.classList.toggle('selected', activeTags.includes(btn.dataset.tag));
    });

    updateAutonEfficiencyDisplay();
    DOM.autonReviewModal.classList.remove('hidden');
  }

  function updateAutonEfficiencyDisplay() {
    const match = getActiveMatch();
    const a = match.auton;

    const max = Number(DOM.autonCodedMaxInput.value) || 0;
    const actual = Number(DOM.autonActualPointsInput.value) || 0;

    const pct = max > 0 ? Math.round((actual / max) * 100) : 0;
    DOM.autonEfficiencyDisplay.textContent = `${pct}%`;
    DOM.autonPointsBreakdownDisplay.textContent = `(${actual} / ${max} pts)`;
    DOM.autonProgressBar.style.width = `${Math.min(100, pct)}%`;

    if (pct >= 80) {
      DOM.autonProgressBar.style.backgroundColor = '#3fb950';
      DOM.autonEfficiencyDisplay.style.color = '#3fb950';
    } else if (pct >= 50) {
      DOM.autonProgressBar.style.backgroundColor = '#d29922';
      DOM.autonEfficiencyDisplay.style.color = '#d29922';
    } else {
      DOM.autonProgressBar.style.backgroundColor = '#f85149';
      DOM.autonEfficiencyDisplay.style.color = '#f85149';
    }

    const bonus = DOM.autonBonusWonSelect.value;
    DOM.autonBonusStatusPill.className = 'auton-status-pill';
    if (bonus === 'Won') {
      DOM.autonBonusStatusPill.classList.add('won');
      DOM.autonBonusStatusPill.textContent = '🏆 Won Auton Bonus';
    } else if (bonus === 'Tied') {
      DOM.autonBonusStatusPill.classList.add('tied');
      DOM.autonBonusStatusPill.textContent = '🤝 Tied Auton';
    } else if (bonus === 'Lost') {
      DOM.autonBonusStatusPill.classList.add('lost');
      DOM.autonBonusStatusPill.textContent = '❌ Lost Auton';
    } else {
      DOM.autonBonusStatusPill.textContent = 'No Bonus Recorded';
    }
  }

  function saveAutonFromInputs() {
    const match = getActiveMatch();
    ensureMatchFields(match);
    const a = match.auton;

    a.routineName = DOM.autonRoutineNameInput.value.trim();
    a.startPosition = DOM.autonStartPositionSelect.value;
    a.codedMaxPoints = DOM.autonCodedMaxInput.value.trim();
    a.actualPoints = DOM.autonActualPointsInput.value.trim();
    a.bonusWon = DOM.autonBonusWonSelect.value;
    a.awpSecured = DOM.autonAwpCheckbox.checked;
    a.notes = DOM.autonNotesInput.value.trim();

    const tags = [];
    DOM.autonIssueTagsContainer.querySelectorAll('.btn-issue-tag.selected').forEach(btn => {
      tags.push(btn.dataset.tag);
    });
    a.issueTags = tags;

    updateAutonEfficiencyDisplay();
    saveProject();
  }

  // ==========================================================================
  // Settings Modal (Activities, Success Scale & Storage Tabs)
  // ==========================================================================

  function openSettingsModal(defaultTab = 'tabActivities') {
    renderActivityListInModal();
    renderRatingTiersInModal();
    updateStorageStats();
    switchSettingsTab(defaultTab);
    DOM.settingsModal.classList.remove('hidden');
  }

  function switchSettingsTab(targetTabId) {
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === targetTabId);
    });
    document.querySelectorAll('.settings-tab-content').forEach(content => {
      content.classList.toggle('hidden', content.id !== targetTabId);
    });
  }

  function updateCounts() {
    if (DOM.settingsActivityCount) DOM.settingsActivityCount.textContent = state.activities.length;
    if (DOM.settingsRatingCount) DOM.settingsRatingCount.textContent = state.ratings.length;
  }

  // Tab 1: Activities List in Modal
  function renderActivityListInModal() {
    const match = getActiveMatch();
    const actions = match ? (match.actions || []) : [];

    DOM.activityListContainer.innerHTML = state.activities.map((act, index) => {
      const usageCount = actions.filter(a => a.activity === act.name).length;
      return `
        <div class="activity-item">
          <div class="activity-item-left flex-1" style="display:flex; gap:0.5rem; align-items:center;">
            <input type="color" class="color-picker-input" style="width:30px; height:30px;" value="${act.color}" onchange="window.updateActivityColor(${index}, this.value)" title="Change Color">
            <input type="text" class="form-input flex-1" value="${escapeHtml(act.name)}" onchange="window.renameActivity(${index}, this.value)">
            <span class="badge" title="Maneuvers with this activity in current match">${usageCount} tags</span>
          </div>
          <button class="btn btn-ghost btn-xs text-danger" onclick="window.removeActivityByIndex(${index})" title="Delete Activity">🗑️</button>
        </div>
      `;
    }).join('');
    updateCounts();
  }

  window.updateActivityColor = (index, newColor) => {
    if (!state.activities[index]) return;
    state.activities[index].color = newColor;
    saveActivities();
    renderTable();
    renderTimelineActions();
    updateStats();
  };

  window.renameActivity = (index, newName) => {
    newName = (newName || '').trim();
    if (!newName || !state.activities[index]) return;
    const oldName = state.activities[index].name;
    state.activities[index].name = newName;

    state.matches.forEach(m => {
      (m.actions || []).forEach(a => {
        if (a.activity === oldName) a.activity = newName;
      });
    });

    saveActivities();
    saveProject();
    populateActivitySelects();
    renderTable();
    renderTimelineActions();
    updateStats();
  };

  window.removeActivityByIndex = (index) => {
    if (state.activities.length <= 1) {
      alert('You must have at least one activity category.');
      return;
    }
    const act = state.activities[index];
    if (confirm(`Delete activity "${act.name}"?`)) {
      state.activities.splice(index, 1);
      saveActivities();
      populateActivitySelects();
      renderActivityListInModal();
      renderTable();
      renderTimelineActions();
      updateStats();
    }
  };

  function handleAddNewActivity() {
    const name = DOM.newActivityNameInput.value.trim();
    const color = DOM.newActivityColorInput.value;

    if (!name) return;
    if (state.activities.some(a => a.name.toLowerCase() === name.toLowerCase())) {
      alert('An activity with this name already exists.');
      return;
    }

    state.activities.push({
      id: 'act_' + Date.now(),
      name: name,
      color: color
    });

    saveActivities();
    populateActivitySelects();
    renderActivityListInModal();
    renderTable();
    renderTimelineActions();
    updateStats();

    DOM.newActivityNameInput.value = '';
    DOM.activitySelect.value = name;
  }

  function populateActivitySelects() {
    const optionsHtml = state.activities.map(act =>
      `<option value="${escapeHtml(act.name)}">${escapeHtml(act.name)}</option>`
    ).join('');

    DOM.activitySelect.innerHTML = optionsHtml;
    DOM.editActivitySelect.innerHTML = optionsHtml;

    const currentFilter = DOM.filterActivitySelect.value;
    DOM.filterActivitySelect.innerHTML = '<option value="ALL">All Activities</option>' + optionsHtml;
    DOM.filterActivitySelect.value = currentFilter;
  }

  // Tab 2: Success Scale Tiers in Modal
  function renderRatingTiersInModal() {
    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === state.activeRatingPreset);
    });

    DOM.ratingTierListContainer.innerHTML = state.ratings.map((tier, index) => `
      <div class="rating-tier-item">
        <input type="color" class="color-picker-input" style="width:30px; height:30px;" value="${tier.color}" onchange="window.updateRatingTierColor(${index}, this.value)" title="Change Tier Color">
        <input type="text" class="form-input flex-1" value="${escapeHtml(tier.label)}" onchange="window.renameRatingTier(${index}, this.value)">
        <select class="form-select mini-select-wide" onchange="window.updateRatingTierWeight(${index}, this.value)">
          <option value="1.0" ${tier.weight === 1.0 ? 'selected' : ''}>100% (Full Success)</option>
          <option value="0.75" ${tier.weight === 0.75 ? 'selected' : ''}>75% (Strong)</option>
          <option value="0.5" ${tier.weight === 0.5 ? 'selected' : ''}>50% (Partial)</option>
          <option value="0.25" ${tier.weight === 0.25 ? 'selected' : ''}>25% (Weak)</option>
          <option value="0.0" ${tier.weight === 0.0 ? 'selected' : ''}>0% (Failure)</option>
        </select>
        <button class="btn btn-ghost btn-xs text-danger" onclick="window.removeRatingTierByIndex(${index})" title="Delete Tier">🗑️</button>
      </div>
    `).join('');
    updateCounts();
  }

  window.updateRatingTierColor = (index, newColor) => {
    if (!state.ratings[index]) return;
    state.ratings[index].color = newColor;
    state.activeRatingPreset = 'custom';
    saveRatings();
    renderRatingButtons();
    renderTable();
    updateStats();
  };

  window.renameRatingTier = (index, newLabel) => {
    newLabel = (newLabel || '').trim();
    if (!newLabel || !state.ratings[index]) return;
    const oldLabel = state.ratings[index].label;
    state.ratings[index].label = newLabel;
    state.activeRatingPreset = 'custom';

    state.matches.forEach(m => {
      (m.actions || []).forEach(a => {
        if (a.rating === oldLabel) a.rating = newLabel;
      });
    });

    if (state.selectedRating === oldLabel) {
      state.selectedRating = newLabel;
    }

    saveRatings();
    saveProject();
    renderRatingButtons();
    renderTable();
    updateStats();
  };

  window.updateRatingTierWeight = (index, newWeight) => {
    if (!state.ratings[index]) return;
    state.ratings[index].weight = parseFloat(newWeight);
    state.activeRatingPreset = 'custom';
    saveRatings();
    updateStats();
  };

  window.removeRatingTierByIndex = (index) => {
    if (state.ratings.length <= 1) {
      alert('You must have at least one rating tier.');
      return;
    }
    const tier = state.ratings[index];
    if (confirm(`Delete rating level "${tier.label}"?`)) {
      state.ratings.splice(index, 1);
      state.activeRatingPreset = 'custom';
      if (state.selectedRating === tier.label) {
        state.selectedRating = state.ratings[0].label;
      }
      saveRatings();
      renderRatingButtons();
      renderRatingTiersInModal();
      renderTable();
      updateStats();
    }
  };

  function handleAddRatingTier() {
    const label = DOM.newRatingLabelInput.value.trim();
    const color = DOM.newRatingColorInput.value;
    const weight = parseFloat(DOM.newRatingWeightSelect.value);

    if (!label) return;
    if (state.ratings.some(r => r.label.toLowerCase() === label.toLowerCase())) {
      alert('A rating tier with this label already exists.');
      return;
    }

    state.ratings.push({
      id: 'rate_' + Date.now(),
      label: label,
      color: color,
      weight: weight
    });

    state.activeRatingPreset = 'custom';
    saveRatings();
    renderRatingButtons();
    renderRatingTiersInModal();
    renderTable();
    updateStats();

    DOM.newRatingLabelInput.value = '';
  }

  function applyRatingPreset(presetKey) {
    if (!RATING_PRESETS[presetKey]) return;
    state.ratings = JSON.parse(JSON.stringify(RATING_PRESETS[presetKey]));
    state.activeRatingPreset = presetKey;
    state.selectedRating = state.ratings[0].label;

    saveRatings();
    renderRatingButtons();
    renderRatingTiersInModal();
    renderTable();
    updateStats();
  }

  // Tab 3: Storage & Auto-save Stats
  function updateStorageStats() {
    if (!DOM.storageMatchCount) return;

    let totalActions = 0;
    state.matches.forEach(m => totalActions += (m.actions ? m.actions.length : 0));

    DOM.storageMatchCount.textContent = state.matches.length;
    DOM.storageActionCount.textContent = totalActions;

    const hasDraft = !!localStorage.getItem(STORAGE_KEY_DRAFT);
    DOM.storageDraftStatus.textContent = hasDraft ? 'Saved' : 'None';

    try {
      let totalBytes = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalBytes += ((localStorage[key].length + key.length) * 2);
        }
      }
      const kb = (totalBytes / 1024).toFixed(1);
      DOM.storageSizeEstimate.textContent = `~${kb} KB`;
    } catch (e) {
      DOM.storageSizeEstimate.textContent = '-- KB';
    }
  }

  // ==========================================================================
  // Match Management
  // ==========================================================================

  function updateMatchSelector() {
    DOM.matchSelect.innerHTML = state.matches.map(m => `
      <option value="${m.id}" ${m.id === state.activeMatchId ? 'selected' : ''}>
        ${escapeHtml(m.name)} (${(m.actions || []).length} tags)
      </option>
    `).join('');

    const currentMatch = getActiveMatch();
    if (currentMatch) {
      DOM.matchNameInput.value = currentMatch.name;
    }
    updateMatchMetaBanner();
  }

  function switchActiveMatch(matchId) {
    state.activeMatchId = matchId;
    saveProject();
    clearMarkers();
    stopLooping();
    updateUI();
    restoreDraft();
  }

  function createNewMatch() {
    const name = prompt('Enter a name for the new match (e.g. Match Q02 vs 8059A):');
    if (!name) return;

    const newMatch = createNewMatchObject(name.trim());
    state.matches.push(newMatch);
    state.activeMatchId = newMatch.id;
    saveProject();
    clearMarkers();
    updateUI();
  }

  function deleteCurrentMatch() {
    if (state.matches.length <= 1) {
      alert('You cannot delete the only match. Create another match first.');
      return;
    }

    const current = getActiveMatch();
    if (!confirm(`Are you sure you want to delete "${current.name}" and all its logged maneuvers?`)) return;

    state.matches = state.matches.filter(m => m.id !== current.id);
    state.activeMatchId = state.matches[0].id;
    saveProject();
    updateUI();
  }

  // ==========================================================================
  // CSV Export & Project Backup (With Match Meta & Auton Breakdown)
  // ==========================================================================

  function exportCurrentMatchCsv() {
    const match = getActiveMatch();
    if (!match || !match.actions || match.actions.length === 0) {
      alert('No maneuvers logged for this match yet to export.');
      return;
    }
    ensureMatchFields(match);
    const m = match.meta;
    const a = match.auton;

    const headers = [
      'Match Name',
      'Action #',
      'Start Time (MM:SS.mmm)',
      'End Time (MM:SS.mmm)',
      'Duration (s)',
      'Start (seconds)',
      'End (seconds)',
      'Activity Type',
      'Success Rating',
      'Notes & Observations',
      'Match Outcome',
      'Score (Our - Opp)',
      'Alliance Partner',
      'Partner Rank',
      'Partner SP',
      'Opponent 1',
      'Opponent 2',
      'Auton Routine',
      'Auton Max Pts',
      'Auton Actual Pts',
      'Auton Bonus',
      'AWP Earned',
      'Auton Issues',
      'Auton Notes',
      'Video Filename'
    ];

    const scoreStr = (m.ourScore !== '' || m.oppScore !== '') ? `${m.ourScore || 0}-${m.oppScore || 0}` : '';
    const autonIssuesStr = (a.issueTags || []).join('; ');

    const rows = match.actions.map(act => [
      escapeCsvValue(match.name),
      act.index,
      escapeCsvValue(formatTime(act.startTime)),
      escapeCsvValue(formatTime(act.endTime)),
      act.duration.toFixed(3),
      act.startTime.toFixed(3),
      act.endTime.toFixed(3),
      escapeCsvValue(act.activity),
      escapeCsvValue(act.rating),
      escapeCsvValue(act.notes),
      escapeCsvValue(m.outcome || 'Unplayed'),
      escapeCsvValue(scoreStr),
      escapeCsvValue(m.partner.number || ''),
      escapeCsvValue(m.partner.rank || ''),
      escapeCsvValue(m.partner.sp || ''),
      escapeCsvValue(m.opp1.number || ''),
      escapeCsvValue(m.opp2.number || ''),
      escapeCsvValue(a.routineName || ''),
      escapeCsvValue(a.codedMaxPoints || ''),
      escapeCsvValue(a.actualPoints || ''),
      escapeCsvValue(a.bonusWon || ''),
      escapeCsvValue(a.awpSecured ? 'Yes' : 'No'),
      escapeCsvValue(autonIssuesStr),
      escapeCsvValue(a.notes || ''),
      escapeCsvValue(match.videoFileName || '')
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const safeName = match.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadBlob(csvContent, `${safeName}_maneuvers.csv`, 'text/csv;charset=utf-8;');
  }

  function exportAllMatchesCsv() {
    const allActions = [];
    state.matches.forEach(match => {
      ensureMatchFields(match);
      (match.actions || []).forEach(act => {
        allActions.push({ match, act });
      });
    });

    if (allActions.length === 0) {
      alert('No maneuvers logged across any match to export.');
      return;
    }

    const headers = [
      'Match Name',
      'Action #',
      'Start Time',
      'End Time',
      'Duration (s)',
      'Start (s)',
      'End (s)',
      'Activity Type',
      'Success Rating',
      'Notes & Observations',
      'Match Outcome',
      'Score (Our - Opp)',
      'Alliance Partner',
      'Partner Rank',
      'Partner SP',
      'Opponent 1',
      'Opponent 2',
      'Auton Routine',
      'Auton Max Pts',
      'Auton Actual Pts',
      'Auton Bonus',
      'AWP Earned',
      'Auton Issues',
      'Video Filename'
    ];

    const rows = allActions.map(({ match, act }) => {
      const m = match.meta;
      const a = match.auton;
      const scoreStr = (m.ourScore !== '' || m.oppScore !== '') ? `${m.ourScore || 0}-${m.oppScore || 0}` : '';
      const autonIssuesStr = (a.issueTags || []).join('; ');

      return [
        escapeCsvValue(match.name),
        act.index,
        escapeCsvValue(formatTime(act.startTime)),
        escapeCsvValue(formatTime(act.endTime)),
        act.duration.toFixed(3),
        act.startTime.toFixed(3),
        act.endTime.toFixed(3),
        escapeCsvValue(act.activity),
        escapeCsvValue(act.rating),
        escapeCsvValue(act.notes),
        escapeCsvValue(m.outcome || 'Unplayed'),
        escapeCsvValue(scoreStr),
        escapeCsvValue(m.partner.number || ''),
        escapeCsvValue(m.partner.rank || ''),
        escapeCsvValue(m.partner.sp || ''),
        escapeCsvValue(m.opp1.number || ''),
        escapeCsvValue(m.opp2.number || ''),
        escapeCsvValue(a.routineName || ''),
        escapeCsvValue(a.codedMaxPoints || ''),
        escapeCsvValue(a.actualPoints || ''),
        escapeCsvValue(a.bonusWon || ''),
        escapeCsvValue(a.awpSecured ? 'Yes' : 'No'),
        escapeCsvValue(autonIssuesStr),
        escapeCsvValue(match.videoFileName || '')
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    downloadBlob(csvContent, `VEX_All_Matches_Maneuver_Analysis.csv`, 'text/csv;charset=utf-8;');
  }

  // High-Level 8-Match Tournament Summary Export (1 row per match)
  function exportMatchSummaryCsv() {
    if (!state.matches || state.matches.length === 0) {
      alert('No matches to summarize.');
      return;
    }

    const headers = [
      'Match #',
      'Match Name',
      'Outcome',
      'Our Score',
      'Opponent Score',
      'Our Alliance Color',
      'Partner Team',
      'Partner Rank',
      'Partner WP',
      'Partner AP',
      'Partner SP',
      'Partner Notes',
      'Opponent 1',
      'Opponent 1 Rank',
      'Opponent 1 Notes',
      'Opponent 2',
      'Opponent 2 Rank',
      'Opponent 2 Notes',
      'Auton Routine',
      'Auton Start Position',
      'Auton Coded Max',
      'Auton Actual Scored',
      'Auton Efficiency %',
      'Auton Bonus Won',
      'AWP Secured',
      'Auton Failure Reasons',
      'Auton Breakdown Notes',
      'Total Maneuvers Logged',
      'Maneuver Success Rate %',
      'General Match Takeaways',
      'Video Filename'
    ];

    const rows = state.matches.map((match, idx) => {
      ensureMatchFields(match);
      const m = match.meta;
      const a = match.auton;
      const actions = match.actions || [];

      // Calculate maneuver success rate %
      let totalScore = 0;
      actions.forEach(act => {
        const rDef = state.ratings.find(r => r.label === act.rating);
        totalScore += (rDef && typeof rDef.weight === 'number') ? rDef.weight : 0.5;
      });
      const successPct = actions.length > 0 ? `${Math.round((totalScore / actions.length) * 100)}%` : '0%';

      // Auton efficiency
      const maxPts = Number(a.codedMaxPoints) || 0;
      const actualPts = Number(a.actualPoints) || 0;
      const autonEff = maxPts > 0 ? `${Math.round((actualPts / maxPts) * 100)}%` : '0%';

      return [
        idx + 1,
        escapeCsvValue(match.name),
        escapeCsvValue(m.outcome || 'Unplayed'),
        escapeCsvValue(m.ourScore || '0'),
        escapeCsvValue(m.oppScore || '0'),
        escapeCsvValue(m.ourAlliance || 'Red'),
        escapeCsvValue(m.partner.number || ''),
        escapeCsvValue(m.partner.rank || ''),
        escapeCsvValue(m.partner.wp || ''),
        escapeCsvValue(m.partner.ap || ''),
        escapeCsvValue(m.partner.sp || ''),
        escapeCsvValue(m.partner.notes || ''),
        escapeCsvValue(m.opp1.number || ''),
        escapeCsvValue(m.opp1.rank || ''),
        escapeCsvValue(m.opp1.notes || ''),
        escapeCsvValue(m.opp2.number || ''),
        escapeCsvValue(m.opp2.rank || ''),
        escapeCsvValue(m.opp2.notes || ''),
        escapeCsvValue(a.routineName || ''),
        escapeCsvValue(a.startPosition || ''),
        escapeCsvValue(a.codedMaxPoints || '0'),
        escapeCsvValue(a.actualPoints || '0'),
        escapeCsvValue(autonEff),
        escapeCsvValue(a.bonusWon || 'None'),
        escapeCsvValue(a.awpSecured ? 'Yes' : 'No'),
        escapeCsvValue((a.issueTags || []).join('; ')),
        escapeCsvValue(a.notes || ''),
        actions.length,
        escapeCsvValue(successPct),
        escapeCsvValue(m.generalNotes || ''),
        escapeCsvValue(match.videoFileName || '')
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    downloadBlob(csvContent, 'VEX_Tournament_8Match_Summary.csv', 'text/csv;charset=utf-8;');
  }

  function exportProjectJson() {
    const projectData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      activities: state.activities,
      ratings: state.ratings,
      activeRatingPreset: state.activeRatingPreset,
      matches: state.matches
    };
    const jsonStr = JSON.stringify(projectData, null, 2);
    downloadBlob(jsonStr, 'vex_match_reviewer_backup.json', 'application/json');
  }

  function importProjectJson(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.matches && Array.isArray(data.matches)) {
          state.matches = data.matches;
          state.matches.forEach(ensureMatchFields);
          if (data.activities && Array.isArray(data.activities)) {
            state.activities = data.activities;
            saveActivities(false);
          }
          if (data.ratings && Array.isArray(data.ratings)) {
            state.ratings = data.ratings;
            state.activeRatingPreset = data.activeRatingPreset || 'custom';
            saveRatings(false);
          }
          state.activeMatchId = state.matches[0] ? state.matches[0].id : null;
          saveProject(true);
          updateUI();
          alert('Project restored successfully!');
        } else {
          alert('Invalid JSON project file structure.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  }

  // ==========================================================================
  // CSV Import & Automatic Data Restoration Engine
  // ==========================================================================

  function parseCsv(text) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped double quote ("")
          currentField += '"';
          i++;
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentField);
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n in CRLF
        }
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }

    if (currentField !== '' || currentRow.length > 0) {
      currentRow.push(currentField);
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== '')) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  function importFromCsvFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        processCsvData(e.target.result, file.name);
      } catch (err) {
        console.error('Error importing CSV:', err);
        alert('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function processCsvData(csvText, filename) {
    const rawRows = parseCsv(csvText);
    if (!rawRows || rawRows.length < 2) {
      alert('The selected CSV file appears to be empty or has no data rows.');
      return;
    }

    const headerRow = rawRows[0].map(h => (h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

    // Helper to get index for any matching aliases
    function getColIdx(aliases) {
      for (const alias of aliases) {
        const cleaned = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
        const idx = headerRow.indexOf(cleaned);
        if (idx !== -1) return idx;
      }
      return -1;
    }

    // Maneuver columns
    const colMatchName = getColIdx(['matchname', 'match', 'matchtitle', 'title']);
    const colActionIdx = getColIdx(['action', 'actionnumber', 'index', 'number']);
    const colStartTime = getColIdx(['starttime', 'start', 'starttimemmssmmm']);
    const colEndTime = getColIdx(['endtime', 'end', 'endtimemmssmmm']);
    const colStartSec = getColIdx(['startseconds', 'starts', 'startsec']);
    const colEndSec = getColIdx(['endseconds', 'ends', 'endsec']);
    const colDuration = getColIdx(['duration', 'durations', 'dur']);
    const colActivity = getColIdx(['activitytype', 'activity', 'maneuver', 'type', 'maneuvertype']);
    const colRating = getColIdx(['successrating', 'rating', 'result', 'success']);
    const colNotes = getColIdx(['notesobservations', 'notes', 'observations', 'note']);

    // Match metadata columns
    const colOutcome = getColIdx(['matchoutcome', 'outcome', 'resultoutcome']);
    const colScore = getColIdx(['scoreouropp', 'score', 'finalscore']);
    const colOurScore = getColIdx(['ourscore', 'scoreour', 'teamscore']);
    const colOppScore = getColIdx(['opponentscore', 'oppscore', 'scoreopp']);
    const colAlliance = getColIdx(['ouralliancecolor', 'ouralliance', 'alliancecolor', 'alliance']);
    const colAutonWinner = getColIdx(['autonwinner', 'autonomouswinner']);
    const colAwpMeta = getColIdx(['awpearned', 'awp']);

    // Partner stats
    const colPartnerNum = getColIdx(['alliancepartner', 'partnerteam', 'partner', 'partnernumber']);
    const colPartnerRank = getColIdx(['partnerrank', 'partnerendofdayrank']);
    const colPartnerWp = getColIdx(['partnerwp']);
    const colPartnerAp = getColIdx(['partnerap']);
    const colPartnerSp = getColIdx(['partnersp']);
    const colPartnerNotes = getColIdx(['partnernotes']);

    // Opponent stats
    const colOpp1Num = getColIdx(['opponent1', 'opp1', 'opponent1team', 'opp1number']);
    const colOpp1Rank = getColIdx(['opponent1rank', 'opp1rank']);
    const colOpp1Notes = getColIdx(['opponent1notes', 'opp1notes']);
    const colOpp2Num = getColIdx(['opponent2', 'opp2', 'opponent2team', 'opp2number']);
    const colOpp2Rank = getColIdx(['opponent2rank', 'opp2rank']);
    const colOpp2Notes = getColIdx(['opponent2notes', 'opp2notes']);

    // Auton performance columns
    const colAutonRoutine = getColIdx(['autonroutine', 'routine', 'routinename', 'codeversion']);
    const colAutonStartPos = getColIdx(['autonstartposition', 'startposition', 'startingposition']);
    const colAutonMax = getColIdx(['autoncodedmax', 'autonmaxpts', 'codedmaxpoints', 'codedmax']);
    const colAutonActual = getColIdx(['autonactualscored', 'autonactualpts', 'actualpoints', 'actualscored']);
    const colAutonBonus = getColIdx(['autonbonuswon', 'autonbonus', 'bonuswon']);
    const colAwpSecured = getColIdx(['awpsecured', 'awpearned', 'awp']);
    const colAutonIssues = getColIdx(['autonfailurereasons', 'autonissues', 'issuetags', 'issues']);
    const colAutonNotes = getColIdx(['autonbreakdownnotes', 'autonnotes', 'autondiagnosis']);
    const colGeneralNotes = getColIdx(['generalmatchtakeaways', 'generalnotes', 'matchtakeaways']);
    const colVideoFile = getColIdx(['videofilename', 'video', 'filename']);

    const isManeuverCsv = (colStartTime !== -1 || colStartSec !== -1 || colActivity !== -1);

    const dataRows = rawRows.slice(1);
    const importedMatchMap = new Map();
    let totalImportedActions = 0;

    const defaultBaseMatchName = filename.replace(/\.csv$/i, '').replace(/_maneuvers|_summary/gi, '');

    dataRows.forEach((row, rowIdx) => {
      const getVal = (idx) => (idx !== -1 && row[idx] !== undefined) ? String(row[idx]).trim() : '';

      const rawMatchName = getVal(colMatchName);
      const matchName = rawMatchName || defaultBaseMatchName || `Match ${state.matches.length + 1}`;

      if (!importedMatchMap.has(matchName)) {
        let matchObj = state.matches.find(m => m.name.toLowerCase() === matchName.toLowerCase());
        if (!matchObj) {
          matchObj = createNewMatchObject(matchName);
          state.matches.push(matchObj);
        }
        ensureMatchFields(matchObj);
        importedMatchMap.set(matchName, matchObj);
      }

      const match = importedMatchMap.get(matchName);

      // 1. Reconstruct Match Metadata
      if (colOutcome !== -1 && getVal(colOutcome)) match.meta.outcome = getVal(colOutcome);
      if (colAlliance !== -1 && getVal(colAlliance)) match.meta.ourAlliance = getVal(colAlliance);

      if (colScore !== -1 && getVal(colScore)) {
        const scoreParts = getVal(colScore).split(/[-–—]/);
        if (scoreParts.length === 2) {
          match.meta.ourScore = scoreParts[0].trim();
          match.meta.oppScore = scoreParts[1].trim();
        }
      }
      if (colOurScore !== -1 && getVal(colOurScore)) match.meta.ourScore = getVal(colOurScore);
      if (colOppScore !== -1 && getVal(colOppScore)) match.meta.oppScore = getVal(colOppScore);
      if (colAutonWinner !== -1 && getVal(colAutonWinner)) match.meta.autonWinner = getVal(colAutonWinner);
      if (colAwpMeta !== -1 && getVal(colAwpMeta)) {
        const val = getVal(colAwpMeta).toLowerCase();
        match.meta.awpEarned = (val === 'yes' || val === 'true' || val === '1');
      }

      // Partner Stats
      if (colPartnerNum !== -1 && getVal(colPartnerNum)) match.meta.partner.number = getVal(colPartnerNum);
      if (colPartnerRank !== -1 && getVal(colPartnerRank)) match.meta.partner.rank = getVal(colPartnerRank);
      if (colPartnerWp !== -1 && getVal(colPartnerWp)) match.meta.partner.wp = getVal(colPartnerWp);
      if (colPartnerAp !== -1 && getVal(colPartnerAp)) match.meta.partner.ap = getVal(colPartnerAp);
      if (colPartnerSp !== -1 && getVal(colPartnerSp)) match.meta.partner.sp = getVal(colPartnerSp);
      if (colPartnerNotes !== -1 && getVal(colPartnerNotes)) match.meta.partner.notes = getVal(colPartnerNotes);

      // Opponent Stats
      if (colOpp1Num !== -1 && getVal(colOpp1Num)) match.meta.opp1.number = getVal(colOpp1Num);
      if (colOpp1Rank !== -1 && getVal(colOpp1Rank)) match.meta.opp1.rank = getVal(colOpp1Rank);
      if (colOpp1Notes !== -1 && getVal(colOpp1Notes)) match.meta.opp1.notes = getVal(colOpp1Notes);

      if (colOpp2Num !== -1 && getVal(colOpp2Num)) match.meta.opp2.number = getVal(colOpp2Num);
      if (colOpp2Rank !== -1 && getVal(colOpp2Rank)) match.meta.opp2.rank = getVal(colOpp2Rank);
      if (colOpp2Notes !== -1 && getVal(colOpp2Notes)) match.meta.opp2.notes = getVal(colOpp2Notes);

      if (colGeneralNotes !== -1 && getVal(colGeneralNotes)) match.meta.generalNotes = getVal(colGeneralNotes);
      if (colVideoFile !== -1 && getVal(colVideoFile) && !match.videoFileName) match.videoFileName = getVal(colVideoFile);

      // 2. Reconstruct Autonomous Performance
      if (colAutonRoutine !== -1 && getVal(colAutonRoutine)) match.auton.routineName = getVal(colAutonRoutine);
      if (colAutonStartPos !== -1 && getVal(colAutonStartPos)) match.auton.startPosition = getVal(colAutonStartPos);
      if (colAutonMax !== -1 && getVal(colAutonMax)) match.auton.codedMaxPoints = getVal(colAutonMax);
      if (colAutonActual !== -1 && getVal(colAutonActual)) match.auton.actualPoints = getVal(colAutonActual);
      if (colAutonBonus !== -1 && getVal(colAutonBonus)) match.auton.bonusWon = getVal(colAutonBonus);
      if (colAwpSecured !== -1 && getVal(colAwpSecured)) {
        const val = getVal(colAwpSecured).toLowerCase();
        match.auton.awpSecured = (val === 'yes' || val === 'true' || val === '1');
        match.meta.awpEarned = match.auton.awpSecured;
      }
      if (colAutonIssues !== -1 && getVal(colAutonIssues)) {
        match.auton.issueTags = getVal(colAutonIssues).split(';').map(t => t.trim()).filter(Boolean);
      }
      if (colAutonNotes !== -1 && getVal(colAutonNotes)) match.auton.notes = getVal(colAutonNotes);

      // 3. Reconstruct Maneuvers (if this CSV is a maneuver log)
      if (isManeuverCsv) {
        let startTime = 0;
        let endTime = 0;

        if (colStartSec !== -1 && getVal(colStartSec)) {
          startTime = parseFloat(getVal(colStartSec)) || 0;
        } else if (colStartTime !== -1) {
          startTime = parseTime(getVal(colStartTime));
        }

        if (colEndSec !== -1 && getVal(colEndSec)) {
          endTime = parseFloat(getVal(colEndSec)) || 0;
        } else if (colEndTime !== -1) {
          endTime = parseTime(getVal(colEndTime));
        }

        let duration = (endTime >= startTime) ? (endTime - startTime) : 0;
        if (colDuration !== -1 && getVal(colDuration)) {
          duration = parseFloat(getVal(colDuration)) || duration;
        }

        const activity = getVal(colActivity) || 'General Maneuver';
        const rating = getVal(colRating) || (state.ratings[0] ? state.ratings[0].label : 'Full Success');
        const notes = getVal(colNotes) || '';

        // Auto-register activity if new
        if (!state.activities.some(a => a.name.toLowerCase() === activity.toLowerCase())) {
          const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#6366f1', '#eab308'];
          const newColor = colors[state.activities.length % colors.length];
          state.activities.push({
            id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            name: activity,
            color: newColor
          });
        }

        // Auto-register rating if new
        if (!state.ratings.some(r => r.label.toLowerCase() === rating.toLowerCase())) {
          state.ratings.push({
            id: 'rate_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            label: rating,
            color: '#3b82f6',
            weight: 0.5
          });
        }

        // Avoid adding duplicate actions (matches within 0.05s)
        const isDuplicate = match.actions.some(a =>
          Math.abs(a.startTime - startTime) < 0.05 &&
          Math.abs(a.endTime - endTime) < 0.05 &&
          a.activity === activity
        );

        if (!isDuplicate) {
          match.actions.push({
            id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            index: match.actions.length + 1,
            startTime: Number(startTime.toFixed(3)),
            endTime: Number(endTime.toFixed(3)),
            duration: Number(duration.toFixed(3)),
            activity: activity,
            rating: rating,
            notes: notes,
            createdAt: new Date().toISOString()
          });
          totalImportedActions++;
        }
      }
    });

    // Sort and re-index all actions chronologically
    importedMatchMap.forEach(match => {
      match.actions.sort((a, b) => a.startTime - b.startTime);
      match.actions.forEach((a, i) => a.index = i + 1);
    });

    saveActivities(false);
    saveRatings(false);
    saveProject(true);

    const firstImportedMatch = importedMatchMap.values().next().value;
    if (firstImportedMatch) {
      state.activeMatchId = firstImportedMatch.id;
    }

    updateUI();

    const matchCount = importedMatchMap.size;
    let successMessage = `✅ Successfully imported and restored data from "${filename}":\n\n`;
    successMessage += `• ${matchCount} match${matchCount === 1 ? '' : 'es'} updated\n`;
    if (isManeuverCsv) {
      successMessage += `• ${totalImportedActions} maneuver${totalImportedActions === 1 ? '' : 's'} loaded onto the timeline\n`;
    }
    successMessage += `• Tournament stats, scores & autonomous breakdowns restored!`;
    alert(successMessage);
  }

  function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // ==========================================================================
  // UI Updates & Sync
  // ==========================================================================

  function updateUI() {
    populateActivitySelects();
    renderRatingButtons();
    updateMatchSelector();
    renderTable();
    renderTimelineActions();
    updateTimelineMarkers();
    updateStats();
    updateCounts();
    updateMatchMetaBanner();
  }

  // ==========================================================================
  // Event Listeners & Keyboard Handler
  // ==========================================================================

  function setupEventListeners() {
    // Video Drop & File Selection
    DOM.videoDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      DOM.videoDropZone.classList.add('drag-over');
    });

    DOM.videoDropZone.addEventListener('dragleave', () => {
      DOM.videoDropZone.classList.remove('drag-over');
    });

    DOM.videoDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      DOM.videoDropZone.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.name.toLowerCase().endsWith('.csv')) {
          importFromCsvFile(file);
        } else {
          loadVideoFile(file);
        }
      }
    });

    // Window level CSV drop support
    window.addEventListener('dragover', (e) => {
      if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
      }
    });
    window.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.name.toLowerCase().endsWith('.csv')) {
          e.preventDefault();
          importFromCsvFile(file);
        }
      }
    });

    // CSV File Inputs
    const csvInputs = [
      DOM.importCsvHeaderInput,
      DOM.importCsvMenuInput,
      DOM.importCsvSettingsInput,
      DOM.importCsvDropInput
    ];
    csvInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            importFromCsvFile(e.target.files[0]);
            e.target.value = '';
          }
        });
      }
    });

    DOM.videoFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        loadVideoFile(e.target.files[0]);
      }
    });

    DOM.switchVideoInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        loadVideoFile(e.target.files[0]);
      }
    });

    // Video Playback Events
    DOM.videoPlayer.addEventListener('timeupdate', () => {
      updateTimelinePlayhead();
    });

    DOM.videoPlayer.addEventListener('play', () => {
      DOM.playPauseIcon.textContent = '⏸';
    });

    DOM.videoPlayer.addEventListener('pause', () => {
      DOM.playPauseIcon.textContent = '▶';
    });

    DOM.playPauseBtn.addEventListener('click', togglePlayPause);
    DOM.stepBackFrameBtn.addEventListener('click', () => stepFrame(-1));
    DOM.stepForwardFrameBtn.addEventListener('click', () => stepFrame(1));
    DOM.jumpBack1sBtn.addEventListener('click', () => jumpSeconds(-1));
    DOM.jumpFwd1sBtn.addEventListener('click', () => jumpSeconds(1));
    DOM.jumpBack5sBtn.addEventListener('click', () => jumpSeconds(-5));
    DOM.jumpFwd5sBtn.addEventListener('click', () => jumpSeconds(5));

    // Playback Speed
    DOM.speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const rate = parseFloat(btn.dataset.speed);
        setPlaybackRate(rate);
      });
    });

    DOM.fpsSelect.addEventListener('change', (e) => {
      state.fps = parseFloat(e.target.value) || 30;
      updateTimelinePlayhead();
    });

    // In / Out Markers
    DOM.setInBtn.addEventListener('click', () => setInPoint());
    DOM.setOutBtn.addEventListener('click', () => setOutPoint());
    DOM.clearMarkersBtn.addEventListener('click', clearMarkers);

    DOM.previewSegmentBtn.addEventListener('click', () => {
      const start = parseTime(DOM.startTimeInput.value);
      const end = parseTime(DOM.endTimeInput.value);
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        playSegment(start, end, true);
      } else {
        alert('Please set both Start and End markers first.');
      }
    });

    DOM.useCurrentAsStartBtn.addEventListener('click', () => setInPoint());
    DOM.useCurrentAsEndBtn.addEventListener('click', () => setOutPoint());
    DOM.seekStartBtn.addEventListener('click', () => {
      const t = parseTime(DOM.startTimeInput.value);
      if (!isNaN(t)) DOM.videoPlayer.currentTime = t;
    });
    DOM.seekEndBtn.addEventListener('click', () => {
      const t = parseTime(DOM.endTimeInput.value);
      if (!isNaN(t)) DOM.videoPlayer.currentTime = t;
    });

    // Inputs with draft auto-saving
    DOM.startTimeInput.addEventListener('input', () => {
      state.currentIn = parseTime(DOM.startTimeInput.value);
      updateIntervalDurationDisplay();
      updateTimelineMarkers();
      saveDraft();
    });

    DOM.endTimeInput.addEventListener('input', () => {
      state.currentOut = parseTime(DOM.endTimeInput.value);
      updateIntervalDurationDisplay();
      updateTimelineMarkers();
      saveDraft();
    });

    DOM.activitySelect.addEventListener('change', saveDraft);

    DOM.notesInput.addEventListener('input', saveDraft);

    // Quick Tags click to append to notes
    DOM.quickTagsContainer.querySelectorAll('.quick-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const text = tag.dataset.tag;
        const currentNotes = DOM.notesInput.value.trim();
        DOM.notesInput.value = currentNotes ? `${currentNotes}, ${text}` : text;
        DOM.notesInput.focus();
        saveDraft();
      });
    });

    // Action Form submission
    DOM.actionForm.addEventListener('submit', handleSaveAction);
    DOM.resetFormBtn.addEventListener('click', () => {
      clearMarkers();
      DOM.notesInput.value = '';
      clearDraft();
    });

    // Timeline Scrubbing Drag / Click
    let isScrubbing = false;

    function handleTimelineScrub(e) {
      if (!state.videoDuration) return;
      const rect = DOM.timelineTrackWrapper.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const pct = x / rect.width;
      const targetTime = pct * state.videoDuration;

      DOM.videoPlayer.currentTime = targetTime;
      stopLooping();
    }

    DOM.timelineTrackWrapper.addEventListener('mousedown', (e) => {
      isScrubbing = true;
      handleTimelineScrub(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (isScrubbing) {
        handleTimelineScrub(e);
      }
    });

    window.addEventListener('mouseup', () => {
      isScrubbing = false;
    });

    // Timeline Hover Tooltip
    DOM.timelineTrackWrapper.addEventListener('mousemove', (e) => {
      if (!state.videoDuration) return;
      const rect = DOM.timelineTrackWrapper.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const pct = x / rect.width;
      const hoverTime = pct * state.videoDuration;

      DOM.timelineTooltip.textContent = formatTime(hoverTime);
      DOM.timelineTooltip.style.left = `${x}px`;
      DOM.timelineTooltip.classList.remove('hidden');
    });

    DOM.timelineTrackWrapper.addEventListener('mouseleave', () => {
      DOM.timelineTooltip.classList.add('hidden');
    });

    // Filters & Search
    DOM.filterActivitySelect.addEventListener('change', renderTable);
    DOM.filterRatingSelect.addEventListener('change', renderTable);
    DOM.searchNotesInput.addEventListener('input', renderTable);

    // Match Header Controls
    DOM.matchSelect.addEventListener('change', (e) => {
      switchActiveMatch(e.target.value);
    });

    DOM.matchNameInput.addEventListener('change', (e) => {
      const match = getActiveMatch();
      if (match && e.target.value.trim()) {
        match.name = e.target.value.trim();
        saveProject();
        updateMatchSelector();
        updateStats();
      }
    });

    DOM.newMatchBtn.addEventListener('click', createNewMatch);
    DOM.deleteMatchBtn.addEventListener('click', deleteCurrentMatch);

    // Header Dropdowns & More Actions
    DOM.moreActionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      DOM.moreActionsMenu.classList.toggle('hidden');
    });

    window.addEventListener('click', () => {
      DOM.moreActionsMenu.classList.add('hidden');
    });

    DOM.exportCsvBtn.addEventListener('click', exportCurrentMatchCsv);
    DOM.exportAllCsvBtn.addEventListener('click', exportAllMatchesCsv);
    DOM.exportMatchSummaryCsvBtn.addEventListener('click', exportMatchSummaryCsv);
    DOM.exportJsonBtn.addEventListener('click', exportProjectJson);

    DOM.importJsonInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        importProjectJson(e.target.files[0]);
      }
    });

    DOM.clearMatchDataBtn.addEventListener('click', () => {
      const match = getActiveMatch();
      if (!match) return;
      if (confirm(`Clear all ${match.actions.length} maneuvers in "${match.name}"? This cannot be undone.`)) {
        match.actions = [];
        saveProject();
        clearMarkers();
        updateUI();
      }
    });

    // Match Metadata Banner & Modals
    DOM.matchMetaBtn.addEventListener('click', openMatchMetaModal);
    DOM.autonReviewBtn.addEventListener('click', openAutonReviewModal);
    DOM.metaBannerResultPill.addEventListener('click', openMatchMetaModal);
    DOM.metaBannerAutonPill.addEventListener('click', openAutonReviewModal);
    DOM.metaBannerAlliancePill.addEventListener('click', openMatchMetaModal);

    // Match Metadata Form Controls
    DOM.metaAllianceRedBtn.addEventListener('click', () => {
      getActiveMatch().meta.ourAlliance = 'Red';
      setAllianceToggle('Red');
      saveProject();
    });
    DOM.metaAllianceBlueBtn.addEventListener('click', () => {
      getActiveMatch().meta.ourAlliance = 'Blue';
      setAllianceToggle('Blue');
      saveProject();
    });

    DOM.metaOutcomeWinBtn.addEventListener('click', () => {
      getActiveMatch().meta.outcome = 'Win';
      setOutcomeToggle('Win');
      saveProject();
    });
    DOM.metaOutcomeLossBtn.addEventListener('click', () => {
      getActiveMatch().meta.outcome = 'Loss';
      setOutcomeToggle('Loss');
      saveProject();
    });
    DOM.metaOutcomeTieBtn.addEventListener('click', () => {
      getActiveMatch().meta.outcome = 'Tie';
      setOutcomeToggle('Tie');
      saveProject();
    });

    const metaInputs = [
      DOM.metaOurScoreInput, DOM.metaOppScoreInput, DOM.metaAutonWinnerSelect, DOM.metaAwpCheckbox,
      DOM.metaPartnerNumberInput, DOM.metaPartnerRankInput, DOM.metaPartnerWpInput, DOM.metaPartnerApInput, DOM.metaPartnerSpInput, DOM.metaPartnerNotesInput,
      DOM.metaOpp1NumberInput, DOM.metaOpp1RankInput, DOM.metaOpp1WpInput, DOM.metaOpp1ApInput, DOM.metaOpp1SpInput, DOM.metaOpp1NotesInput,
      DOM.metaOpp2NumberInput, DOM.metaOpp2RankInput, DOM.metaOpp2WpInput, DOM.metaOpp2ApInput, DOM.metaOpp2SpInput, DOM.metaOpp2NotesInput,
      DOM.metaGeneralNotesInput
    ];
    metaInputs.forEach(input => {
      if (input) {
        input.addEventListener('input', saveMatchMetaFromInputs);
        input.addEventListener('change', saveMatchMetaFromInputs);
      }
    });

    // Autonomous Form Controls
    const autonInputs = [
      DOM.autonRoutineNameInput, DOM.autonStartPositionSelect, DOM.autonCodedMaxInput,
      DOM.autonActualPointsInput, DOM.autonBonusWonSelect, DOM.autonAwpCheckbox, DOM.autonNotesInput
    ];
    autonInputs.forEach(input => {
      if (input) {
        input.addEventListener('input', saveAutonFromInputs);
        input.addEventListener('change', saveAutonFromInputs);
      }
    });

    DOM.autonIssueTagsContainer.querySelectorAll('.btn-issue-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('selected');
        saveAutonFromInputs();
      });
    });

    // Settings Modal Triggers
    DOM.settingsBtn.addEventListener('click', () => openSettingsModal('tabActivities'));
    DOM.menuSettingsBtn.addEventListener('click', () => openSettingsModal('tabActivities'));
    DOM.openActivityModalBtn.addEventListener('click', () => openSettingsModal('tabActivities'));
    DOM.openRatingSettingsBtn.addEventListener('click', () => openSettingsModal('tabRatings'));

    // Settings Tabs
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        switchSettingsTab(btn.dataset.tab);
      });
    });

    // Settings Tab 1: Activities
    DOM.addActivityBtn.addEventListener('click', handleAddNewActivity);
    DOM.restoreDefaultActivitiesBtn.addEventListener('click', () => {
      if (confirm('Restore default VEX V5 activity categories?')) {
        state.activities = [...DEFAULT_ACTIVITIES];
        saveActivities();
        populateActivitySelects();
        renderActivityListInModal();
        renderTable();
        renderTimelineActions();
        updateStats();
      }
    });

    // Settings Tab 2: Ratings
    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        applyRatingPreset(btn.dataset.preset);
      });
    });

    DOM.addRatingTierBtn.addEventListener('click', handleAddRatingTier);
    DOM.restoreDefaultRatingsBtn.addEventListener('click', () => {
      if (confirm('Restore default 5-tier VEX success rating scale?')) {
        applyRatingPreset('5-tier');
      }
    });

    // Settings Tab 3: Storage
    DOM.backupJsonSettingsBtn.addEventListener('click', exportProjectJson);
    DOM.importJsonSettingsInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        importProjectJson(e.target.files[0]);
      }
    });
    DOM.clearAllProjectDataBtn.addEventListener('click', () => {
      if (confirm('⚠️ WARNING: This will delete ALL matches and all logged maneuvers in this project. Continue?')) {
        localStorage.removeItem(STORAGE_KEY_PROJECT);
        localStorage.removeItem(STORAGE_KEY_DRAFT);
        location.reload();
      }
    });

    // Shortcuts modal
    DOM.shortcutsBtn.addEventListener('click', () => {
      DOM.shortcutsModal.classList.remove('hidden');
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.close;
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.add('hidden');
        }
      });
    });

    DOM.editActionForm.addEventListener('submit', handleSaveEdit);

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', handleGlobalKeydown);
  }

  function handleGlobalKeydown(e) {
    const activeEl = document.activeElement;
    const isEditingText = activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.isContentEditable
    );

    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
      DOM.moreActionsMenu.classList.add('hidden');
      clearMarkers();
      stopLooping();
      return;
    }

    if (e.key === 'Enter' && activeEl === DOM.notesInput && !e.shiftKey) {
      e.preventDefault();
      handleSaveAction();
      return;
    }

    if (isEditingText) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePlayPause();
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (e.shiftKey) {
          jumpSeconds(-5);
        } else {
          stepFrame(-1);
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (e.shiftKey) {
          jumpSeconds(5);
        } else {
          stepFrame(1);
        }
        break;

      case ',':
        e.preventDefault();
        stepFrame(-1);
        break;

      case '.':
        e.preventDefault();
        stepFrame(1);
        break;

      case 'j':
      case 'J':
        e.preventDefault();
        jumpSeconds(-1);
        break;

      case 'l':
      case 'L':
        e.preventDefault();
        jumpSeconds(1);
        break;

      case '[':
      case 'i':
      case 'I':
        e.preventDefault();
        setInPoint();
        break;

      case ']':
      case 'o':
      case 'O':
        e.preventDefault();
        setOutPoint();
        break;

      case 'r':
      case 'R':
        e.preventDefault();
        DOM.previewSegmentBtn.click();
        break;

      case 'Enter':
        e.preventDefault();
        handleSaveAction();
        break;

      case '?':
        e.preventDefault();
        DOM.shortcutsModal.classList.toggle('hidden');
        break;
    }
  }

  // Run initial setup
  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  }

})();
