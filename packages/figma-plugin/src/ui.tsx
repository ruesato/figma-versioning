import { h, Fragment } from 'preact'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { render, Container, VerticalSpace, Text, Textbox, Button, Muted, Link, Bold } from '@create-figma-plugin/ui';
import { emit, on } from '@create-figma-plugin/utilities';
import { useState, useEffect } from 'preact/hooks';

import './output.css';
import { HistogramPanel } from './components/HistogramPanel';
import { PreCommitStatsPanel } from './components/PreCommitStatsPanel';

function OnboardingView({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const [pat, setPat] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit() {
    if (!pat.trim()) {
      setError('Please enter your Personal Access Token');
      return;
    }
    setError('');
    setIsValidating(true);
    emit('VALIDATE_PAT', { pat });
  }

  function handleSkip() {
    onSkip();
  }

  useEffect(() => {
    return on('PAT_VALIDATION_RESULT', function (data: { success: boolean; error?: string }) {
      setIsValidating(false);
      if (data.success) {
        onComplete();
      } else {
        setError(data.error || 'Invalid token. Please try again.');
      }
    });
  }, [onComplete]);

  return (
    <Container space="small">
      <VerticalSpace space="large" />
      <Text>
        <div class="text-2xl font-bold">Welcome to Figma Versioning</div>
      </Text>
      <VerticalSpace space="medium" />

      <Text>
        <Bold>Setup Required</Bold>
      </Text>
      <VerticalSpace space="small" />
      <Muted>
        To enable version tracking with comments and activity data, you'll need a Figma Personal Access Token (PAT).
      </Muted>

      <VerticalSpace space="medium" />
      <Text>
        <Bold>How to get your PAT:</Bold>
      </Text>
      <VerticalSpace space="extraSmall" />
      <Muted>
        1. Go to your{' '}
        <Link href="https://www.figma.com/settings" target="_blank">
          Figma Account Settings
        </Link>
      </Muted>
      <VerticalSpace space="extraSmall" />
      <Muted>2. Scroll to "Personal access tokens"</Muted>
      <VerticalSpace space="extraSmall" />
      <Muted>3. Click "Create a new personal access token"</Muted>
      <VerticalSpace space="extraSmall" />
      <Muted>4. Copy the token and paste it below</Muted>

      <VerticalSpace space="medium" />
      <Textbox
        value={pat}
        onValueInput={setPat}
        placeholder="figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        password
        disabled={isValidating}
      />

      {error && (
        <>
          <VerticalSpace space="small" />
          <Text>
            <div style={{ color: 'var(--color-red)' }}>{error}</div>
          </Text>
        </>
      )}

      <VerticalSpace space="small" />
      <Button onClick={handleSubmit} fullWidth disabled={isValidating}>
        {isValidating ? 'Validating...' : 'Continue'}
      </Button>

      <VerticalSpace space="small" />
      <Button onClick={handleSkip} fullWidth secondary disabled={isValidating}>
        Skip for now
      </Button>

      <VerticalSpace space="small" />
      <Muted>
        Your token is stored securely and only used to fetch comments and activity data from your files.
      </Muted>

      <VerticalSpace space="small" />
      <Muted>
        <Bold>Note:</Bold> Without a token, you can still create versions, but comment and activity tracking will be disabled.
      </Muted>
    </Container>
  );
}

function SettingsView({ onBack }: { onBack: () => void }) {
  const [newPat, setNewPat] = useState('');
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);

  // Check if token exists on mount
  useEffect(() => {
    emit('CHECK_PAT');

    const unsubStatus = on('PAT_STATUS', function (data: { hasToken: boolean }) {
      setHasToken(data.hasToken);
    });

    return unsubStatus;
  }, []);

  function handleSavePat() {
    if (!newPat.trim()) return;

    setIsSaving(true);
    emit('VALIDATE_PAT', { pat: newPat });
  }

  function handleRemovePat() {
    setIsRemoving(true);
    emit('REMOVE_PAT');
  }

  function handleRebuildChangelog() {
    setIsRebuilding(true);
    emit('REBUILD_CHANGELOG');
  }

  useEffect(() => {
    const unsubValidation = on('PAT_VALIDATION_RESULT', function (data: { success: boolean; error?: string }) {
      setIsSaving(false);
      if (data.success) {
        setHasToken(true);
        setNewPat('');
      }
    });

    const unsubRemoval = on('PAT_REMOVED', function () {
      setIsRemoving(false);
      setHasToken(false);
    });

    const unsubRebuild = on('CHANGELOG_REBUILT', function (data: { success: boolean; count?: number; error?: string }) {
      setIsRebuilding(false);
    });

    return () => {
      unsubValidation();
      unsubRemoval();
      unsubRebuild();
    };
  }, []);

  const styles = {
    container: {
      backgroundColor: '#2c2c2c',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px',
      padding: '24px',
      borderRadius: '16px',
      width: '100%',
      height: '100%',
      boxSizing: 'border-box' as const,
      fontFamily: 'Inter, sans-serif'
    },
    heading: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%'
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '24px',
      height: '24px',
      flexShrink: 0,
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      padding: 0,
      transform: 'rotate(90deg)'
    },
    headerText: {
      flex: '1 0 0',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 400,
      fontSize: '12px',
      color: '#bbb',
      textTransform: 'uppercase' as const,
      margin: 0
    },
    section: {
      borderBottom: '1px solid #383838',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px',
      paddingBottom: '32px',
      width: '100%'
    },
    field: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
      width: '100%'
    },
    fieldLabel: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 400,
      fontSize: '16px',
      color: 'white',
      margin: 0
    },
    fieldInput: {
      backgroundColor: '#383838',
      border: '1px solid #2c2c2c',
      borderRadius: '8px',
      padding: '12px 17px',
      height: '48px',
      width: '100%',
      boxSizing: 'border-box' as const,
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px',
      color: 'white',
      outline: 'none'
    },
    savedMessage: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      padding: '12px 17px',
      height: '48px',
      width: '100%',
      boxSizing: 'border-box' as const
    },
    savedText: {
      flex: '1 0 0',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 400,
      fontSize: '16px',
      color: 'white',
      opacity: 0.5,
      margin: 0
    },
    trashButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '24px',
      height: '24px',
      flexShrink: 0,
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      padding: 0
    },
    caption: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 400,
      fontSize: '12px',
      color: '#808080',
      margin: 0
    },
    button: {
      backgroundColor: '#008ff0',
      border: 'none',
      borderRadius: '32px',
      padding: '12px 24px',
      minHeight: '48px',
      width: '100%',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '16px',
      color: 'white',
      cursor: 'pointer',
      textAlign: 'center' as const
    },
    buttonDisabled: {
      backgroundColor: '#383838',
      border: 'none',
      borderRadius: '32px',
      padding: '12px 24px',
      minHeight: '48px',
      width: '100%',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '16px',
      color: 'white',
      cursor: 'not-allowed',
      textAlign: 'center' as const,
      opacity: 0.5
    },
    rebuildSection: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
      width: '100%'
    }
  };

  // SVG Icons
  const CaretLeftIcon = () => (
    <svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L7 7L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 4H14M12.6667 4V13.3333C12.6667 14 12 14.6667 11.3333 14.6667H4.66667C4 14.6667 3.33333 14 3.33333 13.3333V4M5.33333 4V2.66667C5.33333 2 6 1.33333 6.66667 1.33333H9.33333C10 1.33333 10.6667 2 10.6667 2.66667V4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const isButtonDisabled = !newPat.trim() || isSaving;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.heading}>
        <button style={styles.backButton} onClick={onBack} aria-label="Back">
          <CaretLeftIcon />
        </button>
        <p style={styles.headerText}>Settings</p>
      </div>

      {/* Personal Access Token Section */}
      <div style={styles.section}>
        <div style={styles.field}>
          <p style={styles.fieldLabel}>Personal Access Token</p>

          {hasToken ? (
            // Show saved message with delete button
            <div style={styles.savedMessage}>
              <p style={styles.savedText}>Your token has been saved</p>
              <button
                style={styles.trashButton}
                onClick={handleRemovePat}
                disabled={isRemoving}
                aria-label="Remove token"
              >
                <TrashIcon />
              </button>
            </div>
          ) : (
            // Show input field with save button
            <>
              <input
                type="password"
                value={newPat}
                onInput={(e) => setNewPat((e.target as HTMLInputElement).value)}
                placeholder="Enter your personal access token"
                disabled={isSaving}
                style={{
                  ...styles.fieldInput,
                  opacity: newPat ? 1 : 0.5
                }}
              />
              <p style={styles.caption}>
                Your token is stored securely and used to fetch comments and activity data.
              </p>
            </>
          )}
        </div>

        {!hasToken && (
          <button
            style={isButtonDisabled ? styles.buttonDisabled : styles.button}
            onClick={handleSavePat}
            disabled={isButtonDisabled}
          >
            {isSaving ? 'Saving...' : 'Save Token'}
          </button>
        )}
      </div>

      {/* Rebuild Changelog Section */}
      <div style={styles.rebuildSection}>
        <p style={styles.fieldLabel}>Rebuild Changelog</p>
        <p style={styles.caption}>
          Rebuild all changelog entries on the canvas from stored data. Use this if entries were accidentally deleted.
        </p>
        <button
          style={styles.button}
          onClick={handleRebuildChangelog}
          disabled={isRebuilding}
        >
          {isRebuilding ? 'Rebuilding...' : 'Rebuild Changelog'}
        </button>
      </div>
    </div>
  );
}

