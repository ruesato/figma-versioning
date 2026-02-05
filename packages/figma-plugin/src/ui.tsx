import { h, Fragment } from 'preact'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { render, Container, VerticalSpace, Text, Textbox, Button, Muted, Link, Bold } from '@create-figma-plugin/ui';
import { emit, on } from '@create-figma-plugin/utilities';
import { useState, useEffect } from 'preact/hooks';

import './output.css';
import { HistogramPanel } from './components/HistogramPanel';

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
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  function handleUpdatePat() {
    if (!newPat.trim()) {
      setMessage('Please enter a new Personal Access Token');
      setMessageType('error');
      return;
    }
    setMessage('');
    setIsUpdating(true);
    emit('VALIDATE_PAT', { pat: newPat });
  }

  function handleRemovePat() {
    setIsRemoving(true);
    emit('REMOVE_PAT');
  }

  useEffect(() => {
    const unsubValidation = on('PAT_VALIDATION_RESULT', function (data: { success: boolean; error?: string }) {
      setIsUpdating(false);
      if (data.success) {
        setMessage('Token updated successfully');
        setMessageType('success');
        setNewPat('');
      } else {
        setMessage(data.error || 'Invalid token. Please try again.');
        setMessageType('error');
      }
    });

    const unsubRemoval = on('PAT_REMOVED', function () {
      setIsRemoving(false);
      setMessage('Token removed successfully');
      setMessageType('success');
    });

    return () => {
      unsubValidation();
      unsubRemoval();
    };
  }, []);

  return (
    <Container space="small">
      <VerticalSpace space="large" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text>
          <div class="text-2xl font-bold">Settings</div>
        </Text>
        <Button onClick={onBack} secondary>
          Back
        </Button>
      </div>
      <VerticalSpace space="medium" />

      <Text>
        <Bold>Personal Access Token</Bold>
      </Text>
      <VerticalSpace space="small" />
      <Muted>Your token is stored securely and used to fetch comments and activity data.</Muted>

      <VerticalSpace space="medium" />
      <Text>
        <Bold>Update Token</Bold>
      </Text>
      <VerticalSpace space="small" />
      <Textbox
        value={newPat}
        onValueInput={setNewPat}
        placeholder="Enter new token"
        password
        disabled={isUpdating || isRemoving}
      />
      <VerticalSpace space="small" />
      <Button onClick={handleUpdatePat} fullWidth disabled={isUpdating || isRemoving}>
        {isUpdating ? 'Updating...' : 'Update Token'}
      </Button>

      <VerticalSpace space="medium" />
      <Text>
        <Bold>Remove Token</Bold>
      </Text>
      <VerticalSpace space="small" />
      <Muted>
        Removing your token will disable comment and activity tracking. You'll need to re-enter it to use these features.
      </Muted>
      <VerticalSpace space="small" />
      <Button onClick={handleRemovePat} fullWidth secondary danger disabled={isUpdating || isRemoving}>
        {isRemoving ? 'Removing...' : 'Remove Token'}
      </Button>

      {message && (
        <>
          <VerticalSpace space="medium" />
          <Text>
            <div style={{ color: messageType === 'error' ? 'var(--color-red)' : 'var(--color-green)' }}>
              {message}
            </div>
          </Text>
        </>
      )}
    </Container>
  );
}

// Gear icon SVG for settings button
function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6.5 1L6.2 2.4C5.8 2.5 5.4 2.7 5.1 2.9L3.8 2.3L2.3 4.9L3.4 5.7C3.3 6.1 3.3 6.5 3.3 6.9C3.3 7.3 3.3 7.7 3.4 8.1L2.3 8.9L3.8 11.5L5.1 10.9C5.4 11.1 5.8 11.3 6.2 11.4L6.5 12.8H9.5L9.8 11.4C10.2 11.3 10.6 11.1 10.9 10.9L12.2 11.5L13.7 8.9L12.6 8.1C12.7 7.7 12.7 7.3 12.7 6.9C12.7 6.5 12.7 6.1 12.6 5.7L13.7 4.9L12.2 2.3L10.9 2.9C10.6 2.7 10.2 2.5 9.8 2.4L9.5 1H6.5ZM8 5C9.1 5 10 5.9 10 7C10 8.1 9.1 9 8 9C6.9 9 6 8.1 6 7C6 5.9 6.9 5 8 5Z"
        fill="currentColor"
      />
    </svg>
  );
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

  // Styles matching Figma design
  const styles = {
    container: {
      backgroundColor: '#2c2c2c',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px',
      padding: '24px',
      borderRadius: '16px',
      width: '100%',
      boxSizing: 'border-box' as const,
      fontFamily: 'Inter, sans-serif'
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
      {/* Recent Activity Section */}
      <HistogramPanel />

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

      {/* Actions */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px 0' }}>
        <button
          style={{
            ...styles.primaryButton,
            opacity: isCreating ? 0.7 : 1,
            cursor: isCreating ? 'not-allowed' : 'pointer'
          }}
          onClick={handleCreateVersion}
          disabled={isCreating}
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

      {/* Hidden: Limited mode warning shown as subtle hint if no token */}
      {!hasToken && (
        <p style={{ ...styles.fieldCaption, textAlign: 'left' as const }}>
          Add a Personal Access Token in settings for full activity tracking.
        </p>
      )}
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
