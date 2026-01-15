import { h, Fragment } from 'preact';
import { render, Container, VerticalSpace, Text, Textbox, Button, Muted, Link, Bold } from '@create-figma-plugin/ui';
import { emit, on } from '@create-figma-plugin/utilities';
import { useState, useEffect } from 'preact/hooks';

import './output.css';

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
    <Container space="medium">
      <VerticalSpace space="large" />
      <Text>
        <div class="text-2xl font-bold">Welcome to Figma Versioning</div>
      </Text>
      <VerticalSpace space="large" />

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

      <VerticalSpace space="medium" />
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
    <Container space="medium">
      <VerticalSpace space="large" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text>
          <div class="text-2xl font-bold">Settings</div>
        </Text>
        <Button onClick={onBack} secondary>
          Back
        </Button>
      </div>
      <VerticalSpace space="large" />

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

      <VerticalSpace space="large" />
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

function MainView({ onOpenSettings, hasToken }: { onOpenSettings: () => void; hasToken: boolean }) {
  const [description, setDescription] = useState('');

  function handleCreateVersion() {
    if (description.trim()) {
      emit('CREATE_VERSION', { description });
    }
  }

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text>
          <div class="text-2xl font-bold">Figma Versioning</div>
        </Text>
        <Button onClick={onOpenSettings} secondary>
          Settings
        </Button>
      </div>
      <VerticalSpace space="large" />

      {!hasToken && (
        <>
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--color-bg-warning)',
              borderRadius: '4px'
            }}
          >
            <Text>
              <Bold>Limited Mode</Bold>
            </Text>
            <VerticalSpace space="extraSmall" />
            <Muted>
              Add a Personal Access Token in settings to enable comment and activity tracking.
            </Muted>
          </div>
          <VerticalSpace space="medium" />
        </>
      )}

      <Text>Create a new version of your design</Text>
      <VerticalSpace space="small" />
      <Textbox
        value={description}
        onValueInput={setDescription}
        placeholder="Version description"
      />
      <VerticalSpace space="small" />
      <Button onClick={handleCreateVersion} fullWidth>
        Create Version
      </Button>
    </Container>
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