// Gear icon for settings button
function GearIcon() {
  return <span style={{ fontSize: '16px', lineHeight: '1' }}>⚙️</span>;
}

// Caret icon for dropdown
function CaretIcon() {
  return (
    <svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Version type options
const VERSION_TYPE_OPTIONS = [
  { value: 'major', label: 'Major - Breaking changes (X.0.0)' },
  { value: 'minor', label: 'Minor - New features (0.X.0)' },
  { value: 'patch', label: 'Patch - Bug fixes (0.0.X)' }
] as const;

function MainView({ onOpenSettings, hasToken }: { onOpenSettings: () => void; hasToken: boolean }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [versioningMode] = useState<'semantic' | 'date-based'>('semantic');
  const [incrementType, setIncrementType] = useState<'major' | 'minor' | 'patch'>('patch');
  const [nextVersion, setNextVersion] = useState<string>('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const MAX_TITLE_LENGTH = 100;
  const MAX_DESCRIPTION_LENGTH = 500;
  const remainingDescChars = MAX_DESCRIPTION_LENGTH - description.length;

  // Load saved versioning mode on mount
  useEffect(() => {
    emit('GET_VERSIONING_MODE');

    const unsubscribe = on('VERSIONING_MODE', function (data: { mode: 'semantic' | 'date-based' }) {
      // Keep semantic mode as default for the new UI
    });

    return unsubscribe;
  }, []);

  // Update next version when increment type changes
  useEffect(() => {
    emit('GET_NEXT_VERSION', { increment: incrementType, mode: 'semantic' });
  }, [incrementType]);

  // Listen for next version updates
  useEffect(() => {
    const unsubscribe = on('NEXT_VERSION', function (data: { version: string }) {
      setNextVersion(data.version);
    });

    return unsubscribe;
  }, []);

  // Listen for version creation result
  useEffect(() => {
    const unsubscribe = on('VERSION_CREATED', function (data: { success: boolean; version?: string; error?: string }) {
      setIsCreating(false);
      if (!data.success) {
        setError(data.error || 'Failed to create version');
      }
    });

    return unsubscribe;
  }, []);

  function handleCreateVersion() {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (title.length > MAX_TITLE_LENGTH) {
      setError(`Title must be ${MAX_TITLE_LENGTH} characters or less`);
      return;
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setError(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
      return;
    }

    setError('');
    setIsCreating(true);

    emit('CREATE_VERSION', {
      title,
      description: description.trim() || undefined,
      versioningMode,
      incrementType
    });
  }

  function handleTitleChange(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    setTitle(value);
    if (error) setError('');
  }

  function handleDescriptionChange(e: Event) {
    const value = (e.target as HTMLTextAreaElement).value;
    setDescription(value);
    if (error) setError('');
  }

  function handleSelectVersionType(type: 'major' | 'minor' | 'patch') {
    setIncrementType(type);
    setIsDropdownOpen(false);
  }

  const selectedOption = VERSION_TYPE_OPTIONS.find(opt => opt.value === incrementType);
  const buttonText = isCreating ? 'Creating...' : `Create version ${nextVersion || '1.0.0'}`;
  const isButtonDisabled = isCreating || !title.trim();

  // Styles matching Figma design
  const styles = {
    container: {
      backgroundColor: '#2c2c2c',
      display: 'flex',
      flexDirection: 'column' as const,
			width: '100%',
      height: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box' as const,
      fontFamily: 'Inter, sans-serif',
      overflow: 'hidden' as const
    },
    scrollableContent: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px',
      padding: '24px 24px 64px 24px',
      flex: '1 1 auto',
      minHeight: 0,
      overflowY: 'auto' as const,
      overflowX: 'hidden' as const,
      width: '100%',
      boxSizing: 'border-box' as const
    },
    actionBar: {
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
      padding: '16px 24px',
      backgroundColor: '#2c2c2c',
      borderTop: '1px solid #383838',
      flexShrink: 0,
      width: '100%',
      boxSizing: 'border-box' as const
    },
    sectionHeader: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 400,
      fontSize: '12px',
      color: '#bbb',
      textTransform: 'uppercase' as const,
      margin: 0
    },
    fieldLabel: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 400,
      fontSize: '16px',
      color: 'white',
      margin: 0
    },
    fieldInput: {
      backgroundColor: '#383838',
      border: '1px solid #2c2c2c',
      borderRadius: '8px',
      padding: '12px 17px',
      height: '48px',
      width: '100%',
      boxSizing: 'border-box' as const,
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px',
      color: 'white',
      outline: 'none'
    },
    fieldCaption: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 400,
      fontSize: '12px',
      color: '#808080',
      textAlign: 'right' as const,
      margin: 0
    },
    textarea: {
      backgroundColor: '#383838',
      border: '1px solid #2c2c2c',
      borderRadius: '8px',
      padding: '12px 17px',
      width: '100%',
      boxSizing: 'border-box' as const,
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px',
      color: 'white',
      resize: 'none' as const,
      outline: 'none',
      minHeight: '140px'
    },
    dropdown: {
      backgroundColor: '#383838',
      border: '1px solid #2c2c2c',
      borderRadius: '8px',
      padding: '12px 17px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      position: 'relative' as const
    },
    dropdownText: {
      flex: '1 0 0',
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px',
      color: 'white',
      margin: 0
    },
    dropdownMenu: {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: '#383838',
      border: '1px solid #2c2c2c',
      borderRadius: '8px',
      marginTop: '4px',
      zIndex: 100,
      overflow: 'hidden'
    },
    dropdownItem: {
      padding: '12px 17px',
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px',
      color: 'white',
      cursor: 'pointer',
      backgroundColor: 'transparent'
    },
    primaryButton: {
      backgroundColor: '#008ff0',
      border: 'none',
      borderRadius: '32px',
      padding: '12px 24px',
      minHeight: '48px',
      flex: '1 0 0',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '16px',
      color: 'white',
      cursor: 'pointer',
      textAlign: 'center' as const
    },
    primaryButtonDisabled: {
      backgroundColor: '#383838',
      border: 'none',
      borderRadius: '32px',
      padding: '12px 24px',
      minHeight: '48px',
      flex: '1 0 0',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '16px',
      color: 'white',
      cursor: 'not-allowed',
      textAlign: 'center' as const,
      opacity: 0.5
    },
    settingsButton: {
      backgroundColor: '#383838',
      border: 'none',
      borderRadius: '32px',
      padding: '12px 24px',
      minHeight: '48px',
      width: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: 'white'
    },
    errorText: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '12px',
      color: '#ff4444',
      margin: 0
    }
  };

  return (
    <div style={styles.container}>
      {/* Scrollable Content Area */}
      <div style={styles.scrollableContent}>
        {/* Recent Activity Section */}
        <HistogramPanel />

        {/* Pre-Commit Stats Panel */}
        <PreCommitStatsPanel />

        {/* Create Commit Section */}
        <p style={styles.sectionHeader}>Create a commit</p>

        {/* Title Field */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={styles.fieldLabel}>Title</p>
          <input
            type="text"
            value={title}
            onInput={handleTitleChange}
            placeholder="Enter a title"
            disabled={isCreating}
            style={{
              ...styles.fieldInput,
              opacity: title ? 1 : 0.5
            }}
          />
          <p style={styles.fieldCaption}>{title.length}/{MAX_TITLE_LENGTH}</p>
        </div>

        {/* Description Field */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '220px' }}>
          <p style={styles.fieldLabel}>Description</p>
          <textarea
            value={description}
            onInput={handleDescriptionChange}
            placeholder="Describe what changed"
            disabled={isCreating}
            style={{
              ...styles.textarea,
              flex: '1 0 0',
              opacity: description ? 1 : 0.5
            }}
          />
          <p style={styles.fieldCaption}>Optional. {remainingDescChars} characters remaining.</p>
        </div>

        {/* Version Type Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={styles.fieldLabel}>Version type</p>
          <div
            style={styles.dropdown}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <p style={styles.dropdownText}>{selectedOption?.label}</p>
            <div style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}>
              <CaretIcon />
            </div>
            {isDropdownOpen && (
              <div style={styles.dropdownMenu}>
                {VERSION_TYPE_OPTIONS.map((option) => (
                  <div
                    key={option.value}
                    style={{
                      ...styles.dropdownItem,
                      backgroundColor: option.value === incrementType ? '#4a4a4a' : 'transparent'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectVersionType(option.value);
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = '#4a4a4a';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = option.value === incrementType ? '#4a4a4a' : 'transparent';
                    }}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && <p style={styles.errorText}>{error}</p>}

        {/* Limited mode warning */}
        {!hasToken && (
          <p style={{ ...styles.fieldCaption, textAlign: 'left' as const }}>
            Add a Personal Access Token in settings for full activity tracking.
          </p>
        )}
      </div>

      {/* Fixed Action Bar at Bottom */}
      <div style={styles.actionBar}>
        <button
          style={isButtonDisabled ? styles.primaryButtonDisabled : styles.primaryButton}
          onClick={handleCreateVersion}
          disabled={isButtonDisabled}
        >
          {buttonText}
        </button>
        <button
          style={styles.settingsButton}
          onClick={onOpenSettings}
          title="Settings"
        >
          <GearIcon />
        </button>
      </div>
    </div>
  );
}

function Plugin() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    emit('CHECK_PAT');

    const unsubStatus = on('PAT_STATUS', function (data: { hasToken: boolean }) {
      setHasToken(data.hasToken);
      // If token exists, don't show onboarding
      if (data.hasToken) {
        setShowOnboarding(false);
      }
    });

    const unsubRemoved = on('PAT_REMOVED', function () {
      setHasToken(false);
      setShowSettings(false);
      // Show onboarding again when token is removed
      setShowOnboarding(true);
    });

    return () => {
      unsubStatus();
      unsubRemoved();
    };
  }, []);

  function handleOnboardingComplete() {
    setHasToken(true);
    setShowOnboarding(false);
  }

  function handleOnboardingSkip() {
    setShowOnboarding(false);
  }

  function handleOpenSettings() {
    setShowSettings(true);
  }

  function handleCloseSettings() {
    setShowSettings(false);
  }

  // Show loading state while checking for token
  if (hasToken === null) {
    return (
      <Container space="medium">
        <VerticalSpace space="large" />
        <Text>Loading...</Text>
      </Container>
    );
  }

  // Show onboarding if no token and user hasn't skipped
  if (!hasToken && showOnboarding) {
    return <OnboardingView onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} />;
  }

  // Show settings or main view
  return showSettings ? (
    <SettingsView onBack={handleCloseSettings} />
  ) : (
    <MainView onOpenSettings={handleOpenSettings} hasToken={hasToken} />
  );
}

export default render(Plugin);
